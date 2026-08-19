from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.project_stage import ProjectStageStatus


class ProjectStageCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=150
    )

    position: int = Field(
        ge=1
    )

    status: ProjectStageStatus = (
        ProjectStageStatus.PLANNED
    )

    deadline: date | None = None


class ProjectStageUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150
    )

    position: int | None = Field(
        default=None,
        ge=1
    )

    status: ProjectStageStatus | None = None

    deadline: date | None = None


class ProjectStageRead(BaseModel):
    id: int
    project_id: int
    name: str
    position: int
    status: str
    deadline: date | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )