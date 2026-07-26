import streamlit as st

from backend.database.repositories import load_institutional_history
from xau_ai_terminal.constants import TEXTS
from xau_ai_terminal.ui.tables import render_table


def render() -> None:
    st.title(TEXTS.history_title)
    render_table(load_institutional_history())
