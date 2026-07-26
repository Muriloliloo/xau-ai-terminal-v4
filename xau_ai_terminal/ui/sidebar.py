"""Central application sidebar."""

import streamlit as st

from xau_ai_terminal.constants import NAVIGATION_ITEMS, TEXTS, VERSION


def render_sidebar() -> str:
    st.sidebar.title(TEXTS.sidebar_title)
    st.sidebar.caption(TEXTS.sidebar_version.format(version=VERSION))

    labels = tuple(item.label for item in NAVIGATION_ITEMS)
    selected_label = st.sidebar.radio(TEXTS.navigation_label, labels)
    return next(item.key for item in NAVIGATION_ITEMS if item.label == selected_label)
