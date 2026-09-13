"""
KrishiMandi - Speech-to-Text (STT) Provider Abstraction Service
Module: backend/app/services/voice_stt.py

Provides vendor-neutral interface for speech-to-text with support for:
1. Bhashini (Government of India ULCA ASR Pipeline)
2. Google Cloud Speech-to-Text (Chirp model, or-IN)
3. Sarvam AI (IndicConformer / Saaras model)
4. MockSTT (Deterministic test/demo provider)

Active provider is configured via `STT_PROVIDER` env variable.
"""

import os
import base64
import logging
from typing import Protocol, Optional, runtime_checkable
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


@runtime_checkable
class STTProvider(Protocol):
    """
    Common protocol interface for all Speech-to-Text providers.
    """
    async def transcribe(self, audio_bytes: bytes, language: str) -> str:
        """
        Transcribe raw audio bytes in the given language code (e.g. 'or-IN', 'hi-IN').
        Returns the recognized text string.
        """
        ...


class BhashiniSTT:
    """
    Government of India Bhashini ULCA ASR Pipeline provider.
    Priority 1 for SIH submission alignment.
    """
    def __init__(
        self,
        user_id: Optional[str] = None,
        api_key: Optional[str] = None,
        pipeline_id: Optional[str] = None,
        endpoint: Optional[str] = None
    ):
        self.user_id = user_id or settings.BHASHINI_USER_ID or os.getenv("BHASHINI_USER_ID", "")
        self.api_key = api_key or settings.BHASHINI_API_KEY or os.getenv("BHASHINI_API_KEY", "")
        self.pipeline_id = pipeline_id or settings.BHASHINI_PIPELINE_ID or "64392f96daac500bd5c33087"
        self.endpoint = endpoint or settings.BHASHINI_ENDPOINT or "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

    async def transcribe(self, audio_bytes: bytes, language: str = "or-IN") -> str:
        if not self.user_id or not self.api_key:
            raise ValueError(
                "Bhashini credentials (BHASHINI_USER_ID, BHASHINI_API_KEY) are not configured in backend/.env"
            )

        if not audio_bytes or len(audio_bytes) < 100:
            raise ValueError("Audio recording is empty or too short.")

        # Map language code to Bhashini standard (e.g. 'or-IN' -> 'or')
        lang_code = language.split("-")[0].lower() if "-" in language else language.lower()

        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "userID": self.user_id,
            "ulcaApiKey": self.api_key
        }

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {
                            "sourceLanguage": lang_code
                        },
                        "serviceId": "ai4bharat/conformer-multilingual-indo-aryan-gpu--gpu",
                        "audioFormat": "wav",
                        "samplingRate": 16000
                    }
                }
            ],
            "inputData": {
                "audio": [
                    {
                        "audioContent": audio_base64
                    }
                ]
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(self.endpoint, json=payload, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Bhashini API error ({resp.status_code}): {resp.text}")
                raise RuntimeError(f"Bhashini API returned error code {resp.status_code}: {resp.text}")

            data = resp.json()
            pipeline_res = data.get("pipelineResponse", [])
            if pipeline_res and "output" in pipeline_res[0]:
                output_list = pipeline_res[0]["output"]
                if output_list and "source" in output_list[0]:
                    transcript = output_list[0]["source"].strip()
                    return transcript

            raise RuntimeError("No transcription output returned by Bhashini pipeline.")


class GoogleCloudSTT:
    """
    Google Cloud Speech-to-Text provider supporting Chirp / or-IN.
    Priority 2 fallback with high Odia recognition accuracy.
    """
    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        self.api_key = api_key or settings.GOOGLE_CLOUD_API_KEY or os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        self.endpoint = endpoint or "https://speech.googleapis.com/v1/speech:recognize"

    async def transcribe(self, audio_bytes: bytes, language: str = "or-IN") -> str:
        if not self.api_key:
            raise ValueError(
                "Google Cloud Speech API Key (GOOGLE_CLOUD_API_KEY or GOOGLE_API_KEY) is not configured in backend/.env"
            )

        if not audio_bytes or len(audio_bytes) < 100:
            raise ValueError("Audio recording is empty or too short.")

        lang_code = language if "-" in language else f"{language}-IN"
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        url = f"{self.endpoint}?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        payload = {
            "config": {
                "languageCode": lang_code,
                "model": "chirp" if lang_code == "or-IN" else "default",
                "enableAutomaticPunctuation": True
            },
            "audio": {
                "content": audio_base64
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Google Cloud STT error ({resp.status_code}): {resp.text}")
                raise RuntimeError(f"Google Cloud Speech returned status {resp.status_code}: {resp.text}")

            data = resp.json()
            results = data.get("results", [])
            if results and "alternatives" in results[0]:
                alts = results[0]["alternatives"]
                if alts and "transcript" in alts[0]:
                    return alts[0]["transcript"].strip()

            raise RuntimeError("No transcription recognized by Google Cloud Speech.")


class SarvamSTT:
    """
    Sarvam AI Speech-to-Text provider (Saarika model, highly optimized for Indian languages).
    Primary STT provider for KrishiMandi.
    """
    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("SARVAM_API_KEY", "") or getattr(settings, "SARVAM_API_KEY", "")
        self.endpoint = endpoint or "https://api.sarvam.ai/speech-to-text"
        self.model = model or os.getenv("SARVAM_MODEL") or getattr(settings, "SARVAM_MODEL", None) or "saaras:v3"

    async def transcribe(self, audio_bytes: bytes, language: str = "or-IN") -> str:
        if not self.api_key:
            raise ValueError(
                "Sarvam AI API key (SARVAM_API_KEY) is not configured in backend/.env"
            )

        if not audio_bytes or len(audio_bytes) < 100:
            raise ValueError("Audio recording is empty or too short.")

        # Map language code to Sarvam AI supported standards (Odia -> 'od-IN')
        clean_lang = language.strip().lower()
        if clean_lang.startswith("or") or clean_lang.startswith("od"):
            lang_code = "od-IN"
        elif clean_lang.startswith("hi"):
            lang_code = "hi-IN"
        elif clean_lang.startswith("en"):
            lang_code = "en-IN"
        elif "-" in language:
            lang_code = language
        else:
            lang_code = f"{language}-IN"

        # Detect WebM vs WAV header
        is_webm = audio_bytes.startswith(b"\x1a\x45\xdf\xa3")
        content_type = "audio/webm" if is_webm else "audio/wav"
        filename = "recording.webm" if is_webm else "recording.wav"

        headers = {
            "api-subscription-key": self.api_key
        }
        files = {
            "file": (filename, audio_bytes, content_type)
        }
        data = {
            "model": self.model,
            "language_code": lang_code
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.endpoint, headers=headers, data=data, files=files)
            if resp.status_code != 200:
                logger.error(f"Sarvam AI error ({resp.status_code}): {resp.text}")
                raise RuntimeError(f"Sarvam AI returned status {resp.status_code}: {resp.text}")

            res_json = resp.json()
            transcript = res_json.get("transcript", "")
            return transcript.strip()


class MockSTT:
    """
    Test and local demo mock STT provider.
    Returns simulated Odia transcriptions without needing external cloud credentials.
    """
    async def transcribe(self, audio_bytes: bytes, language: str = "or-IN") -> str:
        if not audio_bytes or len(audio_bytes) < 50:
            raise ValueError("Audio recording is empty or too short.")

        lang_code = language.lower()
        if "or" in lang_code:
            return "ଆଳୁ 50 ଟଙ୍କା କିଲୋ"
        elif "hi" in lang_code:
            return "आलू 50 रुपये प्रति किलो"
        return "Potato 50 rupees per kg"


def get_stt_provider(provider_name: Optional[str] = None) -> STTProvider:
    """
    Factory function resolving the active STT provider instance based on
    parameter or `settings.STT_PROVIDER` (or `STT_PROVIDER` environment variable).
    Defaults to 'sarvam'.
    """
    name = (provider_name or os.getenv("STT_PROVIDER") or settings.STT_PROVIDER or "sarvam").strip().lower()

    if name == "sarvam":
        return SarvamSTT()
    elif name == "bhashini":
        return BhashiniSTT()
    elif name in ("google", "googlecloud", "google_cloud"):
        return GoogleCloudSTT()
    elif name in ("mock", "test", "demo"):
        return MockSTT()
    else:
        logger.warning(f"Unknown STT_PROVIDER '{name}', defaulting to SarvamSTT.")
        return SarvamSTT()
