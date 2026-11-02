import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const MAX_LINES = 300;
const WARN_LINES = 250;

const NEXT_APP_RESERVED = new Set([
  'page.tsx',
  'layout.tsx',
  'loading.tsx',
  'error.tsx',
  'global-error.tsx',
  'not-found.tsx',
  'route.ts',
  'template.tsx',
  'default.tsx',
  'manifest.ts',
  'robots.ts',
  'sitemap.ts',
  'icon.tsx',
  'apple-icon.tsx',
  'opengraph-image.tsx',
]);

const CAMEL_TS_REGEX = /^[a-z][a-zA-Z0-9]*(\.test)?\.ts$/;
const PASCAL_TSX_REGEX = /^[A-Z][a-zA-Z0-9]*(\.test)?\.tsx$/;
const DEEP_FEATURE_IMPORT_REGEX = /from\s+['"]@\/features\/([a-zA-Z0-9]+)\/([^'"]+)['"]/g;
const FUNCTION_COMPONENT_REGEX = /\bexport\s+(default\s+)?function\s+/;

const errors = [];
const warnings = [];

// 1. Forbidden middleware files check
for (const candidate of [
  'middleware.ts',
  'middleware.js',
  'middleware.mts',
  'src/middleware.ts',
  'src/middleware.js',
  'src/middleware.mts',
]) {
  if (fs.existsSync(path.join(ROOT_DIR, candidate))) {
    errors.push(`[NO-MIDDLEWARE] Forbidden file detected: ${candidate}. Use src/proxy.ts exclusively.`);
  }
}

function walkDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

const srcFiles = walkDir(SRC_DIR);

for (const absPath of srcFiles) {
  const relPath = path.relative(ROOT_DIR, absPath).replace(/\\/g, '/');
  const baseName = path.basename(absPath);
  const ext = path.extname(absPath);

  if (ext !== '.ts' && ext !== '.tsx' && ext !== '.css') {
    continue;
  }

  const content = fs.readFileSync(absPath, 'utf8');
  const lineCount = content.split(/\r?\n/).length;

  // 2. Line count check
  if (lineCount > MAX_LINES) {
    errors.push(`[LINE-LIMIT] ${relPath} has ${lineCount} lines (hard cap is ${MAX_LINES}). Split into smaller modules.`);
  } else if (lineCount >= WARN_LINES) {
    warnings.push(`[LINE-WARN] ${relPath} has ${lineCount} lines (approaching ${MAX_LINES} limit). Consider splitting soon.`);
  }

  // 3. Tailwind v4 gradient check
  if (content.includes('bg-gradient-to-')) {
    errors.push(`[TAILWIND-V4] ${relPath} uses deprecated 'bg-gradient-to-*'. Use 'bg-linear-to-*' instead.`);
  }

  if (ext === '.css' || baseName.endsWith('.d.ts')) {
    continue;
  }

  // 4. Naming convention check
  const isProxyFile = relPath === 'src/proxy.ts';
  const isAppRouterReserved = relPath.startsWith('src/app/') && NEXT_APP_RESERVED.has(baseName);

  if (!isProxyFile && !isAppRouterReserved) {
    if (ext === '.ts' && !CAMEL_TS_REGEX.test(baseName)) {
      errors.push(`[NAMING] ${relPath} must use camelCase.ts (e.g. jevRouter.ts, documentDal.ts, headerScrubber.test.ts).`);
    }
    if (ext === '.tsx' && !PASCAL_TSX_REGEX.test(baseName)) {
      errors.push(`[NAMING] ${relPath} must use PascalCase.tsx (e.g. DocumentViewer.tsx, AppShell.tsx).`);
    }
  }

  // 5. Arrow Function component check in .tsx files
  if (ext === '.tsx' && FUNCTION_COMPONENT_REGEX.test(content)) {
    errors.push(`[ARROW-COMPONENT] ${relPath} uses 'export function'. Define React components as Arrow Functions.`);
  }

  // 6. Cross-feature public barrel import check
  let match;
  DEEP_FEATURE_IMPORT_REGEX.lastIndex = 0;
  while ((match = DEEP_FEATURE_IMPORT_REGEX.exec(content)) !== null) {
    const importedFeature = match[1];
    const importedSubpath = match[2];
    const ownFeaturePrefix = `src/features/${importedFeature}/`;
    if (!relPath.startsWith(ownFeaturePrefix) && importedSubpath !== 'index' && importedSubpath !== 'server') {
      errors.push(
        `[FEATURE-BOUNDARY] ${relPath} deep-imports '@/features/${importedFeature}/${importedSubpath}'. Import from '@/features/${importedFeature}' or '@/features/${importedFeature}/server' only.`
      );
    }
  }
}

for (const warning of warnings) {
  console.warn(`⚠️  ${warning}`);
}

if (errors.length > 0) {
  console.error('\n❌ KRONOS Architecture Verification FAILED:\n');
  for (const err of errors) {
    console.error(`  • ${err}`);
  }
  console.error('');
  process.exit(1);
}

console.log(`✅ KRONOS Architecture Guard passed (${srcFiles.length} files checked, 0 violations).`);
