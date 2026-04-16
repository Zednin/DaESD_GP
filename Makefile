DC=docker compose
PG_CONTAINER=django-postgres

# Load environment variables from .env if it exists, and export them for use in Makefile commands
ifneq (,$(wildcard .env))
include .env
export
endif


# start Postgres + Django containers in background, and starts stripe listener
up:
	$(DC) up -d
	stripe listen --forward-to localhost:8000/api/stripe/webhook/

# Start containers WITH rebuild, and starts stripe listener
up-build:
	$(DC) up --build -d
	stripe listen --forward-to localhost:8000/api/stripe/webhook/

# stop and remove containers, but keep volumes (preserves DB data)
down:
	$(DC) down

# View DB container logs
logs:
	$(DC) logs -f db


makemigrations:
	docker compose exec web python manage.py makemigrations


# Apply migrations
migrate:
	$(DC) exec $(WEB_CONTAINER) python manage.py migrate





# Open Postgres shell
psql:
	docker exec -it $(PG_CONTAINER) psql -U $${DB_USER} -d $${DB_NAME}

# reset the database base.sql doesnt exist yet - replace with actual seed data when ready
reset-db:
	docker exec -i $(PG_CONTAINER) psql -U $${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS \"$${DB_NAME}\";"
	docker exec -i $(PG_CONTAINER) psql -U $${DB_USER} -d postgres -c "CREATE DATABASE \"$${DB_NAME}\";"
	$(DC) exec web python manage.py migrate
	docker exec -i $(PG_CONTAINER) psql -U $${DB_USER} -d $${DB_NAME} < db/seed/base.sql
	@echo "DB reset complete."

# Completely remove DB container, its volume, and all data
nuke-db:
	$(DC) down -v
	@echo "DB volume removed. KABOOM"
