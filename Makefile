DC=docker compose
MYSQL_CONTAINER=django-mysql

# Load environment variables from .env if it exists, and export them for use in Makefile commands
ifneq (,$(wildcard .env))
include .env
export
endif


# start mysql + Django containers in background
up:
	$(DC) up -d

# stop and remove containers, but keep volumes (preserves DB data)
down:
	$(DC) down

# View MySQL container
logs:
	$(DC) logs -f db

# Open MySQL shell inside the running container
mysql:
	docker exec -it $(MYSQL_CONTAINER) mysql -u$${DB_USER} -p$${DB_PASSWORD} $${DB_NAME}

# reset the database: drops and recreates the DB, runs migrations, and seeds with base.sql
reset-db:
	docker exec -i $(MYSQL_CONTAINER) mysql -uroot -p$${DB_ROOT_PASSWORD} -e "DROP DATABASE IF EXISTS \`$${DB_NAME}\`; CREATE DATABASE \`$${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
	python manage.py migrate
	docker exec -i $(MYSQL_CONTAINER) mysql -u$${DB_USER} -p$${DB_PASSWORD} $${DB_NAME} < db/seed/base.sql
	@echo "DB reset complete."

# Completely remove DB container, its volume, and all data 
nuke-db:
	$(DC) down -v
	@echo "DB volume removed. KABOOM"
