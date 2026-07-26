import hashlib
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

PROTECTED_ENGINE_HASHES = {
    "backend/core/gamma_engine.py": (
        "2eec0f4826a1a22c0d71cdeb1e909e679971ad95f3509fc217518f91a9bbf7dc"
    ),
    "backend/core/dealer_engine.py": (
        "cb69bc769646dbe58f215f74a955d4ecec45e9c88a80bc33485d8a853c37f3cd"
    ),
    "backend/core/snapshot_engine.py": (
        "77fb604035e426483093db3b2e73b79e0cc3df0720deae32067343045a279b18"
    ),
    "backend/core/open_interest_engine.py": (
        "75bac774897fc1ab2ceb5bc65de31b763eb88e9f21ed8fbf43d4e8f1c4e37690"
    ),
}


def test_protected_engine_hashes_are_unchanged():
    for relative_path, expected_hash in PROTECTED_ENGINE_HASHES.items():
        digest = hashlib.sha256((PROJECT_ROOT / relative_path).read_bytes()).hexdigest()
        assert digest == expected_hash, relative_path
