"""CSV adapter for option-chain data."""

import os
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ALIASES = {
    "option_type": "type",
    "tipo": "type",
    "right": "type",
    "oi": "open_interest",
    "openinterest": "open_interest",
    "previous_oi": "previous_open_interest",
    "prior_open_interest": "previous_open_interest",
    "vol": "volume",
    "implied_volatility": "iv",
}

REQUIRED_COLUMNS = ("strike", "type", "open_interest", "volume")
NUMERIC_COLUMNS = (
    "strike",
    "open_interest",
    "previous_open_interest",
    "volume",
    "iv",
    "gamma",
    "days_to_expiry",
    "aggressor",
)


def _prepare_csv_source(source: Any) -> Any:
    if isinstance(source, (str, os.PathLike)):
        path = Path(source)
        if not path.exists():
            raise FileNotFoundError(f"Arquivo CSV não encontrado: {path}")
        return path

    if hasattr(source, "read"):
        if hasattr(source, "seek"):
            source.seek(0)
        return source

    raise TypeError("A fonte do CSV deve ser um caminho ou um objeto de arquivo.")


def _validate_numeric_domain(dataframe: pd.DataFrame) -> None:
    for column in ("strike", "open_interest", "volume"):
        values = dataframe[column].to_numpy(dtype=float)
        if not np.isfinite(values).all():
            raise ValueError(f"A coluna {column} contém valores não finitos.")

    if (dataframe["strike"] <= 0).any():
        raise ValueError("A coluna strike deve conter apenas valores positivos.")
    if (dataframe["open_interest"] < 0).any():
        raise ValueError("A coluna open_interest não pode conter valores negativos.")
    if (dataframe["volume"] < 0).any():
        raise ValueError("A coluna volume não pode conter valores negativos.")
    if (
        "previous_open_interest" in dataframe.columns
        and (dataframe["previous_open_interest"].dropna() < 0).any()
    ):
        raise ValueError(
            "A coluna previous_open_interest não pode conter valores negativos."
        )


def load_options_csv(source: Any) -> pd.DataFrame:
    dataframe = pd.read_csv(_prepare_csv_source(source))
    dataframe.columns = (
        dataframe.columns.str.strip()
        .str.lower()
        .str.replace(" ", "_", regex=False)
        .str.replace("-", "_", regex=False)
    )
    dataframe = dataframe.rename(columns=ALIASES)

    missing = [column for column in REQUIRED_COLUMNS if column not in dataframe.columns]
    if missing:
        raise ValueError("Colunas obrigatórias ausentes: " + ", ".join(missing))

    dataframe["type"] = (
        dataframe["type"]
        .astype(str)
        .str.strip()
        .str.upper()
        .replace({"C": "CALL", "CALLS": "CALL", "P": "PUT", "PUTS": "PUT"})
    )

    for column in NUMERIC_COLUMNS:
        if column in dataframe.columns:
            dataframe[column] = pd.to_numeric(dataframe[column], errors="coerce")

    dataframe = dataframe.dropna(subset=list(REQUIRED_COLUMNS))
    invalid_types = ~dataframe["type"].isin(["CALL", "PUT"])
    if invalid_types.any():
        invalid = sorted(dataframe.loc[invalid_types, "type"].astype(str).unique())
        raise ValueError("Tipos inválidos: " + ", ".join(invalid))
    if dataframe.empty:
        raise ValueError("O CSV não possui linhas válidas para análise.")

    _validate_numeric_domain(dataframe)
    return dataframe.reset_index(drop=True)
