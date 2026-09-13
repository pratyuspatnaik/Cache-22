"""
Standalone test script for Bhashini ASR endpoint (POST /api/voice/transcribe-odia).
Sends a mock or real audio payload to the FastAPI endpoint to test pipeline parsing and error handling.
"""
import io
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app

def test_bhashini_endpoint():
    client = TestClient(app)
    
    # 1. Test with empty / tiny audio
    empty_file = io.BytesIO(b"short")
    res = client.post(
        "/api/voice/transcribe-odia",
        files={"file": ("empty.wav", empty_file, "audio/wav")}
    )
    print("Test empty audio -> Status:", res.status_code, "Response:", res.json())
    assert res.status_code == 200
    assert res.json()["success"] is False
    assert "too short" in res.json()["detail"].lower()

    # 2. Test with sample 16kHz audio header (1KB simulated audio)
    sample_wav = io.BytesIO(b"RIFF" + b"\x00" * 40 + b"data" + b"\x00" * 1000)
    res2 = client.post(
        "/api/voice/transcribe-odia",
        files={"file": ("sample_odia.wav", sample_wav, "audio/wav")}
    )
    print("Test sample audio payload -> Status:", res2.status_code, "Response:", res2.json())
    assert res2.status_code == 200
    data = res2.json()
    # If BHASHINI_API_KEY is not set in .env, it should return graceful notice without throwing 500
    print("[PASS] Bhashini ASR endpoint handles requests gracefully without 500 error.")
    print("Detail message:", data.get("detail"))

if __name__ == "__main__":
    test_bhashini_endpoint()
