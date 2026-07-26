"""Small thread-safe TTL cache for external provider responses."""

from __future__ import annotations

from collections.abc import Callable, Hashable
from dataclasses import dataclass
from threading import RLock
from time import monotonic
from typing import Any


@dataclass(frozen=True)
class CacheStats:
    hits: int
    misses: int
    entries: int
    ttl_seconds: int


class ProviderCache:
    def __init__(
        self,
        ttl_seconds: int,
        *,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self.ttl_seconds = max(1, int(ttl_seconds))
        self._clock = clock
        self._entries: dict[Hashable, tuple[float, Any]] = {}
        self._hits = 0
        self._misses = 0
        self._lock = RLock()

    def get(self, key: Hashable) -> Any | None:
        with self._lock:
            self._clean_expired()
            entry = self._entries.get(key)
            if entry is None:
                self._misses += 1
                return None
            self._hits += 1
            return entry[1]

    def set(self, key: Hashable, value: Any) -> None:
        if value is None:
            return
        with self._lock:
            self._clean_expired()
            self._entries[key] = (
                self._clock() + self.ttl_seconds,
                value,
            )

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def stats(self) -> CacheStats:
        with self._lock:
            self._clean_expired()
            return CacheStats(
                hits=self._hits,
                misses=self._misses,
                entries=len(self._entries),
                ttl_seconds=self.ttl_seconds,
            )

    def _clean_expired(self) -> None:
        now = self._clock()
        expired = [
            key
            for key, (expires_at, _) in self._entries.items()
            if expires_at <= now
        ]
        for key in expired:
            self._entries.pop(key, None)
