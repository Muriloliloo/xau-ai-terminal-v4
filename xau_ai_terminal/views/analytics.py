import streamlit as st

from xau_ai_terminal.constants import TEXTS
from xau_ai_terminal.ui.cards import render_warning_card


def render() -> None:
    st.title(TEXTS.analytics_title)
    render_warning_card(TEXTS.analytics_placeholder)
