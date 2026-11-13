from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.project import ProjectStatus, ProjectType


class ProjectCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=150
    )

    object_type: ProjectType

    area: float = Field(
        gt=0,
        le=10000
    )

    city: str | None = Field(
        default=None,
        max_length=100
    )

    address: str | None = Field(
        default=None,
        max_length=255
    )

    client_name: str = Field(
        min_length=2,
        max_length=255
    )

    status: ProjectStatus = ProjectStatus.PLANNED

    start_date: date | None = None
    deadline: date | None = None

    cover_color: str = Field(default="#c8b8a6", pattern=r"^#[0-9a-fA-F]{6}$")
    cover_attachment_id: int | None = None

    description: str | None = None

class ProjectUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150
    )

    object_type: ProjectType | None = None

    area: float | None = Field(
        default=None,
        gt=0,
        le=10000
    )

    city: str | None = Field(
        default=None,
        max_length=100
    )

    address: str | None = Field(
        default=None,
        max_length=255
    )

    client_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=255
    )

    status: ProjectStatus | None = None

    start_date: date | None = None
    deadline: date | None = None

    cover_color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    cover_attachment_id: int | None = None

    description: str | None = None


class ProjectRead(BaseModel):
    id: int
    name: str
    object_type: str
    area: float
    city: str | None
    address: str | None
    client_name: str
    status: str
    start_date: date | None
    deadline: date | None
    cover_color: str = Field(default="#c8b8a6", pattern=r"^#[0-9a-fA-F]{6}$")
    cover_attachment_id: int | None = None
    created_by_id: int
    description: str | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )