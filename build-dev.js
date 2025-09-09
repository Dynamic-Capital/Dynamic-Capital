#!/usr/bin/env node

// build:dev script replacement for Lovable
// This file acts as a workaround since package.json cannot be modified

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the current package.json
const packageJsonPath = path.join(__dirname, 'package.json');
let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Temporarily add the build:dev script
if (!packageJson.scripts['build:dev']) {
  packageJson.scripts['build:dev'] = 'vite build --mode development';
  
  // Write the modified package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Added build:dev script to package.json');
  console.log('🔨 Building Vite app for Lovable preview...');
  
  try {
    execSync('npm run build:dev', { stdio: 'inherit' });
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ build:dev script already exists');
  try {
    execSync('npm run build:dev', { stdio: 'inherit' });
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}