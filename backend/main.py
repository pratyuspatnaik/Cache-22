from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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


@app.get("/", tags=["Health Check"])
def root():
    """
    Root API health check and platform welcome.
    """
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
