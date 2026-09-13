import sys
from pathlib import Path
from contextlib import asynccontextmanager
import logging

# Ensure backend directory is in sys.path so 'app.*' imports work from anywhere
BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import init_db
from app.routers import auth

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("krishimandi-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler: initializes PostgreSQL database tables on startup.
    """
    logger.info("Starting up KrishiMandi Backend API...")
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    yield
    logger.info("Shutting down KrishiMandi Backend API...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="KrishiMandi Direct Farmer Marketplace REST API - SIH 2026",
    lifespan=lifespan
)

# Configure Cross-Origin Resource Sharing (CORS) for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits requests from localhost, file://, and remote clients
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)


# Mount static frontend directories if available
FRONTEND_DIR = ROOT_DIR / "frontend"
if FRONTEND_DIR.exists():
    pages_dir = FRONTEND_DIR / "pages"
    style_dir = FRONTEND_DIR / "style"
    script_dir = FRONTEND_DIR / "script"
    if pages_dir.exists():
        app.mount("/pages", StaticFiles(directory=str(pages_dir)), name="pages")
    if style_dir.exists():
        app.mount("/style", StaticFiles(directory=str(style_dir)), name="style")
    if script_dir.exists():
        app.mount("/script", StaticFiles(directory=str(script_dir)), name="script")


@app.get("/", tags=["Frontend"])
@app.get("/index.html", tags=["Frontend"])
def root():
    """
    Serve frontend index.html if present, otherwise API health status.
    """
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "database_connected": True
    }


@app.get("/api/health", tags=["Health Check"])
def health_check():
    """
    Health check endpoint for monitoring uptime and readiness.
    """
    return {
        "status": "healthy",
        "database": "postgresql",
        "timestamp": True
    }


@app.get("/{filename}", tags=["Frontend"])
def serve_root_static_files(filename: str):
    """
    Catch-all route to serve static files (like style.css) from the root of frontend dir.
    """
    file_path = FRONTEND_DIR / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="File not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
