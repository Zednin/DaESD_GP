# DaESD Group Project
UFCFTR-30-3 - Distributed and enterprise software development 

# Project Overview
This project demonstrates a fictional immplimentation for Bristol Regional Food Network.




## Group Members
| Name | Student ID | Email |
|-------|-------|-------|
| Harrison Mann | 23036387 | Harrison2.Mann@live.uwe.ac.uk |
| Matt Nogodula | 23025215 | Matt2.Nogodula@live.uwe.ac.uk |
| Dylan Jones | 22024323 | Dylan10.Jones@live.uwe.ac.uk |
| Josh Okanlawon | 23039392 | Joshua2.Okanlawon@live.uwe.ac.uk |
| Sam Waxman | 23023667 | Samuel2.Waxman@live.uwe.ac.uk |





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
|Fronted|User interface and client-side funcitonality|
|Backend|REST API, authentication, business logic|
|Database|Persistent PostgreSQL storage|
|AI Service|Product analysis and recommendation processing|


## Requirements
 - Docker
 - Docker Compose




# Running the Software
## Environment Variables Setup
Create a copy of [.env.example](.env.example) and frontend/[.env.local.example](.env.local.example) and fill in relevant information.
## Building the Project
### Build and start all services:
```bash
docker compose up --build
```

### To run in detatchd mode:
```bash
docker compose up -d --build
```

### To stop all containers:
```bash
docker compose down
```

### To stop al containers and remove database volume:
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
Important frontend environment variabls are configured inside of [docker-compose.yml](docker-compose.yml)

The frontend source code is mounted into the container, sochanges in `frontend/src`should update during development.

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
The AI service is located in the ai/ irectory and runs with Uvicorn on port 5000 inside the container.
It is exposed locally on:
http://localhost:5001

### The service includes:
- app.py
- recommender.py
- product_analysis.py
- feature_extract.py
- utils.py
- artifcats/

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

View backnd logs:
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











