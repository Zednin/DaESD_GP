# DaESD Group Project
UFCFTR-30-3 - Distributed and enterprise software development 

# Project Overview
This project demonstrates a fictional implementation for the Bristol Regional Food Network (BRFN).

The platform was developed as part of the UFCFTR-30-3 Distributed and Enterprise Software Development module and showcases a distributed full-stack application built using Django REST Framework, React, PostgreSQL, Docker, and an AI microservice.

The application simulates a sustainable regional food marketplace where producers, restaurants, and community organisations can interact through product listings, ordering systems, recommendations, and sustainability-focused tooling.




## Group Members
| Name | Student ID | Email |
|-------|-------|-------|
| Harrison Mann | 23036387 | Harrison2.Mann@live.uwe.ac.uk |
| Matt Nogodula | 23025215 | Matt2.Nogodula@live.uwe.ac.uk |
| Dylan Jones | 22024323 | Dylan10.Jones@live.uwe.ac.uk |
| Josh Okanlawon | 23039392 | Joshua2.Okanlawon@live.uwe.ac.uk |
| Sam Waxman | 23023667 | Samuel2.Waxman@live.uwe.ac.uk |


# Screenshots
<p align="center">
  <img src="screenshots/homepage.png" width="890", height="500"/>
</p>

<details>
<summary>Public Pages</summary>

<br>

<p align="center">
  <img src="screenshots/homepage.png" height="250">
  <img src="screenshots/homepage_darkmode.png" height="250">
</p>

<p align="center">
  <img src="screenshots/about_us.png" height="250">
  <img src="screenshots/content.png" height="250">
</p>

<p align="center">
  <img src="screenshots/farmstories.png" height="250">
  <img src="screenshots/faq.png" height="250">
</p>

</details>

---

<details>
<summary>Shopping Experience</summary>

<br>

<p align="center">
  <img src="screenshots/products_page.png" height="250">
  <img src="screenshots/filter_products.png" height="250">
</p>

<p align="center">
  <img src="screenshots/basket1.png" height="250">
  <img src="screenshots/basket2.png" height="250">
</p>

<p align="center">
  <img src="screenshots/order_history.png" height="250">
  <img src="screenshots/stripe.png" height="250">
</p>

<p align="center">
  <img src="screenshots/sale_ribs.png" height="250">
  <img src="screenshots/bbq_rib_recipe.png" height="250">
</p>

</details>

---

<details>
<summary>Producer Dashboard</summary>

<br>

<p align="center">
  <img src="screenshots/producer_dashboard.png" height="250">
  <img src="screenshots/producer_dashboard_orders.png" height="250">
</p>

<p align="center">
  <img src="screenshots/producer_dashboard_orders_2.png" height="250">
  <img src="screenshots/producer_dashboard_payments.png" height="250">
</p>

<p align="center">
  <img src="screenshots/producer_dashboard_products.png" height="250">
  <img src="screenshots/producer_dashboard_surplus.png" height="250">
</p>

<p align="center">
  <img src="screenshots/producer_finance_report.png" height="250">
</p>

</details>

---

<details>
<summary>Admin Dashboard</summary>

<br>

<p align="center">
  <img src="screenshots/admin_overview.png" height="250">
  <img src="screenshots/admin_orders.png" height="250">
</p>

<p align="center">
  <img src="screenshots/admin_producers.png" height="250">
  <img src="screenshots/admin_users.png" height="250">
</p>

<p align="center">
  <img src="screenshots/admin_commission.png" height="250">
  <img src="screenshots/admin_surplus.png" height="250">
</p>

<p align="center">
  <img src="screenshots/admin_settings.png" height="250">
</p>

</details>

---

<details>
<summary>AI & Sustainability Features</summary>

<br>

<p align="center">
  <img src="screenshots/ai1.png" height="250">
  <img src="screenshots/ai2.png" height="250">
</p>

<p align="center">
  <img src="screenshots/food_miles.png" height="250">
  <img src="screenshots/compare_food_miles.png" height="250">
</p>

</details>

---

<details>
<summary>Reviews & Notifications</summary>

<br>

<p align="center">
  <img src="screenshots/review_make.png" height="250">
  <img src="screenshots/review_published.png" height="250">
</p>

<p align="center">
  <img src="screenshots/notification.png" height="250">
  <img src="screenshots/settings.png" height="250">
</p>

</details>

---

<details>
<summary>Surplus Deals</summary>

<br>

<p align="center">
  <img src="screenshots/surplus_deals.png" height="250">
  <img src="screenshots/surplus_more.png" height="250">
</p>

</details>



## Tech Stack
 - Backend: Django, Django REST FRAMEWORK
 - Frontend: React, Vite
 - Database: PostgreSQL 16
 - AI Service: Python, Uvicorn
 - Containers: Docker, Docker Compose



# Architecture:

```text
React Frontend (Vite)
        │
        ▼
Django REST API
        │
 ┌──────┴──────┐
 ▼             ▼
PostgreSQL     AI Service
```

# Services
|Service|Responsibility|
|-------|-------|
|Frontend|User interface and client-side functionality|
|Backend|REST API, authentication, business logic|
|Database|Persistent PostgreSQL storage|
|AI Service|Product analysis and recommendation processing|


# Software Features
*Pending*

# Authentication and Security

The application uses Django session-based authentication with CSRF protection.

Authentication is handled using secure backend-managed session cookies rather than browser-stored bearer tokens.

The frontend communicates with the backend using Axios with:

```js
withCredentials: true
```

This allows authentication cookies to be automatically included with requests.

For state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`), the frontend attaches the Django CSRF token through the `X-CSRFToken` header.

The backend uses:

- `SessionAuthentication`
- `TokenAuthentication` (supported by DRF)
- Django CSRF middleware
- Secure cookie settings
- SameSite cookie policies

Protected frontend routes are implemented using:

- `RequireAuth`
- `RequireProducer`
- `RequireAdmin`
- `RequireGuest`

Actual access control is enforced server-side through Django REST Framework permissions.

### Important security settings include:
```
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
```

### In production, secure cookies can be enabled using environment variables:
```
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_SSL_REDIRECT=True
```



# Payments

Stripe integration is used for payment processing simulation.

To enable Stripe payments, configure the required Stripe API keys inside the [.env](.env) file.

# Media Storage

Cloudinary is used for media and image storage.

Configure Cloudinary credentials in the [.env](.env) file before running the project.






# Requirements
 - Docker
 - Docker Compose

# Running the Software
## Environment Variables Setup
Create a copy of [.env.example](.env.example) and frontend/[.env.local.example](.env.local.example) and fill in relevant information. Then remove the .example ending.

## Node Files
To create node modules from package.json run the following commands:
```bash
npm install
cd frontend
npm install
```

## Stripe Listener (API key is required for functionality)
Run the following command to begin the stripe payment listener:
```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook/
```

## Seed dataset
Run the following command to seed the dataset:
```bash
docker compose exec web python manage.py seed
```

To flush the dataset run the following command:
```bash
docker compose exec web python manage.py seed --flush
```

## Building the Project
### Build and start all services:
```bash
docker compose up --build
```

### To run in detached mode:
```bash
docker compose up -d --build
```

### To stop all containers:
```bash
docker compose down
```

### To stop all containers and remove database volume:
```bash
docker compose down -v
```

# Application URLs by default
### Frontend:
http://localhost:5173 
### Backend API:
http://localhost:8000
### AI Service:
http://localhost:5001
### AI Health Check:
http://localhost:5001/health


# Backend Setup
The backend runs inside of the `web` container.
### Run migrations:
```bash
docker compose exec web python manage.py migrate
```

### Create a superuser:
```bash
docker compose exec web python manage.py createsuperuser
```

### Access Django admin page:
http://localhost:8000/admin/



# Frontend Setup
The frontend uses Vite and runs inside of the `frontend` container.
Important frontend environment variables are configured inside of [docker-compose.yml](docker-compose.yml)

The frontend source code is mounted into the container, so changes in `frontend/src`should update during development.

# Backend Apps
### The Django backend includes apps for:
- Accounts
- Addresses
- Cart
- Catalog
- Communications
- Community
- Orders
- Payments
- Producers
- Sustainability
- Traceability
- API

# AI Service
The AI service is located in the ai/ directory and runs with Uvicorn on port 5000 inside the container.
It is exposed locally on:
http://localhost:5001

### The service includes:
- app.py
- recommender.py
- product_analysis.py
- feature_extract.py
- utils.py
- artifacts/

# Database
PostgreSQL data is stored in a Docker Volume:
`postgres_data`

The database container exposes PostgreSQL on local port 5433.
Connection details come from the [.env](.env) file (Once created).

# Useful Docker Commands:
View running containers:
```bash
docker compose ps
```

View logs:
```bash
docker compose logs
```

View backend logs:
```bash
docker compose logs web
```

View frontend logs:
```bash
docker compose logs frontend
```
View AI service logs:
```bash
docker compose logs ai
```

Open a shell in the backend container:
```bash
docker compose exec web sh
```

Open a shell in frontend container:
```bash
docker compose exec frontend sh
```

Open a shell in the AI container:
```bash
docker compose exec ai sh
```



# Troubleshooting

*Pending*






# License

This project was developed for educational purposes as part of the UFCFTR-30-3 module.


