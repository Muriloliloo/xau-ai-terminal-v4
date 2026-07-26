"""Reusable metric components."""

from collections.abc import Sequence

import streamlit as st

from xau_ai_terminal.models.ui import MetricItem


def render_metric_row(metrics: Sequence[MetricItem]) -> None:
    columns = st.columns(len(metrics))
    for column, metric in zip(columns, metrics, strict=True):
        column.metric(metric.label, metric.value, delta=metric.delta)
