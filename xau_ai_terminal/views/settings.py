import streamlit as st

from xau_ai_terminal.constants import DEFAULT_REFRESH_INTERVAL_MINUTES, TEXTS, VERSION


def render() -> None:
    st.title(TEXTS.settings_title)
    st.write(TEXTS.current_version.format(version=VERSION))
    st.toggle(TEXTS.automatic_update, value=False)
    st.number_input(
        TEXTS.refresh_interval,
        min_value=1,
        value=DEFAULT_REFRESH_INTERVAL_MINUTES,
    )
