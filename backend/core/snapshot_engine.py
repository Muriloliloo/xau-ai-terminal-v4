"""Pure serialization and comparison rules for institutional snapshots."""

from __future__ import annotations

import json
from collections.abc import Mapping
from copy import deepcopy
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SnapshotMetadata:
    source_name: str
    source_mode: str
    call_wall: float | None
    put_wall: float | None
    gamma_flip: float | None
    gamma_magnet: float | None
    gex_total: float
    net_oi: float
    regime: str
    dealer_bias: str
    confidence: float
    institutional_score: float


class SnapshotEngine:
    """Prepare immutable payloads without importing database or HTTP layers."""

    SCHEMA_VERSION = 1
    REQUIRED_FIELDS = {
        "source_name",
        "source_mode",
        "generated_at",
        "gex_total",
        "regime",
        "dealer_bias",
        "confidence",
        "open_interest_summary",
        "dealer_report",
        "strike_table",
    }

    @classmethod
    def _validate(cls, analysis: Mapping[str, Any]) -> None:
        missing = sorted(cls.REQUIRED_FIELDS.difference(analysis))
        if missing:
            raise ValueError(
                "Campos obrigatórios ausentes no snapshot: " + ", ".join(missing)
            )
        if analysis["source_mode"] not in {"demo", "upload"}:
            raise ValueError("source_mode do snapshot deve ser demo ou upload.")
        if not isinstance(analysis["open_interest_summary"], Mapping):
            raise ValueError("open_interest_summary inválido para snapshot.")
        if not isinstance(analysis["dealer_report"], Mapping):
            raise ValueError("dealer_report inválido para snapshot.")
        if not isinstance(analysis["strike_table"], list):
            raise ValueError("strike_table inválida para snapshot.")

    @classmethod
    def normalize(cls, analysis: Mapping[str, Any]) -> dict[str, Any]:
        normalized = deepcopy(dict(analysis))
        cls._validate(normalized)
        # Snapshot metadata always reflects the row being reconstructed.
        normalized["snapshot_id"] = None
        normalized["snapshot_saved_automatically"] = False
        return normalized

    @classmethod
    def serialize(cls, analysis: Mapping[str, Any]) -> str:
        normalized = cls.normalize(analysis)
        try:
            return json.dumps(
                normalized,
                ensure_ascii=False,
                allow_nan=False,
                separators=(",", ":"),
                sort_keys=True,
            )
        except (TypeError, ValueError) as error:
            raise ValueError(f"Snapshot contém dados não serializáveis: {error}") from error

    @classmethod
    def deserialize(cls, payload: str) -> dict[str, Any]:
        try:
            analysis = json.loads(payload)
        except json.JSONDecodeError as error:
            raise ValueError("JSON do snapshot está corrompido.") from error
        if not isinstance(analysis, dict):
            raise ValueError("JSON do snapshot deve representar um objeto.")
        cls._validate(analysis)
        return analysis

    @classmethod
    def extract_metadata(cls, analysis: Mapping[str, Any]) -> SnapshotMetadata:
        normalized = cls.normalize(analysis)
        open_interest = normalized["open_interest_summary"]
        dealer_report = normalized["dealer_report"]
        return SnapshotMetadata(
            source_name=str(normalized["source_name"]),
            source_mode=str(normalized["source_mode"]),
            call_wall=normalized.get("call_wall"),
            put_wall=normalized.get("put_wall"),
            gamma_flip=normalized.get("gamma_flip"),
            gamma_magnet=normalized.get("gamma_magnet"),
            gex_total=float(normalized["gex_total"]),
            net_oi=float(open_interest["net_oi"]),
            regime=str(normalized["regime"]),
            dealer_bias=str(normalized["dealer_bias"]),
            confidence=float(normalized["confidence"]),
            institutional_score=float(dealer_report["institutional_score"]),
        )

    @classmethod
    def compare(
        cls,
        left: Mapping[str, Any],
        right: Mapping[str, Any],
    ) -> dict[str, Any]:
        left_normalized = cls.normalize(left)
        right_normalized = cls.normalize(right)
        return {
            "regime_changed": left_normalized["regime"]
            != right_normalized["regime"],
            "gex_total_change": float(right_normalized["gex_total"])
            - float(left_normalized["gex_total"]),
            "confidence_change": float(right_normalized["confidence"])
            - float(left_normalized["confidence"]),
            "net_oi_change": float(
                right_normalized["open_interest_summary"]["net_oi"]
            )
            - float(left_normalized["open_interest_summary"]["net_oi"]),
            "institutional_score_change": float(
                right_normalized["dealer_report"]["institutional_score"]
            )
            - float(left_normalized["dealer_report"]["institutional_score"]),
        }
