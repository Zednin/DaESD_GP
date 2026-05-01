from pathlib import Path

import joblib
import pandas as pd
from fastapi import HTTPException
from pydantic import BaseModel, Field

ARTIFACT_PATH = Path(__file__).parent / "artifacts" / "reorder_model.joblib"

FEATURE_COLUMNS = [
    "user_total_orders",
    "product_total_purchases",
    "product_reorder_rate",
    "user_product_purchase_count",
    "days_since_last_purchase",
    "organic_preference",
    "category",
]

_model = joblib.load(ARTIFACT_PATH)


class ScoreRow(BaseModel):
    product_id: int
    user_total_orders: float
    product_total_purchases: float
    product_reorder_rate: float
    user_product_purchase_count: float
    days_since_last_purchase: float = 365.0
    organic_preference: float = 0.0
    category: str


class ScoreRequest(BaseModel):
    rows: list[ScoreRow] = Field(..., min_length=1)


class ScoreResult(BaseModel):
    product_id: int
    reorder_probability: float


class ScoreResponse(BaseModel):
    scores: list[ScoreResult]


def score_products(payload: ScoreRequest) -> ScoreResponse:
    records = [row.model_dump() for row in payload.rows]
    df = pd.DataFrame.from_records(records)
    df["category"] = df["category"].str.lower()

    try:
        probabilities = _model.predict_proba(df[FEATURE_COLUMNS])[:, 1]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    results = [
        ScoreResult(product_id=int(row["product_id"]), reorder_probability=float(prob))
        for row, prob in zip(records, probabilities)
    ]
    return ScoreResponse(scores=results)