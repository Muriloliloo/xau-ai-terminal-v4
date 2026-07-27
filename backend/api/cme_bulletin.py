"""Internal endpoints for manual CME Daily Bulletin processing."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.schemas.cme_bulletin import (
    CmeBulletinConfirmRequest,
    CmeBulletinConfirmResponse,
    CmeBulletinLatestResponse,
    CmeBulletinPreview,
    CmeBulletinStatusResponse,
)
from backend.services.cme_bulletin_parser import CmeBulletinParseError
from backend.services.cme_bulletin_service import (
    CmeDuplicateImportError,
    CmePreviewBusyError,
    CmePreviewNotFoundError,
    get_cme_bulletin_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market/cme-bulletin", tags=["cme-bulletin"])


@router.post("/preview", response_model=CmeBulletinPreview)
def preview_cme_bulletin(
    file: Annotated[UploadFile, File(...)],
) -> CmeBulletinPreview:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Apenas arquivos application/pdf são permitidos.",
        )
    service = get_cme_bulletin_service()
    try:
        content = file.file.read(service.max_file_bytes + 1)
    except (OSError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Não foi possível ler o arquivo PDF enviado.",
        ) from error
    logger.info("cme_preview_upload_received bytes=%s", len(content))
    try:
        return service.preview(content, filename=file.filename)
    except CmePreviewBusyError as error:
        logger.warning("cme_preview_rejected error_type=%s", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(error),
        ) from error
    except MemoryError as error:
        logger.exception("cme_preview_failed error_type=%s", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O preview excedeu a memória disponível. Tente novamente.",
        ) from error
    except CmeBulletinParseError as error:
        logger.warning("cme_preview_rejected error_type=%s", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error


@router.post("/confirm", response_model=CmeBulletinConfirmResponse)
def confirm_cme_bulletin(
    request: CmeBulletinConfirmRequest,
) -> CmeBulletinConfirmResponse:
    try:
        return get_cme_bulletin_service().confirm(
            request.preview_id,
            allow_reprocess=request.allow_reprocess,
            spot_timestamp=request.spot_timestamp,
        )
    except CmePreviewNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except CmeDuplicateImportError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    except CmeBulletinParseError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error


@router.get("/status", response_model=CmeBulletinStatusResponse)
def cme_bulletin_status() -> CmeBulletinStatusResponse:
    return get_cme_bulletin_service().status()


@router.get("/latest", response_model=CmeBulletinLatestResponse)
def latest_cme_bulletin() -> CmeBulletinLatestResponse:
    return get_cme_bulletin_service().latest()
