def build_decision(dealer):
    regime = dealer.get("regime")
    if regime == "LONG GAMMA":
        return "Priorizar operações de reversão e evitar perseguir rompimentos sem confirmação."
    if regime == "SHORT GAMMA":
        return "Priorizar continuidade após rompimentos confirmados e usar controle de risco mais rígido."
    return "Aguardar melhor definição do posicionamento institucional."
