#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Setting up Lovable Vite preview...');

// Check if we're in a read-only package.json situation
const packageJsonPath = path.join(__dirname, 'package.json');
const vitePackageJsonPath = path.join(__dirname, 'package.vite.json');

let useVitePackage = false;

try {
  // Try to read the main package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts || !packageJson.scripts['build:dev']) {
    console.log('ℹ️  build:dev script not found in main package.json');
    
    // Try to add it
    try {
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts['build:dev'] = 'vite build --mode development';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Added build:dev script to package.json');
    } catch (writeError) {
      console.log('⚠️  Cannot modify main package.json (read-only)');
      console.log('🔄 Switching to Vite-specific package.json...');
      useVitePackage = true;
    }
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  useVitePackage = true;
}

// If we need to use the Vite package, swap it temporarily
if (useVitePackage && fs.existsSync(vitePackageJsonPath)) {
  console.log('🔄 Using Vite-specific package.json for build...');
  
  // Backup original if it exists
  if (fs.existsSync(packageJsonPath)) {
    fs.copyFileSync(packageJsonPath, packageJsonPath + '.backup');
  }
  
  // Copy Vite package.json
  fs.copyFileSync(vitePackageJsonPath, packageJsonPath);
  
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  npm install failed, continuing with build...');
  }
}

// Run the build
console.log('🔨 Building for Lovable preview...');
try {
  execSync('npm run build:dev', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Restore original package.json if we swapped it
if (useVitePackage && fs.existsSync(packageJsonPath + '.backup')) {
  console.log('🔄 Restoring original package.json...');
  fs.copyFileSync(packageJsonPath + '.backup', packageJsonPath);
  fs.unlinkSync(packageJsonPath + '.backup');
}