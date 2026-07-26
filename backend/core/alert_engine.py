def build_alerts(summary, dealer):
    alerts = []
    if dealer["regime"] == "SHORT GAMMA":
        alerts.append("Atenção: regime Short Gamma pode ampliar a volatilidade.")
    if summary["Gamma Flip"] is not None:
        alerts.append(f"Nível de Gamma Flip: {summary['Gamma Flip']}")
    return alerts
