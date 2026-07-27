"""Preview, confirmation, cache and persistence orchestration for CME PDFs."""

from __future__ import annotations

import hashlib
import os
import re
import secrets
from collections import OrderedDict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import RLock

import pandas as pd

from backend.core.open_interest_engine import OpenInterestEngine
from backend.database.cme_bulletin_repository import (
    find_latest_id_by_hash,
    get_latest_cme_bulletin_import,
    insert_cme_bulletin_import,
)
from backend.providers.cme_bulletin_provider import CmeBulletinProvider
from backend.schemas.cme_bulletin import (
    CmeBulletinConfirmResponse,
    CmeBulletinImport,
    CmeBulletinLatestResponse,
    CmeBulletinPreview,
    CmeBulletinStatusResponse,
    CmeOpenInterestAnalysis,
)
from backend.services.cme_bulletin_parser import (
    CmeBulletinParseError,
    CmeBulletinParser,
    ParsedCmeBulletin,
)
from backend.services.cme_bulletin_validator import (
    LEGAL_NOTICE,
    CmeBulletinValidator,
    align_spot,
)


def _positive_int(variable: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(variable, str(default))))
    except ValueError:
        return default


def _positive_float(variable: str, default: float) -> float:
    try:
        return max(0.1, float(os.getenv(variable, str(default))))
    except ValueError:
        return default


def _safe_filename(filename: str | None) -> str:
    basename = Path(filename or "cme_bulletin.pdf").name
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "_", basename).strip("._")
    return (sanitized or "cme_bulletin.pdf")[:180]


class CmePreviewNotFoundError(ValueError):
    pass


class CmeDuplicateImportError(ValueError):
    def __init__(self, import_id: int) -> None:
        super().__init__(
            "Este arquivo já foi confirmado. "
            "Use reprocessamento explícito para continuar."
        )
        self.import_id = import_id


@dataclass(frozen=True)
class _PreviewEntry:
    preview: CmeBulletinPreview
    parsed: ParsedCmeBulletin


class _PreviewCache:
    def __init__(self, *, ttl_seconds: int, maximum: int) -> None:
        self.ttl_seconds = ttl_seconds
        self.maximum = maximum
        self._items: OrderedDict[str, _PreviewEntry] = OrderedDict()
        self._lock = RLock()

    def _cleanup(self, now: datetime) -> None:
        expired = [
            preview_id
            for preview_id, entry in self._items.items()
            if entry.preview.expires_at <= now
        ]
        for preview_id in expired:
            self._items.pop(preview_id, None)

    def put(self, entry: _PreviewEntry) -> None:
        with self._lock:
            self._cleanup(datetime.now(UTC))
            self._items[entry.preview.preview_id] = entry
            self._items.move_to_end(entry.preview.preview_id)
            while len(self._items) > self.maximum:
                self._items.popitem(last=False)

    def get(self, preview_id: str) -> _PreviewEntry:
        with self._lock:
            self._cleanup(datetime.now(UTC))
            entry = self._items.get(preview_id)
        if entry is None:
            raise CmePreviewNotFoundError(
                "Preview inexistente, expirado ou já confirmado."
            )
        return entry

    def discard(self, preview_id: str) -> None:
        with self._lock:
            self._items.pop(preview_id, None)

    def count(self) -> int:
        with self._lock:
            self._cleanup(datetime.now(UTC))
            return len(self._items)


class CmeBulletinService:
    def __init__(
        self,
        *,
        database_path: str | Path | None = None,
        max_file_bytes: int | None = None,
        max_pages: int | None = None,
        max_processing_seconds: float | None = None,
        preview_ttl_seconds: int | None = None,
        max_previews: int | None = None,
    ) -> None:
        self.database_path = database_path
        self.max_file_bytes = max_file_bytes or _positive_int(
            "CME_BULLETIN_MAX_BYTES",
            10_000_000,
        )
        self.max_pages = max_pages or _positive_int(
            "CME_BULLETIN_MAX_PAGES",
            100,
        )
        self.max_processing_seconds = (
            max(0.1, max_processing_seconds)
            if max_processing_seconds is not None
            else _positive_float("CME_BULLETIN_MAX_SECONDS", 120.0)
        )
        self.preview_ttl_seconds = preview_ttl_seconds or _positive_int(
            "CME_BULLETIN_PREVIEW_TTL_SECONDS",
            900,
        )
        self.max_previews = max_previews or _positive_int(
            "CME_BULLETIN_MAX_PREVIEWS",
            5,
        )
        self.parser = CmeBulletinParser(
            max_pages=self.max_pages,
            max_seconds=self.max_processing_seconds,
        )
        self.validator = CmeBulletinValidator()
        self.provider = CmeBulletinProvider()
        self.cache = _PreviewCache(
            ttl_seconds=self.preview_ttl_seconds,
            maximum=self.max_previews,
        )

    def preview(
        self,
        content: bytes,
        *,
        filename: str | None,
    ) -> CmeBulletinPreview:
        safe_filename = _safe_filename(filename)
        if len(content) > self.max_file_bytes:
            raise CmeBulletinParseError(
                "O PDF excede o limite de tamanho configurado."
            )
        if not content.startswith(b"%PDF-"):
            raise CmeBulletinParseError("O arquivo enviado não é um PDF válido.")

        file_hash = hashlib.sha256(content).hexdigest()
        parsed = self.parser.parse(content)
        report = self.validator.validate(parsed)
        spot_alignment = align_spot(parsed.bulletin_date, None)
        eligibility = self.validator.eligibility(
            parsed,
            report,
            spot_alignment,
        )
        now = datetime.now(UTC)
        metadata = self.validator.metadata(
            parsed,
            report,
            retrieved_at=now,
        )
        duplicate_id = find_latest_id_by_hash(
            file_hash,
            database_path=self.database_path,
        )
        preview = CmeBulletinPreview(
            preview_id=secrets.token_urlsafe(24),
            expires_at=now + timedelta(seconds=self.preview_ttl_seconds),
            filename=safe_filename,
            file_hash=file_hash,
            duplicate=duplicate_id is not None,
            duplicate_import_id=duplicate_id,
            metadata=metadata,
            report=report,
            eligibility=eligibility,
            spot_alignment=spot_alignment,
            sample_contracts=list(parsed.contracts[:20]),
        )
        self.cache.put(_PreviewEntry(preview=preview, parsed=parsed))
        return preview

    @staticmethod
    def _open_interest_analysis(
        parsed: ParsedCmeBulletin,
    ) -> CmeOpenInterestAnalysis | None:
        records: list[dict[str, object]] = []
        for contract in parsed.contracts:
            if contract.open_interest is None:
                continue
            previous_open_interest = None
            if contract.open_interest_change is not None:
                candidate = (
                    contract.open_interest - contract.open_interest_change
                )
                if candidate >= 0:
                    previous_open_interest = candidate
            records.append(
                {
                    "strike": contract.strike,
                    "type": contract.option_type,
                    "open_interest": contract.open_interest,
                    "previous_open_interest": previous_open_interest,
                }
            )
        if not records:
            return None
        engine = OpenInterestEngine(pd.DataFrame.from_records(records))
        summary = engine.summary()
        distribution = [
            {
                "rank": index + 1,
                "strike": float(row.strike),
                "call_oi": float(row.call_oi),
                "put_oi": float(row.put_oi),
                "total_oi": float(row.total_oi),
                "net_oi": float(row.net_oi),
                "percentage": float(row.concentration_pct),
            }
            for index, row in engine.by_strike().iterrows()
        ]
        return CmeOpenInterestAnalysis(
            call_oi_total=summary["call_oi_total"],
            put_oi_total=summary["put_oi_total"],
            total_oi=summary["total_oi"],
            net_oi=summary["net_oi"],
            largest_call_oi_strike=summary["largest_call_oi_strike"],
            largest_put_oi_strike=summary["largest_put_oi_strike"],
            largest_concentration_strike=summary[
                "largest_concentration_strike"
            ],
            largest_concentration_pct=summary["max_concentration_pct"],
            oi_concentration_score=summary["oi_concentration_score"],
            top_10_strikes=summary["top_10_strikes"],
            distribution_by_strike=distribution,
        )

    def confirm(
        self,
        preview_id: str,
        *,
        allow_reprocess: bool = False,
        spot_timestamp: datetime | None = None,
    ) -> CmeBulletinConfirmResponse:
        entry = self.cache.get(preview_id)
        preview = entry.preview
        parsed = entry.parsed
        if preview.report.status in {"rejected", "incompatible"}:
            raise CmeBulletinParseError(
                "O preview foi rejeitado e não pode ser confirmado."
            )

        duplicate_id = find_latest_id_by_hash(
            preview.file_hash,
            database_path=self.database_path,
        )
        if duplicate_id is not None and not allow_reprocess:
            raise CmeDuplicateImportError(duplicate_id)

        spot_alignment = align_spot(parsed.bulletin_date, spot_timestamp)
        eligibility = self.validator.eligibility(
            parsed,
            preview.report,
            spot_alignment,
        )
        imported_at = datetime.now(UTC)
        metadata = self.validator.metadata(
            parsed,
            preview.report,
            retrieved_at=imported_at,
        )
        if spot_alignment.warning:
            metadata = metadata.model_copy(
                update={
                    "warnings": [
                        *metadata.warnings,
                        spot_alignment.warning,
                    ]
                }
            )
        if duplicate_id is not None:
            metadata = metadata.model_copy(
                update={
                    "warnings": [
                        *metadata.warnings,
                        f"Reprocessamento explícito da importação #{duplicate_id}.",
                    ]
                }
            )

        open_interest_analysis = (
            self._open_interest_analysis(parsed)
            if "open_interest" in eligibility.engines_allowed
            else None
        )
        storage_payload = {
            "imported_at": imported_at.isoformat(),
            "filename": preview.filename,
            "file_hash": preview.file_hash,
            "bulletin_date": (
                parsed.bulletin_date.isoformat()
                if parsed.bulletin_date
                else None
            ),
            "contract_count": len(parsed.contracts),
            "validation_status": preview.report.status,
            "eligibility": eligibility.status,
            "reprocessed_from_id": duplicate_id,
            "metadata": metadata.model_dump(mode="json"),
            "report": preview.report.model_dump(mode="json"),
            "eligibility_report": eligibility.model_dump(mode="json"),
            "spot_alignment": spot_alignment.model_dump(mode="json"),
            "contracts": [
                contract.model_dump(mode="json")
                for contract in parsed.contracts
            ],
            "open_interest_analysis": (
                open_interest_analysis.model_dump(mode="json")
                if open_interest_analysis
                else None
            ),
        }
        import_id = insert_cme_bulletin_import(
            storage_payload,
            database_path=self.database_path,
        )
        result = CmeBulletinImport(
            id=import_id,
            filename=preview.filename,
            file_hash=preview.file_hash,
            imported_at=imported_at,
            reprocessed=duplicate_id is not None,
            reprocessed_from_id=duplicate_id,
            metadata=metadata,
            report=preview.report,
            eligibility=eligibility,
            spot_alignment=spot_alignment,
            contract_count=len(parsed.contracts),
            contracts=list(parsed.contracts),
            open_interest_analysis=open_interest_analysis,
        )
        self.cache.discard(preview_id)
        self.provider.confirm(result)
        return CmeBulletinConfirmResponse(result=result)

    def latest(self) -> CmeBulletinLatestResponse:
        stored = get_latest_cme_bulletin_import(
            database_path=self.database_path
        )
        if stored is None:
            return CmeBulletinLatestResponse(available=False)
        result = CmeBulletinImport(
            id=stored["id"],
            filename=stored["filename"],
            file_hash=stored["file_hash"],
            imported_at=stored["imported_at"],
            reprocessed=stored["reprocessed_from_id"] is not None,
            reprocessed_from_id=stored["reprocessed_from_id"],
            metadata=stored["metadata"],
            report=stored["report"],
            eligibility=stored["eligibility_report"],
            spot_alignment=stored["spot_alignment"],
            contract_count=stored["contract_count"],
            contracts=stored["contracts"],
            open_interest_analysis=stored["open_interest_analysis"],
        )
        self.provider.confirm(result)
        return CmeBulletinLatestResponse(available=True, result=result)

    def status(self) -> CmeBulletinStatusResponse:
        latest = self.latest()
        return CmeBulletinStatusResponse(
            available=latest.available,
            preview_count=self.cache.count(),
            preview_ttl_seconds=self.preview_ttl_seconds,
            max_previews=self.max_previews,
            max_file_bytes=self.max_file_bytes,
            max_pages=self.max_pages,
            max_processing_seconds=self.max_processing_seconds,
            latest_import_id=latest.result.id if latest.result else None,
            latest_bulletin_date=(
                latest.result.metadata.bulletin_date
                if latest.result
                else None
            ),
            legal_notice=LEGAL_NOTICE,
        )


_service: CmeBulletinService | None = None
_service_lock = RLock()


def get_cme_bulletin_service() -> CmeBulletinService:
    global _service
    with _service_lock:
        if _service is None:
            _service = CmeBulletinService()
        return _service


def reset_cme_bulletin_service() -> None:
    global _service
    with _service_lock:
        _service = None
