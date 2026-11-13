from datetime import datetime, timezone
import hashlib
import json
from typing import Annotated
from pydantic import AfterValidator, Field

def utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise ValueError("Укажите часовой пояс для точного времени")
    return value.astimezone(timezone.utc)

def offsets(values: list[int]) -> list[int]:
    return sorted(set(values), reverse=True)

UTCDateTime = Annotated[datetime, AfterValidator(utc)]
ReminderOffsets = Annotated[list[Annotated[int, Field(ge=0, le=525600)]], Field(max_length=20), AfterValidator(offsets)]


def schedule_revision(entry) -> str:
    """State revision for existing schedule tables without a schema migration.

    SQLite returns naive datetimes while PostgreSQL returns aware ones. Their
    equivalent UTC instants must have the same revision in reads and writes.
    """
    def stamp(value):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat(timespec="microseconds")

    state = {key: getattr(entry, key) for key in (
        "title", "description", "project_id", "assignee_ids", "reminder_offsets", "completed",
    )}
    state["due_at"] = stamp(entry.due_at)
    state["ends_at"] = stamp(getattr(entry, "ends_at", None))
    encoded = json.dumps(state, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()
