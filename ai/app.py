import base64
import shutil
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from product_analysis import analyze_product
from recommender import ScoreRequest, ScoreResponse, score_products

app = FastAPI(title="BRFN AI Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def file_to_base64(path: str | Path) -> str | None:
    file_path = Path(path)
    if not file_path.exists() or not file_path.is_file():
        return None

    with file_path.open("rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
def score(payload: ScoreRequest) -> ScoreResponse:
    return score_products(payload)


@app.post("/freshness/analyze")
def analyze_freshness(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    suffix = Path(file.filename or "upload.jpg").suffix or ".jpg"
    temp_root = Path(tempfile.mkdtemp(prefix="brfn_ai_"))
    image_path = temp_root / f"input{suffix}"
    output_dir = temp_root / "outputs"

    try:
        with image_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = analyze_product(
            image_path=image_path,
            checkpoint_path=Path(__file__).parent / "artifacts" / "FoodModel_1.pth",
            output_dir=output_dir,
        )

        freshness = result.get("freshness_evaluation", {})
        defects = result.get("defect_detection", {})
        quality = result.get("quality_inspection", {})
        quality_assessment = quality.get("quality_assessment", {})
        features = quality.get("features", {})

        analysis_summary = {
            "freshness_prediction": freshness.get("freshness_prediction"),
            "freshness_confidence": freshness.get("freshness_confidence"),
            "class_probabilities": freshness.get("class_probabilities", {}),
            "quality_score": quality_assessment.get("quality_score"),
            "quality_grade": quality_assessment.get("quality_grade"),
            "quality_label": quality_assessment.get("quality_label"),
            "deductions": quality_assessment.get("deductions", []),
            "interpretation": quality_assessment.get("interpretation"),
            "metrics": {
                "dark_ratio": features.get("dark_ratio"),
                "brown_ratio": features.get("brown_ratio"),
                "solidity": features.get("solidity"),
                "circularity": features.get("circularity"),
                "laplacian_var": features.get("laplacian_var"),
                "gray_std": features.get("gray_std"),
            },
            "defect_summary": {
                "mean_abs_shap": defects.get("mean_abs_shap"),
                "max_abs_shap": defects.get("max_abs_shap"),
                "defect_area_ratio": defects.get("defect_area_ratio"),
            },
        }

        return {
            "analysis_summary": analysis_summary,
            "shap_explanation_base64": file_to_base64(defects.get("shap_plot_path", "")),
        }

    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Freshness analysis failed: {exc}") from exc
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)