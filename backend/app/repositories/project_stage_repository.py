from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project_stage import ProjectStage


def create_stage(
    db: Session,
    *,
    project_id: int,
    name: str,
    position: int,
    status: str,
    deadline
) -> ProjectStage:

    stage = ProjectStage(
        project_id=project_id,
        name=name,
        position=position,
        status=status,
        deadline=deadline
    )

    db.add(stage)
    db.commit()
    db.refresh(stage)

    return stage


def get_stages_by_project(
    db: Session,
    project_id: int
) -> list[ProjectStage]:

    statement = (
        select(ProjectStage)
        .where(
            ProjectStage.project_id == project_id
        )
        .order_by(
            ProjectStage.position
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_stage_by_id(
    db: Session,
    stage_id: int
) -> ProjectStage | None:

    return db.get(
        ProjectStage,
        stage_id
    )


def update_stage(
    db: Session,
    stage: ProjectStage,
    update_data: dict
) -> ProjectStage:

    for field, value in update_data.items():
        setattr(
            stage,
            field,
            value
        )

    db.commit()
    db.refresh(stage)

    return stage

def create_stages_bulk(
    db: Session,
    project_id: int,
    stages_data: list[dict]
) -> list[ProjectStage]:

    stages = []

    for stage_data in stages_data:
        stage = ProjectStage(
            project_id=project_id,
            name=stage_data["name"],
            position=stage_data["position"],
            status="planned"
        )

        stages.append(stage)

    db.add_all(stages)
    db.flush()

    return stages

def get_stages_by_deadline_range(
    db: Session,
    *,
    deadline_from,
    deadline_to
) -> list[ProjectStage]:

    statement = (
        select(ProjectStage)
        .where(
            ProjectStage.deadline.is_not(None),
            ProjectStage.deadline >= deadline_from,
            ProjectStage.deadline <= deadline_to
        )
        .order_by(
            ProjectStage.deadline.asc(),
            ProjectStage.position.asc()
        )
    )

    return list(
        db.scalars(statement).all()
    )