"""
Authentication and Authorization business logic.
Handles user registration, authentication verification, and JWT issuance.
"""

from typing import Any, Dict
from fastapi import HTTPException, status
import psycopg.errors

from app.database import fetch_one, execute_commit
from app.schemas.auth import CustomerRegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.security import hash_password, verify_password, create_access_token


def register_customer(payload: CustomerRegisterRequest) -> UserResponse:
    """Registers a new customer passenger."""
    # Check if email is already taken
    existing = fetch_one("SELECT passenger_id FROM passenger WHERE email = %s;", (payload.email,))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{payload.email}' is already registered.",
        )

    # Check passport if provided
    if payload.passport_no:
        existing_passport = fetch_one(
            "SELECT passenger_id FROM passenger WHERE passport_no = %s;", (payload.passport_no,)
        )
        if existing_passport:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Passport number '{payload.passport_no}' is already in use.",
            )

    pwd_hash = hash_password(payload.password)

    query = """
    INSERT INTO passenger(full_name, email, password_hash, phone, passport_no, date_of_birth, nationality)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    RETURNING passenger_id, full_name, email;
    """
    params = (
        payload.full_name,
        payload.email,
        pwd_hash,
        payload.phone,
        payload.passport_no,
        payload.date_of_birth,
        payload.nationality,
    )
    try:
        created = execute_commit(query, params)
    except psycopg.errors.UniqueViolation as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists.")

    return UserResponse(
        user_id=created["passenger_id"],
        full_name=created["full_name"],
        email=created["email"],
        role="customer",
    )


def authenticate_customer(payload: LoginRequest) -> TokenResponse:
    """Authenticates a customer and returns a signed JWT."""
    user = fetch_one(
        "SELECT passenger_id, full_name, email, password_hash FROM passenger WHERE email = %s;",
        (payload.email,),
    )
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid customer email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {
        "sub": user["email"],
        "user_id": user["passenger_id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": "customer",
    }
    token = create_access_token(token_data)
    return TokenResponse(
        access_token=token,
        role="customer",
        user_id=user["passenger_id"],
        full_name=user["full_name"],
        email=user["email"],
    )


def authenticate_staff(payload: LoginRequest) -> TokenResponse:
    """Authenticates an airline staff member (Pilot, Crew, Ground, Admin) and returns a signed JWT."""
    staff = fetch_one(
        "SELECT employee_id, full_name, email, password_hash, emp_type FROM employee WHERE email = %s;",
        (payload.email,),
    )
    if not staff or not verify_password(payload.password, staff["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid staff email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {
        "sub": staff["email"],
        "user_id": staff["employee_id"],
        "full_name": staff["full_name"],
        "email": staff["email"],
        "role": "staff",
        "emp_type": staff["emp_type"],
    }
    token = create_access_token(token_data)
    return TokenResponse(
        access_token=token,
        role="staff",
        emp_type=staff["emp_type"],
        user_id=staff["employee_id"],
        full_name=staff["full_name"],
        email=staff["email"],
    )
