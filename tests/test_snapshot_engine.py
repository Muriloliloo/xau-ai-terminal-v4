import json

import pytest

from backend.core.snapshot_engine import SnapshotEngine


def _analysis(**overrides):
    payload = {
        "source_name": "sample_options.csv",
        "source_mode": "demo",
        "generated_at": "2026-07-23T18:00:00Z",
        "call_wall": 4100.0,
        "put_wall": 4000.0,
        "gamma_flip": 4050.0,
        "gamma_magnet": 4100.0,
        "gex_total": 484.4,
        "regime": "LONG GAMMA",
        "dealer_bias": "REVERTER MOVIMENTOS",
        "confidence": 60.5,
        "open_interest_summary": {"net_oi": 2887.0},
        "dealer_report": {"institutional_score": 51.92},
        "strike_table": [{"strike": 4000.0, "net_gex": -1093.52}],
        "snapshot_id": 99,
        "snapshot_saved_automatically": True,
    }
    payload.update(overrides)
    return payload


def test_snapshot_engine_serializes_an_immutable_round_trip():
    source = _analysis()

    serialized = SnapshotEngine.serialize(source)
    restored = SnapshotEngine.deserialize(serialized)

    assert json.loads(serialized)["source_name"] == "sample_options.csv"
    assert restored["gex_total"] == 484.4
    assert restored["strike_table"][0]["strike"] == 4000.0
    assert restored["snapshot_id"] is None
    assert restored["snapshot_saved_automatically"] is False
    assert source["snapshot_id"] == 99


def test_snapshot_engine_extracts_indexed_metadata():
    metadata = SnapshotEngine.extract_metadata(_analysis())

    assert metadata.call_wall == 4100.0
    assert metadata.net_oi == 2887.0
    assert metadata.regime == "LONG GAMMA"
    assert metadata.institutional_score == 51.92


def test_snapshot_engine_compares_two_snapshots():
    left = _analysis()
    right = _analysis(
        gex_total=-100.0,
        regime="SHORT GAMMA",
        confidence=70.0,
        open_interest_summary={"net_oi": -500.0},
        dealer_report={"institutional_score": 35.0},
    )

    comparison = SnapshotEngine.compare(left, right)

    assert comparison == {
        "regime_changed": True,
        "gex_total_change": -584.4,
        "confidence_change": 9.5,
        "net_oi_change": -3387.0,
        "institutional_score_change": -16.92,
    }


@pytest.mark.parametrize(
    "payload, message",
    [
        ({"source_name": "incompleto.csv"}, "Campos obrigatórios ausentes"),
        (_analysis(source_mode="live"), "source_mode"),
        (_analysis(strike_table={}), "strike_table"),
    ],
)
def test_snapshot_engine_rejects_invalid_payloads(payload, message):
    with pytest.raises(ValueError, match=message):
        SnapshotEngine.serialize(payload)


def test_snapshot_engine_rejects_corrupted_json():
    with pytest.raises(ValueError, match="corrompido"):
        SnapshotEngine.deserialize("{invalid")
