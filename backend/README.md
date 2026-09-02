# KrishiMandi Backend API & PostgreSQL Authentication

FastAPI REST API backend with PostgreSQL database integration for KrishiMandi Direct Farmer Marketplace (SIH 2026).

---

## Features

- **PostgreSQL & SQLAlchemy ORM**: Connection pooling, model definitions (`User`, `OTPRecord`), automated table generation.
- **Bcrypt Password Security**: Industrial-grade password hashing via `passlib` & `bcrypt`.
- **JWT (JSON Web Token) Authentication**: Signed Bearer token generation with expiry and protected route dependencies (`/api/auth/me`).
- **Multi-step Onboarding & Profile Completion**: Step 1 (Mobile & Password) + Step 2 (Address & UPI Payout).
- **Dual Login Modes**: Password login and SMS OTP verification login.
- **CORS Configured**: Seamless communication with the frontend across all localhost ports.

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py           # Environment variables & DB settings
│   ├── database.py         # SQLAlchemy engine & get_db session dependency
│   ├── models.py           # SQLAlchemy User and OTP models
│   ├── schemas.py          # Pydantic request/response models
│   ├── security.py         # Password hashing & JWT token generation
│   └── routers/
│       ├── __init__.py
│       └── auth.py         # Register, Login, Profile completion, OTP, and /me endpoints
├── main.py                 # FastAPI application with CORS & lifespan initialization
├── test_db_and_auth.py     # Verification test suite
├── .env                    # Active environment variables
├── .env.example            # Environment template
└── requirements.txt        # Python package dependencies
```

---

## Quick Start Guide

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure PostgreSQL Database
Ensure PostgreSQL is running locally or provide your remote PostgreSQL connection string in `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/krishimandi_db
SECRET_KEY=krishimandi_super_secret_jwt_key_sih2026_change_in_production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

> **Note**: If PostgreSQL is not currently running, the application includes a development fallback that initializes `krishimandi_dev.db` locally so development and frontend testing are never blocked.

### 3. Run the FastAPI Server
From the `backend/` directory:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or from the root directory:
```bash
python backend/main.py
```

### 4. Interactive API Documentation (Swagger UI)
Once running, open your browser to:
- **Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user with mobile, password & language |
| `POST` | `/api/auth/complete-profile` | Complete address & UPI settlement info |
| `POST` | `/api/auth/login` | Authenticate using mobile number & password |
| `POST` | `/api/auth/otp/send` | Request SMS OTP code |
| `POST` | `/api/auth/otp/login` | Authenticate using SMS OTP code |
| `GET` | `/api/auth/me` | Fetch authenticated user profile (Bearer token) |
| `GET` | `/api/health` | Health check endpoint |
