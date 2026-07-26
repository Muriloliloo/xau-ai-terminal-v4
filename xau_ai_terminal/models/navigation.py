"""Navigation models."""

from dataclasses import dataclass


@dataclass(frozen=True)
class NavigationItem:
    key: str
    label: str
