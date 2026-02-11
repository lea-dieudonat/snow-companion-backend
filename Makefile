.PHONY: help install dev build start clean prisma-generate prisma-migrate prisma-studio prisma-reset db-push db-seed

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
RESET := \033[0m

help: ## Show this help message
	@echo "$(CYAN)Available commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Run development server with hot reload
	npm run dev

build: ## Build the project for production
	npm run build

start: ## Start production server
	npm run start

clean: ## Remove node_modules and dist directories
	rm -rf node_modules dist

prisma-generate: ## Generate Prisma Client
	npx prisma generate

prisma-migrate: ## Create and apply a new migration (usage: make prisma-migrate name=migration_name)
	npx prisma migrate dev --name $(name)

prisma-migrate-deploy: ## Apply pending migrations (for production)
	npx prisma migrate deploy

prisma-studio: ## Open Prisma Studio (database GUI)
	npx prisma studio

prisma-reset: ## Reset database and apply all migrations
	npx prisma migrate reset

db-push: ## Push schema changes to database without creating migration
	npx prisma db push

prisma-format: ## Format Prisma schema file
	npx prisma format

logs: ## Show application logs (if using a process manager)
	tail -f logs/*.log

reinstall: clean install ## Clean and reinstall all dependencies

setup: install prisma-generate ## Initial project setup

refresh: prisma-generate prisma-migrate ## Refresh Prisma client and apply migrations
