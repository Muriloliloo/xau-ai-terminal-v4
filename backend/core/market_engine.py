def combine_market_and_institutional(market_signal: str, institutional_regime: str):
    market_signal = (market_signal or "NEUTRO").upper()
    institutional_regime = (institutional_regime or "NEUTRO").upper()
    aligned = market_signal in institutional_regime or market_signal == "NEUTRO"
    return {"aligned": aligned, "market_signal": market_signal, "institutional_regime": institutional_regime}
