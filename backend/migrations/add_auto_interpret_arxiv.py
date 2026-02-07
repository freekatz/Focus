#!/usr/bin/env python3
"""
Database migration: Add auto_interpret_arxiv field

Usage:
  Docker: docker exec -it focus-backend python /app/migrations/add_auto_interpret_arxiv.py
  Local: cd backend && python migrations/add_auto_interpret_arxiv.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import engine
from app.config import settings


async def migrate():
    async with engine.begin() as conn:
        # Check if column exists
        if settings.database_url.startswith("sqlite"):
            result = await conn.execute(text("PRAGMA table_info(user_configs)"))
            columns = [row[1] for row in result.fetchall()]
            exists = "auto_interpret_arxiv" in columns
        else:
            result = await conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'user_configs' AND column_name = 'auto_interpret_arxiv'
            """))
            exists = result.fetchone() is not None

        if exists:
            print("Column 'auto_interpret_arxiv' already exists, skipping.")
            return

        # Add column
        if settings.database_url.startswith("sqlite"):
            await conn.execute(text(
                "ALTER TABLE user_configs ADD COLUMN auto_interpret_arxiv BOOLEAN DEFAULT 1"
            ))
        else:
            await conn.execute(text(
                "ALTER TABLE user_configs ADD COLUMN auto_interpret_arxiv BOOLEAN DEFAULT TRUE"
            ))
        print("Migration completed: added auto_interpret_arxiv column.")


if __name__ == "__main__":
    asyncio.run(migrate())
