import os
from pathlib import Path
import pytest


def test_directory_structure():
    root = Path(__file__).resolve().parent.parent
    expected_dirs = [
        root / "app",
        root / "app" / "schemas",
        root / "app" / "routers",
        root / "app" / "services",
        root / "db",
        root / "db" / "queries",
        root / "tests",
        root / "frontend",
    ]
    for d in expected_dirs:
        assert d.is_dir(), f"Expected directory missing: {d}"


def test_frontend_directory_exists():
    root = Path(__file__).resolve().parent.parent
    frontend_dir = root / "frontend"
    assert frontend_dir.is_dir(), "frontend/ directory must exist"


def test_core_files_exist():
    root = Path(__file__).resolve().parent.parent
    required_files = [
        root / "README.md",
        root / "context.md",
        root / "nextgoals.md",
        root / ".env.example",
        root / ".gitignore",
        root / "requirements.txt",
    ]
    for f in required_files:
        assert f.is_file(), f"Required file missing: {f}"


def test_key_imports():
    import fastapi
    import uvicorn
    import psycopg
    import psycopg_pool
    import pydantic
    import pydantic_settings
    import jwt
    import bcrypt
    import httpx

    assert fastapi.__version__ is not None
    assert psycopg.__version__ is not None
