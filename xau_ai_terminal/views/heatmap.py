import streamlit as st

from xau_ai_terminal.constants import TEXTS
from xau_ai_terminal.ui.charts import render_chart_placeholder


def render() -> None:
    st.title(TEXTS.heatmap_title)
    render_chart_placeholder(TEXTS.heatmap_placeholder)
