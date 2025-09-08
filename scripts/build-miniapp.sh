#!/bin/bash
# Build script for miniapp deployment

set -e

echo "Building miniapp..."
bash supabase/functions/miniapp/build.sh

echo "Asserting bundle quality..."
node scripts/assert-miniapp-bundle.mjs

echo "✅ Miniapp build complete and ready for deployment"