const fs = require('fs');
const path = require('path');

// Auto-add the build:dev script to package.json
const packageJsonPath = path.join(__dirname, 'package.json');

try {
  let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts['build:dev']) {
    packageJson.scripts['build:dev'] = 'vite build --mode development';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Added build:dev script to package.json');
  }
} catch (error) {
  console.log('Note: Could not auto-add build:dev script:', error.message);
}

module.exports = {};