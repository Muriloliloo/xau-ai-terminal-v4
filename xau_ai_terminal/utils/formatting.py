"""Formatting helpers shared by views."""


def format_decimal(value: float | None, decimals: int = 2) -> str:
    if value is None:
        return "—"
    return f"{value:,.{decimals}f}"


def format_percentage(value: float, decimals: int = 1) -> str:
    return f"{value:.{decimals}f}%"
