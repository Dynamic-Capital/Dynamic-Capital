#!/usr/bin/env node
// Temporary build script for Lovable preview
const { execSync } = require('child_process');

try {
  console.log('Building Vite app for Lovable preview...');
  execSync('npx vite build --mode development', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}