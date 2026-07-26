from pathlib import Path

from streamlit.testing.v1 import AppTest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
APP_PATH = PROJECT_ROOT / "app.py"

PAGE_LABELS = (
    "🏠 Dashboard",
    "🏛️ Institucional",
    "🔥 Heatmap",
    "📊 Analytics",
    "📅 Histórico",
    "⚙️ Configurações",
)


def test_all_pages_render_without_exceptions(monkeypatch, tmp_path):
    monkeypatch.setenv("XAU_DATABASE_PATH", str(tmp_path / "application.db"))
    app = AppTest.from_file(str(APP_PATH), default_timeout=20).run()

    assert not app.exception
    assert app.title[0].value == "🧠 XAU AI TERMINAL V3"
    assert [metric.label for metric in app.metric] == [
        "Ativo",
        "Market Brain",
        "Institutional Brain",
        "Status",
    ]

    expected_titles = {
        "🏛️ Institucional": "🏛️ Cérebro Institucional",
        "🔥 Heatmap": "🔥 Heatmap de Gamma",
        "📊 Analytics": "📊 Analytics",
        "📅 Histórico": "📅 Histórico Institucional",
        "⚙️ Configurações": "⚙️ Configurações",
    }
    for label in PAGE_LABELS[1:]:
        app.sidebar.radio[0].set_value(label).run()
        assert not app.exception, label
        assert app.title[0].value == expected_titles[label]


def test_sample_analysis_renders_without_exceptions(monkeypatch, tmp_path):
    monkeypatch.setenv("XAU_DATABASE_PATH", str(tmp_path / "application.db"))
    app = AppTest.from_file(str(APP_PATH), default_timeout=20).run()
    app.sidebar.radio[0].set_value("🏛️ Institucional").run()
    app.button[0].click().run()

    assert not app.exception
    assert app.success[0].value == "CSV carregado: 16 linhas válidas."
    assert [metric.value for metric in app.metric] == [
        "4100.0",
        "4000.0",
        "4050.0",
        "4100.0",
        "484.40",
        "LONG GAMMA",
        "60.5%",
    ]
    assert len(app.dataframe) == 2
