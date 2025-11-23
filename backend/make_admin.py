#!/usr/bin/env python3
"""Make a user admin"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from models.user import User
from config import settings


async def make_admin(email: str):
    """Make user with given email an admin"""
    # Create engine
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Find user
        result = await session.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            print(f"❌ User with email '{email}' not found!")
            return False

        # Make admin
        user.is_admin = True
        await session.commit()

        print(f"✅ User '{user.username}' ({email}) is now an admin!")
        return True


async def list_users():
    """List all users"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()

        if not users:
            print("No users found!")
            return

        print("\n📋 Registered Users:")
        print("-" * 70)
        for user in users:
            admin_badge = "👑 ADMIN" if user.is_admin else ""
            print(f"{user.id:3d} | {user.username:20s} | {user.email:30s} {admin_badge}")
        print("-" * 70)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python make_admin.py list                 # List all users")
        print("  python make_admin.py <email>              # Make user admin")
        print("\nExample:")
        print("  python make_admin.py user@example.com")
        sys.exit(1)

    if sys.argv[1] == "list":
        asyncio.run(list_users())
    else:
        email = sys.argv[1]
        asyncio.run(make_admin(email))
