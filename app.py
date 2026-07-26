import streamlit as st

from backend.database.connection import initialize_database
from xau_ai_terminal.constants import PAGE_ICON, PROJECT_NAME
from xau_ai_terminal.ui.sidebar import render_sidebar
from xau_ai_terminal.ui.styles import apply_global_styles
from xau_ai_terminal.views.routes import ROUTES

st.set_page_config(
    page_title=PROJECT_NAME,
    page_icon=PAGE_ICON,
    layout="wide",
    initial_sidebar_state="expanded",
)

apply_global_styles()
initialize_database()
ROUTES[render_sidebar()]()
