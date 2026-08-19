from sqlalchemy.orm import Session

from app.models.project import Project

from sqlalchemy import select

def get_all_projects(
    db: Session
) -> list[Project]:

    statement = (
        select(Project)
        .order_by(Project.id.desc())
    )

    return list(
        db.scalars(statement).all()
    )


def get_project_by_id(
    db: Session,
    project_id: int
) -> Project | None:

    return db.get(
        Project,
        project_id
    )

def create_project(
    db: Session,
    *,
    name: str,
    object_type: str,
    area: float,
    city: str | None,
    address: str | None,
    client_name: str,
    status: str,
    start_date,
    deadline,
    responsible_id: int,
    created_by_id: int,
    description: str | None
) -> Project:

    project = Project(
        name=name,
        object_type=object_type,
        area=area,
        city=city,
        address=address,
        client_name=client_name,
        status=status,
        start_date=start_date,
        deadline=deadline,
        responsible_id=responsible_id,
        created_by_id=created_by_id,
        description=description
    )

    db.add(project)
    db.flush()

    return project

def update_project(
    db: Session,
    project: Project,
    update_data: dict
) -> Project:

    for field, value in update_data.items():
        setattr(
            project,
            field,
            value
        )

    db.commit()
    db.refresh(project)

    return project