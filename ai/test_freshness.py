import json
import base64
from pathlib import Path
import requests

url = "http://localhost:5001/freshness/analyze"

with open("ai/test_images/rotten_apple.jpg", "rb") as f:
    response = requests.post(
        url,
        files={"file": ("rotten_apple.jpg", f, "image/jpeg")}
    )

print("Status:", response.status_code)

data = response.json()

print(json.dumps(data["analysis_summary"], indent=2))

shap_b64 = data.get("shap_explanation_base64")
if shap_b64:
    Path("test_outputs").mkdir(exist_ok=True)
    with open("test_outputs/shap_explanation.png", "wb") as img_file:
        img_file.write(base64.b64decode(shap_b64))
    print("Saved SHAP image to test_outputs/shap_explanation.png")
else:
    print("No SHAP image returned")