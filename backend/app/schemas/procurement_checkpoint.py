from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProcurementCheckpointUpdate(BaseModel):
    is_completed: bool


class ProcurementCheckpointRead(BaseModel):
    id: int
    item_id: int

    code: str
    label: str
    phase: str
    position: int

    is_completed: bool

    completed_at: datetime | None
    completed_by_id: int | None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )