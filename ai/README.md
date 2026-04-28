# Recommender Service

A lightweight FastAPI service that wraps a trained logistic regression model to predict the probability that a user will reorder a given product. The Django backend uses these scores to surface personalised product recommendations.

## How it Works

1. The Django backend collects per-user and per-product statistics from the database (order history, reorder rates, category, etc.).
2. It sends those features to this service as a batch via `POST /score`.
3. The service runs them through a trained sklearn Pipeline and returns a reorder probability (0–1) for each product.
4. Django ranks products by that score, applies any additional filters (e.g. allergens, availability), and returns the top results to the frontend.

## Model

- **Type**: Logistic Regression (scikit-learn Pipeline with preprocessing)
- **Task**: Binary classification — will this user reorder this product?
- **Artifact**: `artifacts/reorder_model.joblib`
- **Trained in**: `AdvancedAIProject/LogModel/`

### Features

| Feature | Type | Description |
|---|---|---|
| `user_total_orders` | float | Total number of orders the user has placed |
| `product_total_purchases` | float | Total times this product has been bought across all users |
| `product_reorder_rate` | float | Fraction of purchases of this product that were reorders (0–1) |
| `user_product_purchase_count` | float | How many times this specific user has bought this product |
| `days_since_last_purchase` | float | Days since the user last ordered this product (default: 365) |
| `organic_preference` | float | User's tendency to buy organic products (0–1, default: 0) |
| `category` | string | Product category (e.g. `"dairy"`, `"bakery"`) — lowercased automatically |

## API

### `GET /health`

Liveness check.

```json
{ "status": "ok" }
```

### `POST /score`

Score a batch of product–user feature rows.

**Request**
```json
{
  "rows": [
    {
      "product_id": 1,
      "user_total_orders": 12,
      "product_total_purchases": 340,
      "product_reorder_rate": 0.72,
      "user_product_purchase_count": 4,
      "days_since_last_purchase": 14,
      "organic_preference": 0.3,
      "category": "dairy"
    }
  ]
}
```

**Response**
```json
{
  "scores": [
    { "product_id": 1, "reorder_probability": 0.847 }
  ]
}
```

## Updating the Model

If the model is retrained:
(TODO: implement easy file upload on admin dashboard or similar)

1. Copy the new `reorder_model.joblib` into `recommender/artifacts/`.
2. Rebuild and restart the container:
   ```bash
   docker-compose up --build recommender
   ```
3. Verify with `GET /health` and a test `POST /score` request.
