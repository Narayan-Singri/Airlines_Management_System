"""
Database connection pool and helper utilities using psycopg 3 (psycopg_pool).
Manages database lifecycle, connection pooling, transactions, and row-to-dict conversion.
"""

from contextlib import contextmanager
from typing import Any, Dict, List, Optional
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import settings

# Global Connection Pool
pool: Optional[ConnectionPool] = None


def init_db_pool(min_size: Optional[int] = None, max_size: Optional[int] = None) -> ConnectionPool:
    """Initializes the psycopg connection pool."""
    global pool
    if pool is not None and not pool.closed:
        return pool

    pool = ConnectionPool(
        conninfo=settings.conninfo,
        min_size=min_size or settings.db_min_connections,
        max_size=max_size or settings.db_max_connections,
        open=True,
        kwargs={"autocommit": False},
    )
    return pool


def close_db_pool() -> None:
    """Closes the connection pool and all open connections."""
    global pool
    if pool is not None and not pool.closed:
        pool.close()
        pool = None


def get_pool() -> ConnectionPool:
    """Returns the active pool, initializing it if necessary."""
    global pool
    if pool is None or pool.closed:
        pool = init_db_pool()
    return pool


@contextmanager
def get_db_connection():
    """
    Context manager that acquires a connection from the pool, sets search_path to airline,
    and returns it to the pool on exit. Handles rollback on exceptions.
    """
    p = get_pool()
    with p.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SET search_path = airline;")
        try:
            yield conn
        except Exception:
            conn.rollback()
            raise


@contextmanager
def get_db_cursor(commit: bool = False):
    """
    Context manager yielding a dict_row cursor within an active database transaction.
    Commits automatically if commit=True and no exception occurs.
    """
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            try:
                yield cur
                if commit:
                    conn.commit()
            except Exception:
                conn.rollback()
                raise


def fetch_one(query: str, params: Optional[tuple] = None) -> Optional[Dict[str, Any]]:
    """Executes a parameterised SELECT query and returns the first row as a dictionary."""
    with get_db_cursor(commit=False) as cur:
        cur.execute(query, params or ())
        row = cur.fetchone()
        return dict(row) if row else None


def fetch_all(query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
    """Executes a parameterised SELECT query and returns all rows as a list of dictionaries."""
    with get_db_cursor(commit=False) as cur:
        cur.execute(query, params or ())
        rows = cur.fetchall()
        return [dict(row) for row in rows]


def execute_commit(query: str, params: Optional[tuple] = None) -> Any:
    """Executes a parameterised mutation query with commit, returning cur.fetchone() if available."""
    with get_db_cursor(commit=True) as cur:
        cur.execute(query, params or ())
        if cur.description:
            row = cur.fetchone()
            return dict(row) if row else None
        return None


def check_db_health() -> Dict[str, Any]:
    """Checks database connectivity and basic stats."""
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT 1 AS ok, current_database() AS db, version() AS ver;")
            row = cur.fetchone()
            return {
                "status": "healthy",
                "database": row["db"],
                "version": row["ver"],
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }
