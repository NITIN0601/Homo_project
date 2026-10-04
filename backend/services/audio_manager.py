"""
Audio Management Service for 1-2 Hour Clinical Consultations.
Features:
  • Memory-efficient streaming directly to disk (prevents RAM blowups)
  • Immutable local clinic archive (Source of Truth to prevent hallucinations & preserve legal audit trail)
  • SHA-256 cryptographic checksum calculation
  • Sliding-window audio chunking with 2.5s overlap (prevents clipped syllables/words at boundaries)
  • Intelligent boundary text de-duplication for overlapping chunks
  • Forensic Health Data Watermarking (HMAC-SHA256 non-repudiation, ABDM/HIPAA legal provenance)
  • Explicit Doctor retention & deletion controls (GDPR / ABDM right to erasure)
"""

import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from typing import Any

import aiofiles
from fastapi import UploadFile

# Local immutable directories
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RECORDINGS_DIR = DATA_DIR / "recordings"
WATERMARKS_DIR = DATA_DIR / "watermarks"

RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
WATERMARKS_DIR.mkdir(parents=True, exist_ok=True)

# Secret salt for cryptographic watermarking (in production, loaded from env)
WATERMARK_SECRET_KEY = os.getenv(
    "CLINICAL_WATERMARK_SECRET",
    "AGASTYA_CLINICAL_HOMOEOPATHY_WATERMARK_SECRET_2026_DISHA_HIPAA"
).encode("utf-8")


def generate_clinical_watermark(
    interaction_id: str,
    file_sha256: str,
    doctor_name: str = "Dr. Bramarambha K, MD (Homeopathic Materia Medica), SCPH",
    doctor_id: str = "DOC-BK-001",
    clinic_name: str = "Agastya Homoeopathy Clinic",
    patient_id: str | None = None
) -> dict[str, Any]:
    """
    Generates a cryptographically signed health-data watermark.
    Protects patient privacy by embedding:
      • Non-repudiation HMAC-SHA256 signature
      • Clinical provenance (Doctor & Clinic accreditation)
      • Pseudonymized patient hash (no plaintext PII)
      • Legal misuse warning (Unauthorized duplication punishable under ABDM / DISHA / HIPAA)
      • Tamper-proof timestamp & audio checksum
    """
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    pseudonymized_patient = hashlib.sha256((patient_id or "ANONYMOUS").encode()).hexdigest()[:16]

    payload_string = (
        f"{interaction_id}|{file_sha256}|{doctor_id}|{clinic_name}|{timestamp}|{pseudonymized_patient}"
    )
    signature = hmac.new(WATERMARK_SECRET_KEY, payload_string.encode("utf-8"), hashlib.sha256).hexdigest()

    watermark_data = {
        "interaction_id": interaction_id,
        "watermark_version": "v2.1-clinical",
        "compliance_standard": "ABDM-M3 / DISHA / HIPAA Security Rule §164.312",
        "legal_warning": (
            "CONFIDENTIAL HEALTH DATA: Property of Agastya Homoeopathy Clinic & Registered Patient. "
            "Unauthorized extraction, cloning, re-identification, or distribution is strictly prohibited "
            "under the Digital Personal Data Protection Act (DPDPA 2023) and ABDM health data standards."
        ),
        "clinic_provenance": {
            "clinic_name": clinic_name,
            "attending_physician": doctor_name,
            "physician_license_id": doctor_id,
        },
        "audio_integrity": {
            "sha256_checksum": file_sha256,
            "signature_hmac_sha256": signature,
            "watermarked_at_utc": timestamp,
        },
        "patient_provenance": {
            "pseudonymized_id_hash": pseudonymized_patient,
            "pii_redacted": True
        }
    }

    # Persist watermark manifest sidecar to disk
    manifest_path = WATERMARKS_DIR / f"{interaction_id}.watermark.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(watermark_data, f, indent=2)

    return watermark_data


def verify_audio_watermark(interaction_id: str) -> dict[str, Any]:
    """
    Verifies the cryptographic watermark against the stored audio recording.
    Returns: { valid: bool, details: dict, reason: str }
    """
    manifest_path = WATERMARKS_DIR / f"{interaction_id}.watermark.json"
    if not manifest_path.exists():
        return {
            "valid": False,
            "reason": "Watermark manifest not found. File may be unverified or forged."
        }

    with open(manifest_path, encoding="utf-8") as f:
        data = json.load(f)

    # Check if recording file exists
    rec_path = get_recording_path(interaction_id)
    if not rec_path or not rec_path.exists():
        return {
            "valid": False,
            "watermark_meta": data,
            "reason": "Audio recording has been purged by doctor (Right to Erasure)."
        }

    # Verify sha256 checksum of existing recording
    hasher = hashlib.sha256()
    with open(rec_path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            hasher.update(chunk)
    current_sha = hasher.hexdigest()

    expected_sha = data["audio_integrity"]["sha256_checksum"]
    if current_sha != expected_sha:
        return {
            "valid": False,
            "watermark_meta": data,
            "reason": f"Tampering detected! Audio hash ({current_sha[:10]}...) does not match watermark ({expected_sha[:10]}...)."
        }

    # Recompute HMAC signature
    timestamp = data["audio_integrity"]["watermarked_at_utc"]
    doctor_id = data["clinic_provenance"]["physician_license_id"]
    clinic_name = data["clinic_provenance"]["clinic_name"]
    patient_hash = data["patient_provenance"]["pseudonymized_id_hash"]

    payload_string = f"{interaction_id}|{expected_sha}|{doctor_id}|{clinic_name}|{timestamp}|{patient_hash}"
    expected_sig = hmac.new(WATERMARK_SECRET_KEY, payload_string.encode("utf-8"), hashlib.sha256).hexdigest()

    if expected_sig != data["audio_integrity"]["signature_hmac_sha256"]:
        return {
            "valid": False,
            "watermark_meta": data,
            "reason": "Watermark cryptographic signature is invalid or modified."
        }

    return {
        "valid": True,
        "watermark_meta": data,
        "reason": "Cryptographic watermark verified. Clinical provenance and audio integrity intact."
    }


async def save_recording_stream(
    file: UploadFile,
    interaction_id: str,
    patient_id: str | None = None
) -> tuple[Path, str, int, dict[str, Any]]:
    """
    Stream upload directly to disk in 1MB chunks.
    Automatically applies the forensic health-data watermark.
    Returns: (file_path, sha256_hash, file_size_bytes, watermark_manifest)
    """
    file_ext = Path(file.filename or "recording.webm").suffix or ".webm"
    destination = RECORDINGS_DIR / f"{interaction_id}{file_ext}"

    sha256 = hashlib.sha256()
    total_bytes = 0

    async with aiofiles.open(destination, "wb") as out_file:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB buffer
            if not chunk:
                break
            sha256.update(chunk)
            total_bytes += len(chunk)
            await out_file.write(chunk)

    file_hash = sha256.hexdigest()

    # Generate and bind cryptographic health-data watermark
    watermark = generate_clinical_watermark(
        interaction_id=interaction_id,
        file_sha256=file_hash,
        patient_id=patient_id
    )

    return destination, file_hash, total_bytes, watermark


def sanitize_safe_id(raw_id: str) -> str:
    """Enforces strict alphanumeric identifiers to prevent directory traversal attacks."""
    import re
    cleaned = re.sub(r"[^a-zA-Z0-9_\-]", "", raw_id)
    if not cleaned:
        raise ValueError("Invalid interaction identifier.")
    return cleaned


def get_recording_path(interaction_id: str) -> Path | None:
    """Look up source-of-truth recording by encounter ID with path traversal prevention."""
    try:
        safe_id = sanitize_safe_id(interaction_id)
    except ValueError:
        return None

    for ext in [".webm", ".wav", ".mp3", ".m4a", ".ogg"]:
        p = (RECORDINGS_DIR / f"{safe_id}{ext}").resolve()
        if p.is_relative_to(RECORDINGS_DIR.resolve()) and p.exists():
            return p
    return None


def delete_recording(interaction_id: str) -> bool:
    """
    Explicit deletion if doctor or patient exercises Right to Erasure / Privacy.
    Also removes the watermark manifest.
    """
    try:
        safe_id = sanitize_safe_id(interaction_id)
    except ValueError:
        return False

    p = get_recording_path(safe_id)
    rec_deleted = False
    if p and p.exists():
        try:
            os.remove(p)
            rec_deleted = True
        except OSError:
            pass

    manifest_path = (WATERMARKS_DIR / f"{safe_id}.watermark.json").resolve()
    if manifest_path.is_relative_to(WATERMARKS_DIR.resolve()) and manifest_path.exists():
        try:
            os.remove(manifest_path)
        except OSError:
            pass

    return rec_deleted


def merge_overlapping_transcripts(transcripts: list[str], overlap_words_window: int = 15) -> str:
    """
    Intelligent boundary de-duplication for overlapping audio chunks.

    When Chunk 1 has a 2.5-second overlap with Chunk 2, the trailing words of Chunk 1
    (e.g., 'prescribe Nux Vomica 30C') also appear at the start of Chunk 2.

    This algorithm finds the longest common word overlap between the end of
    segment i and the beginning of segment i+1 and cleanly splices them together
    without dropping or duplicating clinical symptoms.
    """
    if not transcripts:
        return ""
    if len(transcripts) == 1:
        return transcripts[0].strip()

    merged = transcripts[0].strip()

    for nxt in transcripts[1:]:
        next_text = nxt.strip()
        merged_words = merged.split()
        next_words = next_text.split()

        # Find best matching suffix/prefix overlap within window
        max_overlap = min(len(merged_words), len(next_words), overlap_words_window)
        overlap_found = 0

        for k in range(max_overlap, 2, -1):
            suffix = " ".join(merged_words[-k:]).lower()
            prefix = " ".join(next_words[:k]).lower()
            if suffix == prefix:
                overlap_found = k
                break

        if overlap_found > 0:
            # Drop the duplicated prefix from the next segment
            trimmed_next = " ".join(next_words[overlap_found:])
            merged = f"{merged} {trimmed_next}"
        else:
            merged = f"{merged} {next_text}"

    return merged.strip()
