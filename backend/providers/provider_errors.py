"""Stable provider errors safe for API responses."""

from __future__ import annotations


class ProviderError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        code: str = "provider_error",
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


class ProviderNotConfiguredError(ProviderError):
    def __init__(self, provider: str) -> None:
        super().__init__(
            f"{provider} não configurado.",
            code="provider_not_configured",
        )


class ProviderTimeoutError(ProviderError):
    def __init__(self, provider: str) -> None:
        super().__init__(
            f"{provider} não respondeu dentro do tempo limite.",
            code="provider_timeout",
            retryable=True,
        )


class ProviderRateLimitError(ProviderError):
    def __init__(self, provider: str) -> None:
        super().__init__(
            f"Limite de consultas do {provider} atingido.",
            code="provider_rate_limit",
            retryable=True,
        )


class ProviderResponseError(ProviderError):
    def __init__(self, provider: str) -> None:
        super().__init__(
            f"Resposta incompleta ou inválida do {provider}.",
            code="provider_invalid_response",
        )


class ProviderFeatureUnavailableError(ProviderError):
    def __init__(self) -> None:
        super().__init__(
            "Recurso não disponível no plano configurado.",
            code="provider_feature_unavailable",
        )
