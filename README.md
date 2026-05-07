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

# Table of Contents

- [Project Overview](#project-overview)
- [Group Members](#group-members)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Services](#services)
- [Software Features](#software-features)
- [Authentication and Security](#authentication-and-security)
- [Payments](#payments)
- [Media Storage](#media-storage)
- [Requirements](#requirements)
- [Running the Software](#running-the-software)
  - [Environment Variables Setup](#environment-variables-setup)
  - [Node Files](#node-files)
  - [Stripe Listener](#stripe-listener-api-key-is-required-for-functionality)
  - [Seed Dataset](#seed-dataset)
  - [Building the Project](#building-the-project)
- [Application URLs](#application-urls-by-default)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Backend Apps](#backend-apps)
- [AI Service](#ai-service)
- [Database](#database)
- [Useful Docker Commands](#useful-docker-commands)
- [Troubleshooting](#troubleshooting)
- [Project Management](#project-management)
- [License](#license)


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

The platform offers a comprehensive suite of features designed to facilitate sustainable food commerce between producers, consumers, and community organizations. Key functionalities include:

### For Consumers
- **Product Browsing and Filtering**: Browse a catalog of regional food products with advanced filters (e.g., by category, price, sustainability metrics, and location).
- **Shopping Cart and Checkout**: Add items to a cart, manage quantities, and complete secure purchases via integrated payment processing.
- **AI-Powered Recommendations**: Receive personalized product suggestions based on user preferences, purchase history, and AI-driven analysis of product features.
- **Order Tracking and History**: View real-time order status, delivery updates, and past purchases.
- **Sustainability Tools**: Calculate and compare food miles for products to promote environmentally friendly choices.
- **Reviews and Community Engagement**: Leave product reviews, participate in community forums, and receive notifications for updates or promotions.
- **Surplus Deals**: Access discounted surplus products to reduce food waste.

### For Producers
- **Dashboard Management**: Manage product listings, inventory, orders, and financial reports.
- **Surplus Management**: List surplus items for quick sales and track sustainability metrics.
- **Order Fulfillment**: Process incoming orders, update statuses, and handle payments.
- **Analytics and Reporting**: Generate finance reports and insights on sales performance.

### For Administrators
- **System Oversight**: Monitor users, producers, orders, and platform settings via a dedicated admin dashboard.
- **Commission Management**: Set and track platform commissions on transactions.
- **User and Producer Management**: Approve accounts, manage permissions, and oversee community content.
- **Sustainability Monitoring**: Track overall platform sustainability metrics, including surplus utilization and food miles.

### Additional Platform-Wide Features
- **Authentication and Security**: Secure user registration, login, and role-based access control (consumers, producers, admins).
- **Media Management**: Upload and store product images via cloud-based storage.
- **Notifications**: Real-time alerts for order updates, promotions, and community interactions.
- **Traceability**: Track product origins and supply chains for transparency.
- **Responsive Design**: Mobile-friendly interface with dark mode support.

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
### Backend API:S
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

If you encounter issues while setting up or running the application, refer to the solutions below. Ensure all environment variables are correctly configured and Docker is running.

### General Setup Issues
- **Docker Compose Fails to Build**: Ensure Docker and Docker Compose are installed and up to date. Run `docker --version` and `docker compose version` to verify. If ports (e.g., 5173, 8000, 5001, 5433) are in use, stop conflicting services or change ports in `docker-compose.yml`.
- **Environment Variables Not Loaded**: Copy `.env.example` to `.env` and fill in all required values (e.g., database credentials, Stripe keys, Cloudinary settings). Missing variables may cause services to fail silently—check logs with `docker compose logs <service>`.
- **Node Modules Installation Fails**: Run `npm install` in the root and `frontend/` directories. If issues persist, clear npm cache with `npm cache clean --force` and retry.

### Runtime Issues
- **Frontend Not Loading (Port 5173)**: Check if the frontend container is running with `docker compose ps`. If the page shows errors, verify Vite config and environment variables. Try rebuilding with `docker compose up --build frontend`.
- **Backend API Errors (Port 8000)**: Run migrations with `docker compose exec web python manage.py migrate`. Check for database connection issues in logs. Ensure PostgreSQL container is healthy.
- **AI Service Unavailable (Port 5001)**: Verify the AI container is running. Test the health endpoint at `http://localhost:5001/health`. If models fail to load, ensure `artifacts/` files are present and Python dependencies are installed.
- **Database Connection Problems**: Confirm PostgreSQL credentials in `.env`. If data is corrupted, flush and reseed with `docker compose exec web python manage.py seed --flush` followed by `docker compose exec web python manage.py seed`.
- **Payment Processing Not Working**: Ensure Stripe API keys are set in `.env` and the webhook listener is running (`stripe listen --forward-to localhost:8000/api/stripe/webhook/`). Test with Stripe's test mode.
- **Authentication Issues**: Clear browser cookies and try logging in again. Check CSRF token handling in frontend requests. For production, ensure `SESSION_COOKIE_SECURE` and `CSRF_COOKIE_SECURE` are set to `True`.
- **Slow Performance or Crashes**: Monitor resource usage with `docker stats`. Increase Docker memory limits if needed. For AI features, ensure sufficient RAM for model loading.

### Logs and Debugging
- View all logs: `docker compose logs`
- Specific service logs: `docker compose logs <web|frontend|ai|db>`
- Access container shells: `docker compose exec <service> sh` (e.g., for backend: `docker compose exec web sh`)
- If issues persist, check the [GitHub Issues](https://github.com/your-repo/issues) or contact the development team.

For advanced debugging, refer to Docker documentation or Django/React troubleshooting guides.



# Project Management

<details>
<summary>Jira issue list</summary>

<br>

| Key | Type | Summary | Status | Assignee |
| --- | --- | --- | --- | --- |
| BRFN-6 | Task | Connect Everyone to teams, Jira and Github Repo | Done | Harrison Mann |
| BRFN-7 | Subtask | Setup Jira | Done |  |
| BRFN-8 | Subtask | Setup github | Done |  |
| BRFN-9 | Subtask | setup teams | Done |  |
| BRFN-11 | Epic | Account Management | Done | Harrison Mann |
| BRFN-10 | Story | Producer registration | Done | Harrison Mann |
| BRFN-12 | Story | Customer Registration | Done | Harrison Mann |
| BRFN-20 | Story | Secure authentication & authorisation (RBAC, sessions, password security) | Done | Harrison Mann |
| BRFN-13 | Epic | Product Browsing, Search & Filtering | Done | Sam Waxman |
| BRFN-21 | Story | Browse by category | Done | Sam Waxman |
| BRFN-22 | Story | Search products | Done | Dylan Jones |
| BRFN-23 | Story | Filter by organic certification | Done | Sam Waxman |
| BRFN-24 | Story | View allergen warnings | Done | Sam Waxman |
| BRFN-25 | Story | View food miles | Done | Sam Waxman |
| BRFN-14 | Epic | Product Listing & Inventory Management | Done | Matt N |
| BRFN-26 | Story | Create product listings | Done | Matt N |
| BRFN-27 | Story | Update inventory & availability | Done | Sam Waxman |
| BRFN-28 | Story | Seasonal availability | Done | Matt N |
| BRFN-29 | Story | Surplus produce & discounts | Done | Sam Waxman |
| BRFN-30 | Story | Low stock notifications | Done | Matt N |
| BRFN-15 | Epic | Shopping Cart Management | Done | Joshua Okanlawon |
| BRFN-31 | Story | Add items to cart, update quantities, remove items | Done | Joshua Okanlawon |
| BRFN-122 | Bug | Small bug fixe | Done | Dylan Jones |
| BRFN-16 | Epic | Order Placement & Checkout | Done | Dylan Jones |
| BRFN-32 | Story | Single-producer checkout | Done | Dylan Jones |
| BRFN-33 | Story | Multi-producer checkout | Done | Dylan Jones |
| BRFN-34 | Story | Bulk orders (community groups) | Done | Matt N |
| BRFN-35 | Story | Recurring orders (restaurants) | Done | Matt N |
| BRFN-17 | Epic | Order Management | Done |  |
| BRFN-36 | Story | Producer views for incoming orders | Done | Sam Waxman |
| BRFN-37 | Story | Producer updates order status | Done | Joshua Okanlawon |
| BRFN-38 | Story | Customer order history & reorder | Done | Harrison Mann |
| BRFN-18 | Epic | Payments, Settlements & Commission | Done |  |
| BRFN-39 | Story | Weekly producer settlements | Done |  |
| BRFN-40 | Story | Network commission monitoring & reports | Done |  |
| BRFN-19 | Epic | Community Engagement & Content | Done |  |
| BRFN-41 | Story | Recipies & farm stories | Done | Dylan Jones |
| BRFN-42 | Story | Product ratings & reviews | Done | Joshua Okanlawon |
| BRFN-43 | Task | Test GitHub | Done | Joshua Okanlawon |
| BRFN-44 | Epic | DRF + REACT Framework Setup | Done | Harrison Mann |
| BRFN-45 | Task | Folder setup (Backend + Frontend) folders | Done | Harrison Mann |
| BRFN-46 | Task | Basic Home Page to test setup | Done | Sam Waxman |
| BRFN-47 | Epic | BPMN Final Design | Done | Dylan Jones |
| BRFN-48 | Epic | Database Django Models | Done | Matt N |
| BRFN-52 | Epic | REST API with DRF Setup | Done | Dylan Jones |
| BRFN-53 | Task | Routers/ URL path Setup | Done | Dylan Jones |
| BRFN-54 | Epic | JSX Webpages | Done | Sam Waxman |
| BRFN-55 | Epic | Frontend Design | Done | Joshua Okanlawon |
| BRFN-56 | Task | Page flow design/diagram | Done | Sam Waxman |
| BRFN-57 | Task | Page(s) layout design | Done | Sam Waxman |
| BRFN-58 | Task | Create template JSX very based on designs (Links to BRFN-54) | Done | Sam Waxman |
| BRFN-60 | Task | Finish Homepage, implement basic shopping basket & checkout | Done | Joshua Okanlawon |
| BRFN-61 | Task | Create simple components and files for every page | Done | Sam Waxman |
| BRFN-62 | Task | Create producer dashboard | Done | Sam Waxman |
| BRFN-63 | Task | Product filtering and sorting | Done | Dylan Jones |
| BRFN-59 | Bug | Docker Build Issue on viewset_serializers_routers branch - Potentially others | Done | Harrison Mann |
| BRFN-64 | Epic | External Cloud storage | Done | Joshua Okanlawon |
| BRFN-66 | Task | Create checkout page | Done | Dylan Jones |
| BRFN-67 | Epic | Producer Dashboard | Done | Sam Waxman |
| BRFN-68 | Task | Add categories, allergens and image link to form for adding products | Done |  |
| BRFN-71 | Task | Link allergens into product filters | Done |  |
| BRFN-72 | Task | Create dashboard overview | Done |  |
| BRFN-73 | Task | Create dashboard orders tab | Done |  |
| BRFN-74 | Task | Create producer payments tab | Done |  |
| BRFN-75 | Task | Create product surplus tab | Done |  |
| BRFN-76 | Task | Create producer profile tab | Done |  |
| BRFN-88 | Task | Notifications icon | Done |  |
| BRFN-89 | Bug | Fix availability field entries for adding and editing products | Done |  |
| BRFN-90 | Task | Switch product image upload link field to upload button | Done |  |
| BRFN-91 | Task | Split CSS into more modules so the producer css isnt massive | Done |  |
| BRFN-69 | Epic | Authentication & Authorisation | Done |  |
| BRFN-70 | Task | Implement Google OAuth | Done |  |
| BRFN-78 | Epic | AI products suggestion | Done | Sam Waxman |
| BRFN-79 | Task | Add front end visual top of page | Done |  |
| BRFN-80 | Task | Add notifcation for main page | Done |  |
| BRFN-81 | Task | Link through the model | Done |  |
| BRFN-82 | Bug | Sprint Review Changes | Done |  |
| BRFN-83 | Subtask | CSRF token and cookies issue | Done | Joshua Okanlawon |
| BRFN-84 | Subtask | Manage requests betterin react - dont use fetch in auth.js - axios | Done | Sam Waxman |
| BRFN-85 | Subtask | Move filtering to backend | Done | Sam Waxman |
| BRFN-86 | Bug | Product price does not increase when quantity increases | Done | Sam Waxman |
| BRFN-87 | Story | Split orders by producer | Done | Dylan Jones |
| BRFN-99 | Story | establish regular weekly orders | Done | Dylan Jones |
| BRFN-100 | Epic | Administrator Dashboard | Done | Sam Waxman |
| BRFN-101 | Task | Financial reports | Done |  |
| BRFN-102 | Task | Main dashboard pages | Done |  |
| BRFN-103 | Task | Annoucements and email features | Done |  |
| BRFN-104 | Task | Add model upload section for AI models | Done |  |
| BRFN-105 | Task | TC-03 - Calendar styling and remove future dates | Done | Dylan Jones |
| BRFN-106 | Story | TC01 - Adjust input fields | Done | Harrison Mann |
| BRFN-107 | Story | TC02 - add address + TC | Done | Harrison Mann |
| BRFN-108 | Story | TC08 - Track Shipping | Cancelled | Joshua Okanlawon |
| BRFN-109 | Story | TC10 - receives notifs | Done | Joshua Okanlawon |
| BRFN-110 | Story | TC11 - Show OOS | Done | Sam Waxman |
| BRFN-111 | Story | TC18 - Bulk order lead times | Done | Matt N |
| BRFN-113 | Story | TC21 ReOrder Button | Done | Joshua Okanlawon |
| BRFN-114 | Story | TC19 Analytics | Done | Dylan Jones |
| BRFN-115 | Story | Splash once | Done | Dylan Jones |
| BRFN-116 | Bug | Stock Validation | Done | Dylan Jones |
| BRFN-117 | Bug | Split orders frontend customer | Done | Dylan Jones |
| BRFN-118 | Bug | General big fixes + Small fixes | Done | Dylan Jones |
| BRFN-119 | Task | Visual Basket Addition | Done | Dylan Jones |
| BRFN-120 | Story | Improve explore page | Done | Dylan Jones |
| BRFN-121 | Bug | Error handling | Done | Dylan Jones |

</details>

<details>
<summary>Sprint logs</summary>

<br>

<p align="center">
  <img src="screenshots/Sprint_logs.png">
</p>

</details>



# License

This project was developed for educational purposes as part of the UFCFTR-30-3 module.


