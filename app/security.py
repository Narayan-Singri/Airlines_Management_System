"""
Security, Cryptography, and Authentication utilities.
Implements bcrypt password hashing, JWT token generation/validation, and RBAC FastAPI dependencies.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

security_bearer = HTTPBearer(auto_error=True)


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with salt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """Generates a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"iat": now, "exp": expire})
    token = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
) -> Dict[str, Any]:
    """Dependency that extracts and validates the authenticated user from the Bearer token."""
    token = credentials.credentials
    payload = decode_access_token(token)
    return payload


def require_customer(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Dependency requiring the caller to be an authenticated customer."""
    if current_user.get("role") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Customer account required.",
        )
    return current_user


def require_staff(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Dependency requiring the caller to be an authenticated staff member."""
    if current_user.get("role") != "staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Staff account required.",
        )
    return current_user


def require_roles(allowed_emp_types: List[str]):
    """Factory dependency requiring staff to possess one of the specified employee types."""
    def role_checker(staff_user: Dict[str, Any] = Depends(require_staff)) -> Dict[str, Any]:
        emp_type = staff_user.get("emp_type")
        if emp_type not in allowed_emp_types:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Requires one of roles {allowed_emp_types}. Current role: {emp_type}",
            )
        return staff_user

    return role_checker
