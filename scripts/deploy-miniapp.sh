#!/bin/bash
set -e

echo "🚀 Building and deploying Dynamic Capital Mini App..."

# Build the miniapp
echo "📦 Building miniapp..."
cd supabase/functions/miniapp
npm ci
npm run build
cd ../../..

# Verify build output exists
if [ ! -f "supabase/functions/miniapp/static/index.html" ]; then
    echo "❌ Build failed - index.html not found in static directory"
    exit 1
fi

echo "✅ Build successful!"

# Check bundle quality
echo "🔍 Checking bundle quality..."
node scripts/assert-miniapp-bundle.mjs

echo "🚀 Deploying miniapp function..."
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "❌ SUPABASE_PROJECT_REF not set"
    exit 1
fi
npx --yes supabase functions deploy miniapp --project-ref "$SUPABASE_PROJECT_REF"

echo "✅ Miniapp deployed successfully!"
echo "📱 Access your miniapp at: https://$SUPABASE_PROJECT_REF.functions.supabase.co/miniapp/"
