"""Reusable dataframe tables."""

import pandas as pd
import streamlit as st


def render_table(dataframe: pd.DataFrame) -> None:
    st.dataframe(dataframe, width="stretch", hide_index=True)
