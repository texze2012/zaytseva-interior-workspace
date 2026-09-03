from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
)


class AttachmentRead(BaseModel):
    id: int

    target_type: str
    target_id: int

    original_name: str
    content_type: str
    size_bytes: int

    uploaded_by_id: int
    created_at: datetime

    file_url: str

    model_config = ConfigDict(
        from_attributes=True
    )