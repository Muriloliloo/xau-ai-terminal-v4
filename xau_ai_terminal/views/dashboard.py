import streamlit as st

from xau_ai_terminal.constants import ASSET_SYMBOL, TEXTS
from xau_ai_terminal.models.ui import MetricItem
from xau_ai_terminal.ui.cards import render_info_card
from xau_ai_terminal.ui.metrics import render_metric_row


def render() -> None:
    st.title(TEXTS.dashboard_title)
    st.subheader(TEXTS.dashboard_subtitle)
    render_info_card(TEXTS.dashboard_info)

    render_metric_row(
        (
            MetricItem(TEXTS.metric_asset, ASSET_SYMBOL),
            MetricItem(TEXTS.metric_market_brain, TEXTS.status_waiting),
            MetricItem(TEXTS.metric_institutional_brain, TEXTS.status_waiting),
            MetricItem(TEXTS.metric_status, TEXTS.status_operational),
        )
    )
