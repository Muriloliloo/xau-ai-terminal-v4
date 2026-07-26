"""Reusable status-card components."""

import streamlit as st


def render_info_card(message: str) -> None:
    st.info(message)


def render_success_card(message: str) -> None:
    st.success(message)


def render_warning_card(message: str) -> None:
    st.warning(message)
