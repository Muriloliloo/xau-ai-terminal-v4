"""Validation, engine eligibility and spot-alignment rules for CME bulletins."""

from __future__ import annotations

from datetime import UTC, date, datetime

from backend.schemas.cme_bulletin import (
    CmeBulletinMetadata,
    CmeEligibilityReport,
    CmeSpotAlignment,
    CmeValidationIssue,
    CmeValidationReport,
)
from backend.services.cme_bulletin_parser import (
    CmeBulletinParser,
    ParsedCmeBulletin,
)

GAMMA_MISSING_WARNING = "CME Bulletin importado, porém Gamma ausente."
LEGAL_NOTICE = (
    "Este importador processa somente arquivos fornecidos manualmente pelo "
    "usuário. O uso, armazenamento, processamento e distribuição dos dados "
    "deve respeitar os termos e licenças aplicáveis da CME Group."
)


def align_spot(
    bulletin_date: date | None,
    spot_timestamp: datetime | None,
) -> CmeSpotAlignment:
    if bulletin_date is None or spot_timestamp is None:
        return CmeSpotAlignment(
            status="unavailable",
            bulletin_date=bulletin_date,
            spot_timestamp=spot_timestamp,
            warning="Spot compatível não foi fornecido para alinhamento.",
        )
    normalized_spot = spot_timestamp.replace(
        tzinfo=spot_timestamp.tzinfo or UTC
    ).astimezone(UTC)
    difference = abs((normalized_spot.date() - bulletin_date).days)
    if difference == 0:
        status = "aligned"
        warning = None
    elif difference == 1:
        status = "acceptable_with_warning"
        warning = "Spot e boletim pertencem a fechamentos adjacentes."
    elif difference <= 3:
        status = "stale"
        warning = "Spot desatualizado em relação à data do boletim."
    else:
        status = "incompatible"
        warning = "Spot incompatível com a data do boletim."
    return CmeSpotAlignment(
        status=status,
        bulletin_date=bulletin_date,
        spot_timestamp=normalized_spot,
        date_difference_days=difference,
        warning=warning,
    )


class CmeBulletinValidator:
    def validate(
        self,
        parsed: ParsedCmeBulletin,
    ) -> CmeValidationReport:
        contracts = parsed.contracts
        invalid_strikes = sum(contract.strike <= 0 for contract in contracts)
        invalid_oi = sum(
            contract.open_interest is not None
            and contract.open_interest < 0
            for contract in contracts
        )
        invalid_volume = sum(
            contract.volume is not None and contract.volume < 0
            for contract in contracts
        )
        duplicate_count = CmeBulletinParser.duplicate_count(contracts)
        calls = sum(contract.option_type == "CALL" for contract in contracts)
        puts = sum(contract.option_type == "PUT" for contract in contracts)
        missing_expiration = sum(
            contract.expiration is None for contract in contracts
        )
        partial_contracts = sum(
            any(
                value is None
                for value in (
                    contract.expiration,
                    contract.settlement,
                    contract.volume,
                    contract.open_interest,
                )
            )
            for contract in contracts
        )
        issues: list[CmeValidationIssue] = []
        for contract in contracts:
            if contract.strike <= 0:
                issues.append(
                    CmeValidationIssue(
                        page=contract.source_page,
                        line=contract.source_line,
                        field="strike",
                        message="Strike deve ser maior que zero.",
                    )
                )
            if contract.open_interest is not None and contract.open_interest < 0:
                issues.append(
                    CmeValidationIssue(
                        page=contract.source_page,
                        line=contract.source_line,
                        field="open_interest",
                        message="Open Interest não pode ser negativo.",
                    )
                )
            if contract.volume is not None and contract.volume < 0:
                issues.append(
                    CmeValidationIssue(
                        page=contract.source_page,
                        line=contract.source_line,
                        field="volume",
                        message="Volume não pode ser negativo.",
                    )
                )
        blocking_errors: list[str] = []
        gamma_values = [contract.gamma for contract in contracts]
        iv_values = [contract.implied_volatility for contract in contracts]
        spot_values = [contract.underlying_price for contract in contracts]
        warnings: list[str] = []
        if not gamma_values or all(value is None for value in gamma_values):
            warnings.append(GAMMA_MISSING_WARNING)
        elif any(value is None for value in gamma_values):
            warnings.append("Gamma está disponível apenas em parte dos contratos.")
        if not iv_values or all(value is None for value in iv_values):
            warnings.append("IV não consta nos blocos analisados.")
        elif any(value is None for value in iv_values):
            warnings.append("IV está disponível apenas em parte dos contratos.")
        if not spot_values or all(value is None for value in spot_values):
            warnings.append("Preço spot não consta nos blocos analisados.")
        elif any(value is None for value in spot_values):
            warnings.append("Preço spot está disponível apenas em parte dos contratos.")
        warnings.append("Dados de fechamento diário; não são tempo real nem intradiários.")

        if not contracts:
            blocking_errors.append(
                "Nenhum contrato de ouro com CALL/PUT explícito foi encontrado."
            )
        if contracts and not calls:
            blocking_errors.append("Nenhuma CALL de ouro foi encontrada.")
        if contracts and not puts:
            blocking_errors.append("Nenhuma PUT de ouro foi encontrada.")
        if parsed.failed_pages:
            warnings.append(
                "Falha de extração nas páginas: "
                + ", ".join(str(page) for page in parsed.failed_pages)
                + "."
            )
        if parsed.bulletin_date is None:
            warnings.append("Data do boletim não identificada.")
        if parsed.unresolved_expiration_labels:
            warnings.append(
                "Data exata de vencimento ausente para: "
                + ", ".join(parsed.unresolved_expiration_labels)
                + "."
            )
        if duplicate_count:
            warnings.append(
                f"{duplicate_count} contrato(s) duplicado(s) detectado(s)."
            )
        if invalid_strikes or invalid_oi or invalid_volume:
            blocking_errors.append(
                "O boletim contém valores críticos inválidos."
            )

        if blocking_errors and contracts:
            status = "incompatible"
        elif blocking_errors:
            status = "rejected"
        elif partial_contracts or parsed.failed_pages or missing_expiration:
            # A row with absent settlement/OI/volume/expiration is usable for
            # audit but cannot be considered a complete bulletin import.
            status = "partial"
        elif warnings:
            # Gamma/IV/spot are legitimately absent from CME Section 64.  A
            # complete set of rows with those documented limitations is still
            # a valid import with warnings.
            status = "valid_with_warnings"
        else:
            status = "valid"

        # Report a field only when it is absent from every parsed contract;
        # this avoids claiming that a partially populated field is wholly
        # unavailable while retaining explicit partial markers below.
        missing_fields = [
            field
            for field, values in (
                ("gamma", [contract.gamma for contract in contracts]),
                (
                    "implied_volatility",
                    [contract.implied_volatility for contract in contracts],
                ),
                (
                    "underlying_price",
                    [contract.underlying_price for contract in contracts],
                ),
            )
            if not values or all(value is None for value in values)
        ]
        if any(contract.volume is None for contract in contracts):
            missing_fields.append("volume_partial")
        if any(contract.open_interest is None for contract in contracts):
            missing_fields.append("open_interest_partial")
        if missing_expiration:
            missing_fields.append("expiration_partial")

        return CmeValidationReport(
            status=status,
            pages_total=parsed.pages_total,
            pages_processed=parsed.pages_processed,
            gold_pages=list(parsed.gold_pages),
            blocks_found=len(parsed.product_blocks),
            product_codes=sorted(
                {
                    f"{code} {option_type}"
                    for code, option_type in parsed.product_blocks
                }
            ),
            calls_found=calls,
            puts_found=puts,
            expiration_labels=list(parsed.expiration_labels),
            expirations_found=sorted(
                {
                    contract.expiration
                    for contract in contracts
                    if contract.expiration is not None
                }
            ),
            # A single malformed row may violate more than one field.  Count
            # rows, not violations, so this metric remains non-negative and
            # accurately describes usable contracts.
            valid_contracts=max(
                0,
                len(contracts)
                - sum(
                    any(
                        (
                            contract.strike <= 0,
                            contract.open_interest is not None
                            and contract.open_interest < 0,
                            contract.volume is not None and contract.volume < 0,
                        )
                    )
                    for contract in contracts
                ),
            ),
            partial_contracts=partial_contracts,
            ignored_lines=parsed.ignored_lines,
            duplicates=duplicate_count,
            invalid_strikes=invalid_strikes,
            invalid_open_interest=invalid_oi,
            invalid_volume=invalid_volume,
            missing_expiration=missing_expiration,
            missing_critical_fields=missing_fields,
            failed_pages=list(parsed.failed_pages),
            warnings=warnings,
            blocking_errors=blocking_errors,
            issues=issues,
        )

    def eligibility(
        self,
        parsed: ParsedCmeBulletin,
        report: CmeValidationReport,
        spot_alignment: CmeSpotAlignment,
    ) -> CmeEligibilityReport:
        contracts = parsed.contracts
        calls_with_oi = sum(
            contract.option_type == "CALL"
            and contract.open_interest is not None
            for contract in contracts
        )
        puts_with_oi = sum(
            contract.option_type == "PUT"
            and contract.open_interest is not None
            for contract in contracts
        )
        with_oi = calls_with_oi + puts_with_oi
        with_volume = sum(
            contract.volume is not None for contract in contracts
        )
        with_gamma = sum(
            contract.gamma is not None for contract in contracts
        )
        with_expiration = sum(
            contract.expiration is not None for contract in contracts
        )
        compatible_spot = spot_alignment.status in {
            "aligned",
            "acceptable_with_warning",
        }

        if report.status in {"rejected", "incompatible"}:
            status = "blocked"
            reason = "A validação possui erros bloqueantes."
            engines: list[str] = []
        elif with_oi and calls_with_oi and puts_with_oi and not with_gamma:
            status = "open_interest_only"
            reason = (
                "Open Interest disponível para Calls e Puts; Gamma ausente "
                "bloqueia Gamma/GEX e análise institucional completa."
            )
            engines = ["open_interest"]
        elif contracts:
            status = "partial_analysis_allowed"
            reason = (
                "Contratos parciais disponíveis, mas não há campos suficientes "
                "para os engines institucionais."
            )
            engines = []
        else:
            status = "blocked"
            reason = "Não há contratos suficientes."
            engines = []

        return CmeEligibilityReport(
            status=status,
            reason=reason,
            engines_allowed=engines,
            contracts_with_open_interest=with_oi,
            contracts_with_volume=with_volume,
            contracts_with_gamma=with_gamma,
            contracts_with_expiration=with_expiration,
            has_calls=calls_with_oi > 0,
            has_puts=puts_with_oi > 0,
            has_compatible_spot=compatible_spot,
        )

    def metadata(
        self,
        parsed: ParsedCmeBulletin,
        report: CmeValidationReport,
        *,
        retrieved_at: datetime,
    ) -> CmeBulletinMetadata:
        market_timestamp = (
            datetime.combine(parsed.bulletin_date, datetime.min.time(), UTC)
            if parsed.bulletin_date
            else None
        )
        warnings = list(report.warnings)
        warnings.append(
            "market_timestamp representa somente a data do boletim; "
            "o PDF não informa horário de mercado."
        )
        return CmeBulletinMetadata(
            is_partial=report.status in {"partial", "incompatible", "rejected"},
            bulletin_date=parsed.bulletin_date,
            market_timestamp=market_timestamp,
            retrieved_at=retrieved_at,
            warnings=warnings,
            missing_fields=report.missing_critical_fields,
        )
