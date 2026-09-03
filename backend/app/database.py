import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

# Configure SQLAlchemy engine for PostgreSQL
db_url = settings.DATABASE_URL

# Handle special connection arguments (e.g., SQLite if used for fallback/testing)
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        connect_args=connect_args
    )
except Exception as e:
    logger.error(f"Failed to initialize database engine with URL {db_url}: {e}")
    # Fallback to local SQLite if PostgreSQL is unavailable during development
    logger.warning("Falling back to local SQLite database: krishimandi_dev.db")
    engine = create_engine("sqlite:///./krishimandi_dev.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a transactional database session per request.
    Closes the session after request processing finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Creates all database tables based on SQLAlchemy models.
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified and initialized successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
