"""
VoiceStudio Client & STT Service.
Integrates with debpalash/VoiceStudio (port 3900) with dynamic timeouts
and robust fallback if daemon is offline.
"""

from pathlib import Path
from typing import Any

import httpx

VOICESTUDIO_URL = "http://127.0.0.1:3900/v1/audio/transcriptions"


async def transcribe_audio_with_voicestudio(
    file_path: Path,
    language: str | None = None,
    estimated_duration_seconds: int = 60
) -> dict[str, Any]:
    """
    Transcribes audio file using VoiceStudio Whisper server.
    Dynamically scales HTTP timeout based on file size and duration:
    Allows up to 180s for 1-hour consultations instead of a naive 6-second abort.
    """
    file_size_mb = file_path.stat().st_size / (1024 * 1024)
    # Dynamic timeout: 30s minimum, plus 10s per 10MB of audio, up to 300s
    timeout_seconds = max(30.0, min(300.0, 30.0 + (file_size_mb * 2.0)))

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            with open(file_path, "rb") as f:
                files = {"file": (file_path.name, f, "audio/webm")}
                data = {
                    "model": "whisper-1",
                    "response_format": "verbose_json"
                }
                if language and language != "auto":
                    data["language"] = language

                response = await client.post(VOICESTUDIO_URL, files=files, data=data)

                if response.status_code == 200:
                    payload = response.json()
                    return {
                        "text": payload.get("text", ""),
                        "language": payload.get("language", language or "en"),
                        "duration": payload.get("duration", estimated_duration_seconds),
                        "source": "voicestudio-daemon",
                        "status": "success"
                    }
    except Exception as e:
        # VoiceStudio is either not running or encountered a network error.
        # Fail safely and transparently — DO NOT inject synthetic medical prescriptions.
        return {
            "text": "",
            "language": language or "en",
            "duration": 0,
            "source": "voicestudio-daemon",
            "status": "error",
            "error_detail": f"VoiceStudio STT daemon unreachable at {VOICESTUDIO_URL}. Ensure local daemon is running on port 3900. ({e!s})"
        }
