from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.attachment import AttachmentRead
from app.services.attachment_service import (
    delete_attachment,
    get_attachment_file,
    get_comment_attachments,
    get_procurement_attachments,
    get_task_comment_attachments,
    upload_comment_attachment,
    upload_procurement_attachment,
    upload_task_comment_attachment,
)


router = APIRouter(
    tags=["Attachments"]
)

@router.post(
    (
        "/projects/{project_id}"
        "/tasks/{task_id}"
        "/comments/{comment_id}"
        "/attachments"
    ),
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED
)
async def upload_comment_attachment_endpoint(
    project_id: int,
    task_id: int,
    comment_id: int,
    file: Annotated[
        UploadFile,
        File()
    ],
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return await upload_comment_attachment(
        db=db,
        project_id=project_id,
        task_id=task_id,
        comment_id=comment_id,
        file=file,
        current_user=current_user
    )


@router.get(
    (
        "/projects/{project_id}"
        "/tasks/{task_id}"
        "/comments/{comment_id}"
        "/attachments"
    ),
    response_model=list[AttachmentRead]
)
def get_comment_attachments_endpoint(
    project_id: int,
    task_id: int,
    comment_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_comment_attachments(
        db=db,
        project_id=project_id,
        task_id=task_id,
        comment_id=comment_id
    )

@router.post(
    (
        "/projects/{project_id}"
        "/procurement-items/{item_id}"
        "/attachments"
    ),
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED
)
async def upload_procurement_attachment_endpoint(
    project_id: int,
    item_id: int,
    file: Annotated[
        UploadFile,
        File()
    ],
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return await upload_procurement_attachment(
        db=db,
        project_id=project_id,
        item_id=item_id,
        file=file,
        current_user=current_user
    )


@router.get(
    (
        "/projects/{project_id}"
        "/procurement-items/{item_id}"
        "/attachments"
    ),
    response_model=list[AttachmentRead]
)
def get_procurement_attachments_endpoint(
    project_id: int,
    item_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_procurement_attachments(
        db=db,
        project_id=project_id,
        item_id=item_id
    )

@router.get(
    "/attachments/{attachment_id}/file"
)
def get_attachment_file_endpoint(
    attachment_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ],
    download: bool = False
):
    attachment, file_path = (
        get_attachment_file(
            db=db,
            attachment_id=attachment_id
        )
    )

    return FileResponse(
        path=file_path,
        media_type=attachment.content_type,
        filename=attachment.original_name,
        content_disposition_type=(
            "attachment"
            if download
            else "inline"
        )
    )

@router.delete(
    "/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_attachment_endpoint(
    attachment_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    delete_attachment(
        db=db,
        attachment_id=attachment_id,
        current_user=current_user
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )

@router.post(
    "/tasks/{task_id}/comments/{comment_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED
)
async def upload_task_comment_attachment_endpoint(
    task_id: int,
    comment_id: int,
    file: Annotated[
        UploadFile,
        File()
    ],
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return await upload_task_comment_attachment(
        db=db,
        task_id=task_id,
        comment_id=comment_id,
        file=file,
        current_user=current_user
    )

@router.get(
    "/tasks/{task_id}/comments/{comment_id}/attachments",
    response_model=list[AttachmentRead]
)
def get_task_comment_attachments_endpoint(
    task_id: int,
    comment_id: int,
    db: Annotated[
        Session,
        Depends(get_db)
    ],
    current_user: Annotated[
        User,
        Depends(get_current_user)
    ]
):
    return get_task_comment_attachments(
        db=db,
        task_id=task_id,
        comment_id=comment_id
    )