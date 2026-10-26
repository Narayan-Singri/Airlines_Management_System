"""
Authentication Router.
Exposes endpoints for customer registration, customer login, and staff login.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, status

from app.schemas.auth import (
    CustomerRegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service
from app.security import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account",
)
def register_customer(payload: CustomerRegisterRequest):
    """Creates a new passenger profile with bcrypt hashed password."""
    return auth_service.register_customer(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Customer JWT login",
)
def login_customer(payload: LoginRequest):
    """Authenticates a customer and returns a JWT Bearer token with role 'customer'."""
    return auth_service.authenticate_customer(payload)


@router.post(
    "/staff/login",
    response_model=TokenResponse,
    summary="Staff & Admin JWT login",
)
def login_staff(payload: LoginRequest):
    """Authenticates an airline employee (Pilot, Cabin, Ground, Admin) and returns a JWT Bearer token."""
    return auth_service.authenticate_staff(payload)


@router.get(
    "/me",
    summary="Inspect current user token payload",
)
def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the decoded JWT payload of the currently authenticated caller."""
    return current_user
