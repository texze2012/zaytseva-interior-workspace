from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TaskCommentCreate(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=5000
    )


class TaskCommentRead(BaseModel):
    id: int
    task_id: int
    author_id: int
    text: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )