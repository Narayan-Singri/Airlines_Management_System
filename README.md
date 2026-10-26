# Airlines Management System

A robust PostgreSQL and FastAPI-based backend for an Airline Management System DBMS project.

## Overview
This system provides transactional, relational flight management, booking operations with concurrency safety, check-in, baggage tracking, boarding pass generation, pre-flight condition reporting, and role-based access control (Admin, Customer, Ground Staff, Pilot/Flight Operations).

## Architecture & Tech Stack
- **Database**: PostgreSQL (psycopg 3 with raw parameterized SQL and connection pooling)
- **Backend API**: Python 3.11+ / FastAPI
- **Security**: JWT Authentication, bcrypt password hashing, role-based authorization
- **Documentation**: Swagger UI (`/docs`), ReDoc (`/redoc`)
