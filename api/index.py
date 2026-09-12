import sys
from pathlib import Path

# Add backend directory to sys.path so modules like app.* can be imported cleanly
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import FastAPI application
from main import app
