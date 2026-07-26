"""Reusable chart components."""

from typing import Any

import streamlit as st

from xau_ai_terminal.ui.cards import render_warning_card


def render_chart(figure: Any) -> None:
    st.plotly_chart(figure, width="stretch")


def render_chart_placeholder(message: str) -> None:
    render_warning_card(message)
