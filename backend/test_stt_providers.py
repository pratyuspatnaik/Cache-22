"""
KrishiMandi - STT Provider Abstraction Test Script
File: backend/test_stt_providers.py

Validates all Speech-to-Text providers (Bhashini, Google Cloud, Sarvam AI, Mock)
and tests the FastAPI endpoint POST /api/voice/transcribe.
"""

import io
import os
import sys
import asyncio
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.services.voice_stt import (
    STTProvider,
    BhashiniSTT,
    GoogleCloudSTT,
    SarvamSTT,
    MockSTT,
    get_stt_provider
)
from fastapi.testclient import TestClient
from main import app


def test_provider_classes():
    print("--- 1. Testing STT Provider Classes & Protocol ---")
    
    # Check Protocol conformance
    mock = MockSTT()
    assert isinstance(mock, STTProvider)
    bhashini = BhashiniSTT()
    assert isinstance(bhashini, STTProvider)
    google = GoogleCloudSTT()
    assert isinstance(google, STTProvider)
    sarvam = SarvamSTT()
    assert isinstance(sarvam, STTProvider)

    print("[PASS] All provider classes conform to STTProvider protocol.")


def test_factory_selection():
    print("\n--- 2. Testing Provider Factory Resolution ---")
    p1 = get_stt_provider("bhashini")
    assert isinstance(p1, BhashiniSTT)
    print("Resolved 'bhashini' ->", type(p1).__name__)

    p2 = get_stt_provider("google")
    assert isinstance(p2, GoogleCloudSTT)
    print("Resolved 'google' ->", type(p2).__name__)

    p3 = get_stt_provider("sarvam")
    assert isinstance(p3, SarvamSTT)
    print("Resolved 'sarvam' ->", type(p3).__name__)

    p4 = get_stt_provider("mock")
    assert isinstance(p4, MockSTT)
    print("Resolved 'mock' ->", type(p4).__name__)

    # Test env var resolution
    os.environ["STT_PROVIDER"] = "sarvam"
    p_env = get_stt_provider()
    assert isinstance(p_env, SarvamSTT)
    print("Resolved via STT_PROVIDER='sarvam' ->", type(p_env).__name__)

    os.environ["STT_PROVIDER"] = "bhashini"
    p_env2 = get_stt_provider()
    assert isinstance(p_env2, BhashiniSTT)
    print("Resolved via STT_PROVIDER='bhashini' ->", type(p_env2).__name__)

    print("[PASS] Factory correctly resolves providers from arguments and environment variable.")


def test_mock_transcription():
    print("\n--- 3. Testing Mock STT Transcription ---")
    mock = MockSTT()
    sample_bytes = b"RIFF" + b"\x00" * 40 + b"data" + b"\x00" * 300

    text_odia = asyncio.run(mock.transcribe(sample_bytes, "or-IN"))
    print("Odia output:", text_odia)
    assert "ଆଳୁ" in text_odia

    text_hi = asyncio.run(mock.transcribe(sample_bytes, "hi-IN"))
    print("Hindi output:", text_hi)
    assert "आलू" in text_hi

    print("[PASS] Mock provider produces expected transcripts.")


def test_api_endpoint():
    print("\n--- 4. Testing FastAPI /api/voice/transcribe Endpoint ---")
    client = TestClient(app)

    # A: Test empty audio
    res_empty = client.post(
        "/api/voice/transcribe",
        files={"file": ("empty.wav", io.BytesIO(b"abc"), "audio/wav")},
        data={"language": "or-IN"}
    )
    assert res_empty.status_code == 200
    assert res_empty.json()["success"] is False
    print("Empty audio rejection:", res_empty.json()["detail"])

    # B: Test with Mock provider configured
    os.environ["STT_PROVIDER"] = "mock"
    sample_wav = io.BytesIO(b"RIFF" + b"\x00" * 40 + b"data" + b"\x00" * 500)
    res_mock = client.post(
        "/api/voice/transcribe",
        files={"file": ("sample_odia.wav", sample_wav, "audio/wav")},
        data={"language": "or-IN"}
    )
    assert res_mock.status_code == 200
    data = res_mock.json()
    print("API transcribe response:", data)
    assert data["success"] is True
    assert data["text"] == "ଆଳୁ 50 ଟଙ୍କା କିଲୋ"
    assert data["language"] == "or-IN"

    # C: Test backwards-compatible alias /transcribe-odia
    res_alias = client.post(
        "/api/voice/transcribe-odia",
        files={"file": ("sample_odia.wav", sample_wav, "audio/wav")}
    )
    assert res_alias.status_code == 200
    assert res_alias.json()["success"] is True

    # Restore default STT_PROVIDER
    os.environ["STT_PROVIDER"] = "bhashini"
    print("[PASS] /api/voice/transcribe and alias endpoints behave as expected.")


if __name__ == "__main__":
    test_provider_classes()
    test_factory_selection()
    test_mock_transcription()
    test_api_endpoint()
    print("\n=== ALL STT PROVIDER TESTS PASSED SUCCESSFULLY! ===")
