"""Database connection and repositories shared by both interfaces."""

from backend.database.connection import get_connection, initialize_database

__all__ = ["get_connection", "initialize_database"]
