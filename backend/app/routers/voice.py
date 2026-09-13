import logging
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form
from pydantic import BaseModel
from app.services.voice_stt import get_stt_provider
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice Recognition & ASR"])


class TranscribeResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    language: str = "or-IN"
    provider: Optional[str] = None
    detail: Optional[str] = None


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form("or-IN")
):
    """
    Accepts an audio recording blob (WAV/WEBM) and language code,
    and transcribes speech using the configured STT provider
    (Bhashini, Google Cloud Speech, Sarvam AI, or Mock).
    Configured via STT_PROVIDER env variable. API credentials stay strictly server-side.
    """
    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 50:
        return TranscribeResponse(
            success=False,
            text=None,
            language=language or "or-IN",
            provider=settings.STT_PROVIDER,
            detail="Audio recording was too short or empty."
        )

    provider = get_stt_provider()
    target_lang = language or "or-IN"

    try:
        text = await provider.transcribe(audio_bytes, target_lang)
        return TranscribeResponse(
            success=True,
            text=text,
            language=target_lang,
            provider=settings.STT_PROVIDER
        )
    except ValueError as ve:
        logger.info(f"STT provider configuration warning: {ve}")
        return TranscribeResponse(
            success=False,
            text=None,
            language=target_lang,
            provider=settings.STT_PROVIDER,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error during audio transcription via {settings.STT_PROVIDER}: {e}")
        return TranscribeResponse(
            success=False,
            text=None,
            language=target_lang,
            provider=settings.STT_PROVIDER,
            detail=f"ASR transcription service error: {str(e)}"
        )


@router.post("/transcribe-odia", response_model=TranscribeResponse)
async def transcribe_odia_audio_alias(file: UploadFile = File(...)):
    """
    Backwards-compatible alias for /transcribe with language='or-IN'.
    """
    return await transcribe_audio(file=file, language="or-IN")
