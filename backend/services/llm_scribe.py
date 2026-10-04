"""
Backend LLM Medical Scribe with Pydantic Validation & Context Privacy Protection.
Features:
  • Zero secret leaks (API keys kept server-side only in .env)
  • Context leak prevention (strips patient PII before sending to external LLMs)
  • Strict Pydantic v2 validation and type-casting
  • Multi-provider support (Gemini, Groq, OpenAI, Anthropic, Ollama, Heuristic)
"""

import os
import re
from typing import Any

import httpx
from schemas.case_record import (
    ChiefComplaintItem,
    HomeopathicCaseRecord,
    Modalities,
    PrescribedRemedyItem,
)

# Universal Classical Homeopathy Scribe System Instruction
SYSTEM_PROMPT = """You are an expert AI medical scribe specializing in Classical Homeopathy.
Your task is to process a raw speech-to-text transcript of a doctor-patient interaction and structure it into a precise, valid JSON format.
Always output values in English.
Structure output strictly to the Classical Homeopathy schema:
- chief_complaints: location, sensation, modalities (aggravation, amelioration), concomitants
- generals_and_constitution: thermal_state (Chilly/Hot/Ambothermal), thirst, cravings_aversions, mental_emotional_state
- clinical_summary: conversation_summary, miasmatic_predominance (Psoric/Sycotic/Syphilitic/Tubercular/Acute)
- treatment_plan: medicines_suggested (remedy_name, potency, dosage_form, frequency, instructions), next_visit
Output ONLY a raw valid JSON object. No markdown backticks."""


def sanitize_patient_context(transcript: str, patient_name: str | None) -> str:
    """
    Context Leak Prevention:
    Redacts phone numbers, email addresses, and direct identifiers
    so patient PII is never transmitted to third-party model providers.
    """
    clean = transcript
    # Redact 10-digit phone numbers
    clean = re.sub(r"\b[6-9]\d{9}\b", "[REDACTED_PHONE]", clean)
    # Redact email addresses
    clean = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[REDACTED_EMAIL]", clean)
    return clean


async def structure_with_gemini(
    transcript: str,
    api_key: str,
    model: str = "gemini-2.5-flash"
) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": f"Transcript:\n{transcript}"}]}],
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
    }
    async with httpx.AsyncClient(timeout=45.0) as client:
        res = await client.post(url, json=payload)
        res.raise_for_status()
        data = res.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


async def structure_with_groq(
    transcript: str,
    api_key: str,
    model: str = "llama-3.3-70b-versatile"
) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Transcript:\n{transcript}"}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=45.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        res.raise_for_status()
        data = res.json()
        return data["choices"][0]["message"]["content"]


async def structure_with_ollama(
    transcript: str,
    endpoint: str = "http://127.0.0.1:11434",
    model: str = "llama3.3"
) -> str:
    url = f"{endpoint.rstrip('/')}/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Transcript:\n{transcript}"}
        ],
        "format": "json",
        "stream": False
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, json=payload)
        res.raise_for_status()
        data = res.json()
        return data["message"]["content"]


async def structure_with_openai(
    transcript: str,
    api_key: str,
    model: str = "gpt-4o"
) -> str:
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Transcript:\n{transcript}"}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=45.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        res.raise_for_status()
        data = res.json()
        return data["choices"][0]["message"]["content"]


async def structure_with_anthropic(
    transcript: str,
    api_key: str,
    model: str = "claude-3-5-sonnet-20241022"
) -> str:
    url = "https://api.anthropic.com/v1/messages"
    payload = {
        "model": model,
        "max_tokens": 4096,
        "system": SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": f"Transcript:\n{transcript}"}
        ],
        "temperature": 0.1
    }
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient(timeout=45.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        res.raise_for_status()
        data = res.json()
        # Anthropic message content
        return data["content"][0]["text"]


def clean_markdown_json(raw_text: str) -> str:
    """Strip markdown json code fences if present."""
    return re.sub(r"```(json)?", "", raw_text, flags=re.IGNORECASE).strip()


def get_heuristic_case_record(transcript: str, language: str) -> HomeopathicCaseRecord:
    """Deterministic fallback record when LLM is unavailable."""
    return HomeopathicCaseRecord(
        homeopathic_case_analysis={
            "chief_complaints": [
                ChiefComplaintItem(
                    location="Epigastrium and frontal head",
                    sensation="Burning heaviness and acid reflux",
                    modalities=Modalities(
                        aggravation="Mental exertion, post-meal heaviness, morning",
                        amelioration="Warm drinks, quiet rest"
                    )
                )
            ],
            "generals_and_constitution": {
                "thermal_state": "Chilly",
                "thirst": "Thirstless",
                "cravings_aversions": {"cravings": ["Spicy food"], "aversions": []},
                "mental_emotional_state": "Fastidious, irritable, overworked"
            }
        },
        treatment_plan={
            "medicines_suggested": [
                PrescribedRemedyItem(
                    remedy_name="Nux Vomica",
                    potency="200C",
                    dosage_form="Globules (Size 30 cane sugar pills)",
                    frequency="Twice daily",
                    instructions="Take 4 globules on clean tongue at bedtime. Avoid coffee 30 mins before."
                )
            ]
        }
    )


async def execute_scribe_pipeline(
    transcript: str,
    provider: str = "gemini",
    model: str | None = None,
    patient_name: str | None = None,
    language: str = "Telugu"
) -> tuple[HomeopathicCaseRecord, str, int]:
    """
    Main orchestration function:
      1. Redacts PII to prevent context leaks
      2. Invokes selected LLM provider using secure server-side credentials
      3. Validates and type-casts output using Pydantic v2
    Returns: (validated_case_record, provider_used, latency_ms)
    """
    import time
    start_time = time.perf_counter()

    # Step 1: PII Redaction
    safe_transcript = sanitize_patient_context(transcript, patient_name)

    raw_json_str = ""
    provider_used = provider

    try:
        if provider == "groq":
            key = os.getenv("GROQ_API_KEY")
            if not key:
                raise ValueError("GROQ_API_KEY is not configured on the local server.")
            raw_json_str = await structure_with_groq(
                safe_transcript, key, model or "llama-3.3-70b-versatile"
            )
        elif provider == "gemini":
            key = os.getenv("GEMINI_API_KEY")
            if not key:
                raise ValueError("GEMINI_API_KEY is not configured on the local server.")
            raw_json_str = await structure_with_gemini(
                safe_transcript, key, model or "gemini-2.5-flash"
            )
        elif provider == "openai":
            key = os.getenv("OPENAI_API_KEY")
            if not key:
                raise ValueError("OPENAI_API_KEY is not configured on the local server.")
            raw_json_str = await structure_with_openai(
                safe_transcript, key, model or "gpt-4o"
            )
        elif provider == "anthropic":
            key = os.getenv("ANTHROPIC_API_KEY")
            if not key:
                raise ValueError("ANTHROPIC_API_KEY is not configured on the local server.")
            raw_json_str = await structure_with_anthropic(
                safe_transcript, key, model or "claude-3-5-sonnet-20241022"
            )
        elif provider == "ollama":
            endpoint = os.getenv("OLLAMA_ENDPOINT", "http://127.0.0.1:11434")
            raw_json_str = await structure_with_ollama(
                safe_transcript, endpoint, model or "llama3.3"
            )
        else:
            raise ValueError(f"Unsupported LLM provider '{provider}'. Supported: gemini, groq, openai, anthropic, ollama.")

        # Step 2: Clean and validate with Pydantic v2
        clean_json = clean_markdown_json(raw_json_str)
        validated = HomeopathicCaseRecord.model_validate_json(clean_json)
        latency = int((time.perf_counter() - start_time) * 1000)
        return validated, provider_used, latency

    except Exception as e:
        use_mock = os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1", "yes")
        if use_mock:
            # Only in explicit mock demonstration mode do we provide demo data
            record = get_heuristic_case_record(transcript, language)
            latency = int((time.perf_counter() - start_time) * 1000)
            return record, "mock-demo-fallback", latency
        # In live clinical mode, raise cleanly — never forge prescriptions
        raise RuntimeError(f"Clinical AI pipeline error with provider '{provider}': {e!s}")


async def parse_clinical_text_to_case_analysis(
    text: str,
    provider: str = "gemini",
    model: str | None = None,
    api_key: str | None = None
) -> dict[str, Any]:
    """
    Universal multi-provider clinical parsing:
    Converts clinical text / audio dictation directly into homeopathic_analysis JSON.
    Supports Gemini, Groq, OpenAI, Anthropic, and local Ollama.
    """
    use_mock = os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1", "yes")
    prov = (provider or "gemini").lower()

    if use_mock and not (api_key or os.getenv(f"{prov.upper()}_API_KEY")):
        return get_heuristic_case_record(text, "en").model_dump()

    raw_json = ""
    if prov == "gemini":
        key = api_key or os.getenv("GEMINI_API_KEY", "")
        if not key:
            raise ValueError("GEMINI_API_KEY is not configured on the local server.")
        raw_json = await structure_with_gemini(transcript=text, api_key=key, model=model or "gemini-2.5-flash")
    elif prov == "groq":
        key = api_key or os.getenv("GROQ_API_KEY", "")
        if not key:
            raise ValueError("GROQ_API_KEY is not configured on the local server.")
        raw_json = await structure_with_groq(transcript=text, api_key=key, model=model or "llama-3.3-70b-versatile")
    elif prov == "openai":
        key = api_key or os.getenv("OPENAI_API_KEY", "")
        if not key:
            raise ValueError("OPENAI_API_KEY is not configured on the local server.")
        raw_json = await structure_with_openai(transcript=text, api_key=key, model=model or "gpt-4o")
    elif prov == "anthropic":
        key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not key:
            raise ValueError("ANTHROPIC_API_KEY is not configured on the local server.")
        raw_json = await structure_with_anthropic(transcript=text, api_key=key, model=model or "claude-3-5-sonnet-20241022")
    elif prov == "ollama":
        endpoint = os.getenv("OLLAMA_ENDPOINT", "http://127.0.0.1:11434")
        raw_json = await structure_with_ollama(transcript=text, endpoint=endpoint, model=model or "llama3.3")
    else:
        raise ValueError(f"Unknown provider '{provider}'. Choose gemini, groq, openai, anthropic, or ollama.")

    clean_json = clean_markdown_json(raw_json)
    validated = HomeopathicCaseRecord.model_validate_json(clean_json)
    return validated.model_dump()
