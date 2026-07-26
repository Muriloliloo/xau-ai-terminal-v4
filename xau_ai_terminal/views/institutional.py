import logging

import streamlit as st

from backend.config import SAMPLE_CSV_PATH
from backend.services.institutional_analysis_service import analyze_options
from xau_ai_terminal.constants import TEXTS
from xau_ai_terminal.models.ui import MetricItem
from xau_ai_terminal.ui.cards import render_success_card
from xau_ai_terminal.ui.metrics import render_metric_row
from xau_ai_terminal.ui.tables import render_table
from xau_ai_terminal.utils.formatting import format_decimal, format_percentage

LOGGER = logging.getLogger(__name__)


def render() -> None:
    st.title(TEXTS.institutional_title)
    st.caption(TEXTS.institutional_caption)

    uploaded = st.file_uploader(TEXTS.upload_label, type=["csv"])
    use_sample = st.button(TEXTS.sample_button)

    if uploaded is None and not use_sample:
        return

    try:
        analysis = analyze_options(uploaded if uploaded is not None else SAMPLE_CSV_PATH)
        render_success_card(TEXTS.csv_loaded.format(rows=analysis.row_count))

        render_metric_row(
            (
                MetricItem(TEXTS.metric_call_wall, analysis.summary.call_wall),
                MetricItem(TEXTS.metric_put_wall, analysis.summary.put_wall),
                MetricItem(TEXTS.metric_gamma_flip, analysis.summary.gamma_flip),
                MetricItem(TEXTS.metric_gamma_magnet, analysis.summary.gamma_magnet),
            )
        )
        render_metric_row(
            (
                MetricItem(TEXTS.metric_total_gex, format_decimal(analysis.summary.total_gex)),
                MetricItem(TEXTS.metric_regime, analysis.dealer.regime),
                MetricItem(TEXTS.metric_confidence, format_percentage(analysis.dealer.confidence)),
            )
        )

        st.subheader(TEXTS.automatic_reading)
        st.write(analysis.commentary)
        st.info(analysis.decision)

        st.subheader(TEXTS.gex_by_strike)
        render_table(analysis.by_strike)

        st.subheader(TEXTS.imported_data)
        render_table(analysis.options)
    except (FileNotFoundError, TypeError, ValueError) as error:
        st.error(str(error))
    except Exception:
        LOGGER.exception("Unexpected institutional analysis failure")
        st.error(TEXTS.unexpected_error)
