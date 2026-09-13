import sys
from pathlib import Path
import logging

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

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
        # Ensure role-specific columns exist if users table was created previously
        with engine.begin() as conn:
            if engine.dialect.name == "sqlite":
                # SQLite dialect: inspect existing columns via PRAGMA table_info
                result = conn.execute(text("PRAGMA table_info(users)"))
                existing_cols = {row[1] for row in result.fetchall()}
                sqlite_columns = [
                    ("full_name", "VARCHAR(100) DEFAULT 'Farmer User'"),
                    ("buyer_type", "VARCHAR(50)"),
                    ("gstin", "VARCHAR(50)"),
                    ("farm_location", "VARCHAR(255)"),
                    ("primary_crops", "VARCHAR(255)"),
                    ("vehicle_details", "VARCHAR(255)"),
                    ("service_area", "VARCHAR(255)"),
                    ("capacity", "VARCHAR(100)")
                ]
                for col_name, col_type in sqlite_columns:
                    if col_name not in existing_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};"))
                        except Exception as e:
                            logger.debug(f"SQLite migration notice ({col_name}): {e}")
            else:
                # PostgreSQL dialect
                columns_to_add = [
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) DEFAULT 'Farmer User';",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS buyer_type VARCHAR(50);",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS farm_location VARCHAR(255);",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_crops VARCHAR(255);",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_details VARCHAR(255);",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS service_area VARCHAR(255);",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity VARCHAR(100);"
                ]
                for col_stmt in columns_to_add:
                    try:
                        conn.execute(text(col_stmt))
                    except Exception as col_err:
                        logger.debug(f"Column migration notice ({col_stmt}): {col_err}")
        logger.info("Database tables and columns verified and initialized successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
