#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying AI Todo Builder setup...\n');

// Check required files
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'docker-compose.yml',
  '.env.local',
  'src/app/page.tsx',
  'src/components/TodoList.tsx',
  'src/lib/database.ts',
  'src/lib/claude-sdk.ts',
  'src/lib/redis.ts',
  'src/types/index.ts',
  'src/app/api/todos/route.ts',
  'src/app/api/todos/[id]/route.ts',
  'database/init/01-init.sql',
  '.claude/agents/product-manager.md',
  '.claude/agents/frontend-developer.md',
  '.claude/agents/backend-developer.md',
  '.claude/agents/qa-engineer.md'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const requiredDeps = [
  'react',
  'react-dom', 
  'next',
  'pg',
  'redis',
  'socket.io',
  'socket.io-client',
  '@anthropic-ai/claude-code'
];

const requiredDevDeps = [
  'typescript',
  '@types/node',
  '@types/react',
  '@types/react-dom',
  '@types/pg',
  '@types/redis',
  'tailwindcss',
  'eslint'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allFilesExist = false;
  }
});

requiredDevDeps.forEach(dep => {
  if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep} (dev)`);
  } else {
    console.log(`❌ ${dep} (dev) - MISSING`);
    allFilesExist = false;
  }
});

// Check TypeScript configuration
console.log('\n⚙️  Checking TypeScript configuration...');
try {
  const tsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tsconfig.json'), 'utf8'));
  if (tsConfig.compilerOptions && tsConfig.compilerOptions.paths && tsConfig.compilerOptions.paths['@/*']) {
    console.log('✅ TypeScript path aliases configured');
  } else {
    console.log('❌ TypeScript path aliases not configured');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ Error reading tsconfig.json');
  allFilesExist = false;
}

// Summary
console.log('\n📋 Setup Summary:');
if (allFilesExist) {
  console.log('✅ All required files and dependencies are present!');
  console.log('\n🚀 Next steps:');
  console.log('1. Set up your .env.local with proper values');
  console.log('2. Start PostgreSQL and Redis: npm run db:up');
  console.log('3. Start the development server: npm run dev');
  console.log('4. Open http://localhost:3000');
} else {
  console.log('❌ Some files or dependencies are missing. Please check the output above.');
  process.exit(1);
}

console.log('\n🎯 Project foundation setup complete!');