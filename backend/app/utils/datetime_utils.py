"""Datetime utility functions."""
from datetime import datetime


def get_today_start_utc() -> datetime:
    """Get the start of today (midnight) in UTC, based on local timezone.

    This function calculates the local midnight and converts it to UTC,
    which is useful for comparing with database timestamps stored in UTC.

    Returns:
        datetime: The UTC datetime corresponding to local midnight today.
    """
    local_today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    utc_offset = datetime.now() - datetime.utcnow()
    return local_today_start - utc_offset
