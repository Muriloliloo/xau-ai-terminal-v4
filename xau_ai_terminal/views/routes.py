"""Stable route registry."""

from collections.abc import Callable
from typing import Final

from xau_ai_terminal.views.analytics import render as render_analytics
from xau_ai_terminal.views.dashboard import render as render_dashboard
from xau_ai_terminal.views.heatmap import render as render_heatmap
from xau_ai_terminal.views.history import render as render_history
from xau_ai_terminal.views.institutional import render as render_institutional
from xau_ai_terminal.views.settings import render as render_settings

ROUTES: Final[dict[str, Callable[[], None]]] = {
    "dashboard": render_dashboard,
    "institutional": render_institutional,
    "heatmap": render_heatmap,
    "analytics": render_analytics,
    "history": render_history,
    "settings": render_settings,
}
