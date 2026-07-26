from io import BytesIO

import pytest

from backend.services.options_loader import load_options_csv


def test_loader_accepts_streamlit_compatible_file_objects():
    uploaded_file = BytesIO(
        b"strike,type,open_interest,volume\n"
        b"4000,CALL,10,5\n"
        b"4000,PUT,12,6\n"
    )
    uploaded_file.name = "options.csv"

    dataframe = load_options_csv(uploaded_file)

    assert len(dataframe) == 2
    assert dataframe["type"].tolist() == ["CALL", "PUT"]


@pytest.mark.parametrize(
    ("column", "value", "message"),
    [
        ("strike", 0, "strike deve conter apenas valores positivos"),
        ("open_interest", -1, "open_interest não pode conter valores negativos"),
        ("volume", -1, "volume não pode conter valores negativos"),
    ],
)
def test_loader_rejects_invalid_numeric_domains(column, value, message, tmp_path):
    row = {"strike": 4000, "type": "CALL", "open_interest": 10, "volume": 5}
    row[column] = value
    csv_path = tmp_path / "invalid.csv"
    csv_path.write_text(
        "strike,type,open_interest,volume\n"
        f"{row['strike']},{row['type']},{row['open_interest']},{row['volume']}\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match=message):
        load_options_csv(csv_path)
