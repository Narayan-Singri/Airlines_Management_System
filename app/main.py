"""
Main FastAPI Application Entrypoint.
Configures lifespan, CORS, error handlers, health endpoint, and API routers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db_pool, close_db_pool, check_db_health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application lifespan events: connection pool startup and shutdown."""
    init_db_pool()
    yield
    close_db_pool()


app = FastAPI(
    title="Airline Management System API",
    description="Backend REST API for Airline Management System built with FastAPI and PostgreSQL.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["System"])
def root():
    """Root welcoming endpoint with links to documentation."""
    return {
        "project": "Airline Management System",
        "status": "online",
        "documentation": "/docs",
        "health_check": "/health",
    }


@app.get("/health", tags=["System"])
def health_check():
    """
    Health check endpoint verifying application and PostgreSQL database connectivity.
    Returns HTTP 200 when healthy or HTTP 503 when the database is unreachable.
    """
    db_status = check_db_health()
    if db_status.get("status") == "healthy":
        return {
            "status": "healthy",
            "database": db_status,
        }
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "unhealthy",
            "database": db_status,
        },
    )
