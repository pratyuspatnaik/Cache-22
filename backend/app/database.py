import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

logger = logging.getLogger(__name__)

# Configure SQLAlchemy engine for PostgreSQL / Serverless
db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Handle special connection arguments
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    if db_url.startswith("sqlite"):
        engine = create_engine(db_url, connect_args=connect_args)
    else:
        # NullPool is the recommended pattern for Vercel Serverless + Supabase PgBouncer (Port 6543)
        # It lets Supabase manage pooling and prevents connection exhaustion across lambda instances
        engine = create_engine(
            db_url,
            poolclass=NullPool,
            pool_pre_ping=True,
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


from sqlalchemy import text


def init_db():
    """
    Creates all database tables based on SQLAlchemy models and ensures required columns exist.
    """
    try:
        Base.metadata.create_all(bind=engine)
        # Ensure full_name column exists if database table was created previously
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) DEFAULT 'Farmer User';"))
            except Exception as col_err:
                logger.debug(f"Column check/migration notice: {col_err}")
        logger.info("Database tables verified and initialized successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
