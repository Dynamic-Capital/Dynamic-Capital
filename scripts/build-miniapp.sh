#!/bin/bash
# Build script for miniapp deployment

set -e

echo "Building miniapp..."
cd supabase/functions/miniapp && npm ci && npm run build
cd ../../..

echo "Asserting bundle quality..."
node scripts/assert-miniapp-bundle.mjs

echo "✅ Miniapp build complete and ready for deployment"
