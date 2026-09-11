#!/bin/bash

# ==============================================================================
# StayEase Startup Script
# This script handles the full cold-start of the Hotel Booking SaaS platform.
# ==============================================================================

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting StayEase Local Development Environment...${NC}\n"

# 1. Infrastructure Setup
echo -e "${YELLOW}Step 1: Launching Infrastructure (Docker)...${NC}"
if ! docker compose ps | grep -q "Up"; then
  docker compose up -d
  echo -e "${GREEN}✅ Docker containers started.${NC}"
else
  echo -e "${GREEN}✅ Docker containers already running.${NC}"
fi

# 2. Environment Configuration
if [ ! -f .env ]; then
  echo -e "${YELLOW}Step 2: Configuring Environment...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✅ Created .env from .env.example${NC}"
else
  echo -e "${GREEN}✅ .env already exists.${NC}"
fi

# 3. Dependency Installation
echo -e "${YELLOW}Step 3: Installing Dependencies...${NC}"
pnpm install
echo -e "${GREEN}✅ Dependencies installed.${NC}"

# 4. Database Initialization
echo -e "${YELLOW}Step 4: Initializing Database...${NC}"
pnpm db:generate
pnpm db:push
pnpm db:seed
echo -e "${GREEN}✅ Database schema pushed and seeded.${NC}"

# 5. Admin Account Creation
# We create a default admin if one doesn't exist.
# In a real scenario, we could check the DB, but for local dev, this is safe.
echo -e "${YELLOW}Step 5: Provisioning Admin Account...${NC}"
pnpm create:admin -- --email admin@stayease.local --name "Local Admin" --password "Password123!"
echo -e "${GREEN}✅ Admin account created: admin@stayease.local / Password123!${NC}"

# 6. Launching Services
echo -e "\n${BLUE}Launching Services in Background...${NC}"

# Function to launch and log
launch_service() {
  local name=$1
  local cmd=$2
  echo -n "Starting $name... "
  eval "$cmd" > "logs/${name}.log" 2>&1 &
  echo -e "${GREEN}Running (see logs/${name}.log)${NC}"
}

mkdir -p logs

launch_service "API" "pnpm dev:api"
launch_service "Realtime" "pnpm dev:realtime"
launch_service "Web" "pnpm dev:web"

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${GREEN}🎉 StayEase is now live!${NC}"
echo -e "Frontend:  ${BLUE}http://localhost:3000${NC}"
echo -e "API:       ${BLUE}http://localhost:4000${NC}"
echo -e "Realtime:  ${BLUE}ws://localhost:4001${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "\nTo stop all services, run: ${YELLOW}pkill -f 'pnpm dev'${NC}"
echo -e "To view logs, use: ${YELLOW}tail -f logs/Web.log${NC}\n"
