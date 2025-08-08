#!/bin/bash

# Comprehensive deployment script for Bareloft API
# This script ensures the database and application are properly set up

set -e  # Exit on any error

echo "🚀 Starting Bareloft API deployment..."

# Environment check
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Database setup
echo "🗄️ Setting up database..."
npm run db:generate
echo "✅ Prisma client generated"

# Try to deploy migrations, fallback to push if no migrations exist
echo "🔄 Deploying database schema..."
npm run db:deploy || {
    echo "⚠️ Migration deploy failed, trying schema push..."
    npx prisma db push --force-reset=false || {
        echo "❌ Database schema deployment failed"
        exit 1
    }
}

# Verify database
echo "🔍 Verifying database setup..."
npm run db:check || {
    echo "⚠️ Database verification failed, but continuing..."
}

# Production seed (if exists)
echo "🌱 Running production seeding..."
npm run db:seed:prod || {
    echo "⚠️ Seeding failed or skipped, continuing..."
}

# Generate documentation
echo "📚 Generating API documentation..."
npm run docs:generate

# Build application
echo "🏗️ Building application..."
npm run type-check
tsc

echo "✅ Build completed successfully!"

# Final verification
echo "🔍 Running post-build verification..."
npm run postbuild || {
    echo "⚠️ Post-build verification failed, but build completed"
}

echo "🎉 Deployment preparation complete!"
echo "💡 Start the application with: npm start"