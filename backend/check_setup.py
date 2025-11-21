#!/usr/bin/env python3
"""
Setup validation script for the 3D Maze Game backend.
Run this to verify all dependencies and configuration are correct.
"""

import sys
import importlib

def check_dependency(module_name, package_name=None):
    """Check if a Python module can be imported."""
    package_name = package_name or module_name
    try:
        importlib.import_module(module_name)
        print(f"✓ {package_name} is installed")
        return True
    except ImportError as e:
        print(f"✗ {package_name} is NOT installed: {e}")
        return False

def main():
    print("=" * 60)
    print("3D Maze Game Backend - Setup Validation")
    print("=" * 60)
    print()

    print(f"Python Version: {sys.version}")
    print()

    print("Checking dependencies...")
    print("-" * 60)

    dependencies = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("sqlalchemy", "SQLAlchemy"),
        ("alembic", "Alembic"),
        ("jose", "python-jose"),
        ("passlib", "passlib"),
        ("pydantic", "Pydantic"),
        ("pydantic_settings", "pydantic-settings"),
        ("email_validator", "email-validator"),
        ("aiosqlite", "aiosqlite"),
        ("websockets", "websockets"),
        ("redis", "redis"),
        ("dotenv", "python-dotenv"),
        ("greenlet", "greenlet"),
    ]

    all_ok = True
    for module, package in dependencies:
        if not check_dependency(module, package):
            all_ok = False

    print()
    print("-" * 60)

    if all_ok:
        print("✓ All dependencies are installed!")
        print()
        print("Next steps:")
        print("1. Run: python main.py")
        print("2. Backend will start on http://localhost:7100")
        print("3. API docs available at http://localhost:7100/docs")
        return 0
    else:
        print("✗ Some dependencies are missing.")
        print("Run: pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())
