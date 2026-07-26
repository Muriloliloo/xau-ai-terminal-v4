"""Central application constants, text catalog, colors, and styles."""

from dataclasses import dataclass
from typing import Final

from backend.constants import PROJECT_NAME as PROJECT_NAME
from backend.constants import VERSION as VERSION
from xau_ai_terminal.models.navigation import NavigationItem

PAGE_ICON: Final = "🧠"
ASSET_SYMBOL: Final = "XAUUSD"
DEFAULT_REFRESH_INTERVAL_MINUTES: Final = 5


@dataclass(frozen=True)
class ColorPalette:
    """Application color tokens."""

    gold: str = "#D4AF37"
    gold_soft: str = "#F1D675"
    background: str = "#0E1117"
    surface: str = "#171C24"
    border: str = "#2C3440"
    text: str = "#FAFAFA"
    muted: str = "#AAB2BF"
    positive: str = "#21C55D"
    negative: str = "#EF4444"


@dataclass(frozen=True)
class TextCatalog:
    """All user-facing text used by the current application."""

    sidebar_title: str = "🧠 XAU AI TERMINAL"
    sidebar_version: str = "Versão {version}"
    navigation_label: str = "Navegação"

    dashboard_nav: str = "🏠 Dashboard"
    institutional_nav: str = "🏛️ Institucional"
    heatmap_nav: str = "🔥 Heatmap"
    analytics_nav: str = "📊 Analytics"
    history_nav: str = "📅 Histórico"
    settings_nav: str = "⚙️ Configurações"

    dashboard_title: str = "🧠 XAU AI TERMINAL V3"
    dashboard_subtitle: str = "Institutional Edition"
    dashboard_info: str = "Abra a página Institucional para carregar o CSV e gerar a primeira leitura."
    metric_asset: str = "Ativo"
    metric_market_brain: str = "Market Brain"
    metric_institutional_brain: str = "Institutional Brain"
    metric_status: str = "Status"
    status_waiting: str = "Aguardando"
    status_operational: str = "Operacional"

    institutional_title: str = "🏛️ Cérebro Institucional"
    institutional_caption: str = "Carregue o CSV de opções para calcular GEX, paredes e regime dos dealers."
    upload_label: str = "Carregar CSV"
    sample_button: str = "📂 Usar CSV de demonstração"
    csv_loaded: str = "CSV carregado: {rows} linhas válidas."
    metric_call_wall: str = "📈 Call Wall"
    metric_put_wall: str = "📉 Put Wall"
    metric_gamma_flip: str = "⚖️ Gamma Flip"
    metric_gamma_magnet: str = "🧲 Gamma Magnet"
    metric_total_gex: str = "📊 GEX Total"
    metric_regime: str = "🏛️ Regime"
    metric_confidence: str = "🧠 Confiança"
    automatic_reading: str = "🤖 Leitura automática"
    gex_by_strike: str = "📈 GEX por Strike"
    imported_data: str = "📄 Dados importados"
    unexpected_error: str = "Não foi possível concluir a análise. Consulte os logs para detalhes."

    heatmap_title: str = "🔥 Heatmap de Gamma"
    heatmap_placeholder: str = "Módulo preparado para a próxima etapa."
    analytics_title: str = "📊 Analytics"
    analytics_placeholder: str = "Módulo preparado para métricas avançadas."
    history_title: str = "📅 Histórico Institucional"
    settings_title: str = "⚙️ Configurações"
    current_version: str = "Versão atual: {version}"
    automatic_update: str = "Atualização automática"
    refresh_interval: str = "Intervalo de atualização (minutos)"


COLORS: Final = ColorPalette()
TEXTS: Final = TextCatalog()

NAVIGATION_ITEMS: Final = (
    NavigationItem("dashboard", TEXTS.dashboard_nav),
    NavigationItem("institutional", TEXTS.institutional_nav),
    NavigationItem("heatmap", TEXTS.heatmap_nav),
    NavigationItem("analytics", TEXTS.analytics_nav),
    NavigationItem("history", TEXTS.history_nav),
    NavigationItem("settings", TEXTS.settings_nav),
)

GLOBAL_STYLES: Final = f"""
<style>
    :root {{
        --xau-gold: {COLORS.gold};
        --xau-gold-soft: {COLORS.gold_soft};
        --xau-surface: {COLORS.surface};
        --xau-border: {COLORS.border};
        --xau-muted: {COLORS.muted};
    }}

    div[data-testid="stMetric"] {{
        background: var(--xau-surface);
        border: 1px solid var(--xau-border);
        border-radius: 0.75rem;
        padding: 1rem;
    }}

    div[data-testid="stMetric"] label {{
        color: var(--xau-muted);
    }}

    div[data-testid="stMetricValue"] {{
        color: var(--xau-gold-soft);
    }}
</style>
"""
