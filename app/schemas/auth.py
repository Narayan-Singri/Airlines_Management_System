"""
Pydantic models for Authentication and User management.
"""

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class CustomerRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6)
    phone: Optional[str] = Field(None, max_length=20)
    passport_no: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = Field(None, max_length=50)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    emp_type: Optional[str] = None
    user_id: int
    full_name: str
    email: str


class UserResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    emp_type: Optional[str] = None
