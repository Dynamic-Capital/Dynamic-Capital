#!/bin/bash
# Unified build script for the Dynamic Chatty Bot project
# Runs the Next.js build and the mini app build sequentially.
set -e

# Build the Next.js application
npm run build

# Build the Supabase mini app
npm run build:miniapp

echo "✅ Full build completed"
