"""Application style bootstrap."""

import streamlit as st

from xau_ai_terminal.constants import GLOBAL_STYLES


def apply_global_styles() -> None:
    st.markdown(GLOBAL_STYLES, unsafe_allow_html=True)
