#!/bin/bash
set -e

echo "========================================="
echo "  Focus - One-Click Deployment Script"
echo "========================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check docker-compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: docker-compose is not installed"
    echo "Please install docker-compose first"
    exit 1
fi

# Determine compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "Creating .env configuration file..."
    cp .env.example .env

    echo ""
    echo "========================================="
    echo "  First-time Setup Required"
    echo "========================================="
    echo ""
    echo "Please edit .env file to configure:"
    echo ""
    echo "1. SECRET_KEY (required for security)"
    if command -v openssl &> /dev/null; then
        echo "   Generated key for you:"
        echo "   SECRET_KEY=$(openssl rand -hex 32)"
    else
        echo "   Generate with: openssl rand -hex 32"
    fi
    echo ""
    echo "2. AI_API_KEY (required for ArXiv interpretation)"
    echo ""
    echo "3. FRONTEND_URL (if deploying to a domain)"
    echo ""
    echo "After editing .env, run this script again."
    exit 0
fi

# Build and start
echo ""
echo "Building Docker images..."
$COMPOSE_CMD build

echo ""
echo "Starting services..."
$COMPOSE_CMD up -d

# Wait for health check
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check status
if $COMPOSE_CMD ps | grep -q "healthy"; then
    echo ""
    echo "========================================="
    echo "  Deployment Successful!"
    echo "========================================="
    echo ""
    echo "  Frontend: http://localhost"
    echo "  Backend:  http://localhost:8000"
    echo ""
    echo "  Default Login:"
    echo "    Username: admin"
    echo "    Password: focus123 (or your DEFAULT_PASSWORD)"
    echo ""
    echo "  Useful Commands:"
    echo "    View logs:    $COMPOSE_CMD logs -f"
    echo "    Stop:         $COMPOSE_CMD down"
    echo "    Restart:      $COMPOSE_CMD restart"
    echo "    Update:       git pull && $COMPOSE_CMD up -d --build"
    echo ""
else
    echo ""
    echo "Services are starting... Check status with:"
    echo "  $COMPOSE_CMD ps"
    echo "  $COMPOSE_CMD logs"
fi
