DC=docker compose

WEB_SERVICE=web
FRONTEND_SERVICE=frontend
AI_SERVICE=ai
DB_SERVICE=db

PG_CONTAINER=django-postgres

# Load environment variables from .env if it exists
ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: help up up-build down restart ps logs logs-web logs-frontend logs-ai logs-db \
        shell-web shell-frontend shell-ai makemigrations migrate migrations superuser \
        seed seed-flush psql dbshell inspect-db test stripe collectstatic nuke-db

help:
	@echo "Available commands:"
	@echo "  make up              Start all containers"
	@echo "  make up-build        Rebuild and start all containers"
	@echo "  make down            Stop containers"
	@echo "  make restart         Restart containers"
	@echo "  make ps              Show running containers"
	@echo "  make logs            View all logs"
	@echo "  make logs-web        View backend logs"
	@echo "  make logs-frontend   View frontend logs"
	@echo "  make logs-ai         View AI service logs"
	@echo "  make logs-db         View PostgreSQL logs"
	@echo "  make shell-web       Open backend shell"
	@echo "  make shell-frontend  Open frontend shell"
	@echo "  make shell-ai        Open AI service shell"
	@echo "  make makemigrations  Create Django migrations"
	@echo "  make migrate         Apply Django migrations"
	@echo "  make migrations      Create and apply migrations"
	@echo "  make superuser       Create Django superuser"
	@echo "  make seed            Seed database"
	@echo "  make seed-flush      Flush and reseed database"
	@echo "  make psql            Open PostgreSQL shell"
	@echo "  make dbshell         Open Django database shell"
	@echo "  make inspect-db      Inspect database schema"
	@echo "  make test            Run Django tests"
	@echo "  make stripe          Start Stripe webhook listener"
	@echo "  make nuke-db         Stop containers and remove volumes"

up:
	$(DC) up -d

up-build:
	$(DC) up --build -d

down:
	$(DC) down

restart:
	$(DC) down
	$(DC) up -d

ps:
	$(DC) ps

logs:
	$(DC) logs -f

logs-web:
	$(DC) logs -f $(WEB_SERVICE)

logs-frontend:
	$(DC) logs -f $(FRONTEND_SERVICE)

logs-ai:
	$(DC) logs -f $(AI_SERVICE)

logs-db:
	$(DC) logs -f $(DB_SERVICE)

shell-web:
	$(DC) exec $(WEB_SERVICE) sh

shell-frontend:
	$(DC) exec $(FRONTEND_SERVICE) sh

shell-ai:
	$(DC) exec $(AI_SERVICE) sh

makemigrations:
	$(DC) exec $(WEB_SERVICE) python manage.py makemigrations

migrate:
	$(DC) exec $(WEB_SERVICE) python manage.py migrate

migrations: makemigrations migrate

superuser:
	$(DC) exec $(WEB_SERVICE) python manage.py createsuperuser

seed:
	$(DC) exec $(WEB_SERVICE) python manage.py seed

seed-flush:
	$(DC) exec $(WEB_SERVICE) python manage.py seed --flush

psql:
	docker exec -it $(PG_CONTAINER) psql -U $${DB_USER} -d $${DB_NAME}

dbshell:
	$(DC) exec $(WEB_SERVICE) python manage.py dbshell

inspect-db:
	$(DC) exec $(WEB_SERVICE) python manage.py inspectdb

test:
	$(DC) exec $(WEB_SERVICE) python manage.py test

collectstatic:
	$(DC) exec $(WEB_SERVICE) python manage.py collectstatic --noinput

stripe:
	stripe listen --forward-to localhost:8000/api/stripe/webhook/

nuke-db:
	$(DC) down -v
	@echo "PostgreSQL volume removed."
