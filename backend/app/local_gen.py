import requests
import json
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)

# Try to load a .env located next to this module first (useful when app is started
# from a parent directory). Fallback to default search if not present.
_here = Path(__file__).parent
_env_path = _here / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path, override=True)
else:
    load_dotenv(override=True)

URL = "https://openrouter.ai/api/v1/chat/completions"


def _find_openrouter_key() -> str | None:
    """Look for common OpenRouter API key env names and return the first found."""
    names = [
        "OPENROUTER_API",
        "OPENROUTER_API_KEY",
        "OPENROUTER_KEY",
        "OPENROUTER_TOKEN",
    ]
    for name in names:
        val = os.getenv(name)
        if val:
            logging.info(f"OpenRouter API key found in env var: {name}")
            return val
    logging.info(f"No OpenRouter key found. Looked in: {', '.join(names)}; .env path: {_env_path}")
    return None


def get_local_answer(query: str, api_key: str | None = None) -> str:
    """Send query to OpenRouter. Optional `api_key` can be provided for testing.

    Returns a friendly error string if configuration is missing.
    """
    key = api_key or _find_openrouter_key()
    if not key:
        return (
            "[OpenRouter not configured] — no API key found."
            " Ensure a .env with OPENROUTER_API (or OPENROUTER_API_KEY) is present"
            f" (checked {_env_path})."
        )

    prompt = f"""
You are a medical assistant.

Answer clearly in structured format:

Condition:
Explanation:
Medicines:
Home Remedies:
Advice:

Question: {query}
"""

    payload = {
        "model": "openai/gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": "Medical assistant"},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }

    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    try:
        response = requests.post(URL, headers=headers, data=json.dumps(payload), timeout=20)
        response.raise_for_status()
        data = response.json()
        # defensive access in case API shape differs
        return (
            data.get("choices", [{}])[0].get("message", {}).get("content")
            or json.dumps(data)
        )

    except Exception as e:
        logging.exception("OpenRouter request failed")
        return f"[OpenRouter Error]: {str(e)}"