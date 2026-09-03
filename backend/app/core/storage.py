from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import BASE_DIR, settings


UPLOAD_ROOT = (
    BASE_DIR
    / "storage"
    / "uploads"
)

UPLOAD_ROOT.mkdir(
    parents=True,
    exist_ok=True
)


CHUNK_SIZE = 1024 * 1024


ALLOWED_FILE_TYPES = {
    ".jpg": {
        "image/jpeg",
    },
    ".jpeg": {
        "image/jpeg",
    },
    ".png": {
        "image/png",
    },
    ".webp": {
        "image/webp",
    },
    ".pdf": {
        "application/pdf",
    },
    ".doc": {
        "application/msword",
        "application/octet-stream",
    },
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream",
    },
    ".xls": {
        "application/vnd.ms-excel",
        "application/octet-stream",
    },
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/octet-stream",
    },
}

async def save_upload_file(
    file: UploadFile
) -> dict:

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У файла отсутствует имя"
        )

    original_name = (
        file.filename
        .replace("\\", "/")
        .split("/")[-1]
    )

    suffix = (
        Path(original_name)
        .suffix
        .lower()
    )

    if suffix not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Этот тип файла не поддерживается"
        )

    content_type = (
        file.content_type
        or "application/octet-stream"
    ).lower()

    allowed_content_types = (
        ALLOWED_FILE_TYPES[suffix]
    )

    if content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Тип файла не соответствует расширению"
        )

    now = datetime.utcnow()

    directory = (
        UPLOAD_ROOT
        / str(now.year)
        / f"{now.month:02d}"
    )

    directory.mkdir(
        parents=True,
        exist_ok=True
    )

    stored_name = (
        f"{uuid4().hex}{suffix}"
    )

    full_path = (
        directory
        / stored_name
    )

    max_size = (
        settings.max_upload_size_mb
        * 1024
        * 1024
    )

    size = 0

    try:
        with full_path.open("wb") as output:
            while True:
                chunk = await file.read(
                    CHUNK_SIZE
                )

                if not chunk:
                    break

                size += len(chunk)

                if size > max_size:
                    raise HTTPException(
                        status_code=(
                            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                        ),
                        detail=(
                            f"Размер файла превышает "
                            f"{settings.max_upload_size_mb} МБ"
                        )
                    )

                output.write(chunk)

    except Exception:
        full_path.unlink(
            missing_ok=True
        )
        raise

    finally:
        await file.close()

    if size == 0:
        full_path.unlink(
            missing_ok=True
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя загрузить пустой файл"
        )

    relative_path = (
        full_path
        .relative_to(UPLOAD_ROOT)
        .as_posix()
    )

    return {
        "original_name": original_name,
        "stored_name": stored_name,
        "relative_path": relative_path,
        "content_type": content_type,
        "size_bytes": size,
    }

def get_upload_path(
    relative_path: str
) -> Path:

    root = UPLOAD_ROOT.resolve()

    file_path = (
        UPLOAD_ROOT
        / relative_path
    ).resolve()

    try:
        file_path.relative_to(root)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный путь файла"
        )

    return file_path


def delete_upload_file(
    relative_path: str
) -> None:

    file_path = get_upload_path(
        relative_path
    )

    file_path.unlink(
        missing_ok=True
    )