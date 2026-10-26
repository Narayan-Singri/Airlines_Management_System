"""
Database seeding script for Airline Management System.
Applies db/schema.sql and updates seed users with real bcrypt password hashes.
"""

import os
from pathlib import Path
import bcrypt
import psycopg
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "airline_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "admin")

CONN_STRING = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def seed_database():
    schema_path = ROOT_DIR / "db" / "schema.sql"
    if not schema_path.is_file():
        raise FileNotFoundError(f"Schema file not found at {schema_path}")

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    print(f"Connecting to database {DB_NAME} on {DB_HOST}:{DB_PORT}...")
    with psycopg.connect(CONN_STRING, autocommit=True) as conn:
        with conn.cursor() as cur:
            print("Applying schema.sql...")
            cur.execute(schema_sql)
            print("Schema applied successfully.")

            # Set search path to airline schema
            cur.execute("SET search_path = airline;")

            # Real bcrypt hashes
            pilot_hash = hash_password("Pilot@123")
            cabin_hash = hash_password("Cabin@123")
            staff_hash = hash_password("Staff@123")
            admin_hash = hash_password("Admin@123")
            cust_hash = hash_password("Customer@123")

            print("Updating employee password hashes...")
            cur.execute(
                "UPDATE employee SET password_hash = %s WHERE email = 'arjun@air.test'",
                (pilot_hash,),
            )
            cur.execute(
                "UPDATE employee SET password_hash = %s WHERE email = 'meera@air.test'",
                (cabin_hash,),
            )
            cur.execute(
                "UPDATE employee SET password_hash = %s WHERE email = 'ravi@air.test'",
                (staff_hash,),
            )

            # Insert an Admin employee into department 4 (Administration)
            cur.execute(
                """
                INSERT INTO employee(department_id, full_name, email, password_hash, emp_type, salary)
                VALUES (4, 'System Administrator', 'admin@air.test', %s, 'ADMIN', 400000)
                ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
                """,
                (admin_hash,),
            )

            print("Updating passenger password hashes...")
            cur.execute(
                "UPDATE passenger SET password_hash = %s WHERE email = 'test@mail.test'",
                (cust_hash,),
            )

            print("\nSeeding complete! Sample accounts configured:")
            print(" - Customer: test@mail.test / Customer@123")
            print(" - Pilot:    arjun@air.test / Pilot@123")
            print(" - Cabin:    meera@air.test / Cabin@123")
            print(" - Ground:   ravi@air.test / Staff@123")
            print(" - Admin:    admin@air.test / Admin@123")


if __name__ == "__main__":
    seed_database()
