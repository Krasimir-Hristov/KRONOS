import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const MAX_LINES = 300;

const NEXT_RESERVED_TSX = new Set([
  'page.tsx',
  'layout.tsx',
  'loading.tsx',
  'error.tsx',
  'global-error.tsx',
  'not-found.tsx',
  'template.tsx',
  'default.tsx',
  'icon.tsx',
  'apple-icon.tsx',
  'opengraph-image.tsx',
  'twitter-image.tsx',
]);

const NEXT_RESERVED_TS = new Set([
  'index.ts',
  'server.ts',
  'route.ts',
  'proxy.ts',
  'request.ts',
  'manifest.ts',
  'robots.ts',
  'sitemap.ts',
]);

const GENERATED_FILES_EXEMPT_FROM_LINE_LIMIT = new Set([
  'src/types/databaseTypes.ts',
]);

const errors = [];

const addError = (filePath, message) => {
  const rel = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  errors.push(`[ARCH] ${rel}: ${message}`);
};

const walkFiles = (dir, collected = []) => {
  if (!fs.existsSync(dir)) return collected;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, collected);
    } else {
      collected.push(fullPath);
    }
  }
  return collected;
};

const checkNoMiddleware = () => {
  const forbiddenPaths = [
    path.join(ROOT_DIR, 'middleware.ts'),
    path.join(ROOT_DIR, 'middleware.js'),
    path.join(SRC_DIR, 'middleware.ts'),
    path.join(SRC_DIR, 'middleware.js'),
  ];
  for (const filePath of forbiddenPaths) {
    if (fs.existsSync(filePath)) {
      addError(filePath, 'middleware.ts/js is strictly forbidden. Use src/proxy.ts instead.');
    }
  }
};

const checkFileNaming = (filePath, relPath) => {
  const baseName = path.basename(filePath);
  const inAppDir = relPath.startsWith('src/app/');

  if (baseName.endsWith('.tsx')) {
    if (inAppDir && NEXT_RESERVED_TSX.has(baseName)) return;
    const isPascalCase = /^[A-Z][A-Za-z0-9]*(\.test)?\.tsx$/.test(baseName);
    if (!isPascalCase) {
      addError(
        filePath,
        `React UI component file "${baseName}" must use PascalCase.tsx.`
      );
    }
    return;
  }

  if (baseName.endsWith('.ts') && !baseName.endsWith('.d.ts')) {
    if (NEXT_RESERVED_TS.has(baseName)) return;
    const isCamelCase = /^[a-z][A-Za-z0-9]*(\.test)?\.ts$/.test(baseName);
    if (!isCamelCase) {
      addError(
        filePath,
        `Logic/helper file "${baseName}" must use camelCase.ts (or camelCase.test.ts).`
      );
    }
  }
};

const checkLineLimit = (filePath, relPath, content) => {
  if (GENERATED_FILES_EXEMPT_FROM_LINE_LIMIT.has(relPath)) return;
  const lineCount = content.split(/\r?\n/).length;
  if (lineCount > MAX_LINES) {
    addError(
      filePath,
      `File has ${lineCount} lines (limit is ${MAX_LINES}). Split into smaller modules.`
    );
  }
};

const checkArrowComponents = (filePath, content) => {
  if (!filePath.endsWith('.tsx')) return;
  const functionComponentPattern =
    /^\s*(?:export\s+default\s+|export\s+)?(?:async\s+)?function\s+[A-Z][A-Za-z0-9_]*/m;
  if (functionComponentPattern.test(content)) {
    addError(
      filePath,
      'React components must be defined using Arrow Functions (not the "function" keyword).'
    );
  }
};

const checkTailwindV4Gradients = (filePath, content) => {
  if (/\bbg-gradient-to-(?:t|tr|r|br|b|bl|l|tl)\b/.test(content)) {
    addError(
      filePath,
      'Legacy Tailwind v3 gradient "bg-gradient-to-*" detected. Use Tailwind v4 "bg-linear-to-*".'
    );
  }
};

const checkFeatureBoundaries = (filePath, relPath, content) => {
  // Rule 1: feature index.ts must not use `export *` or re-export server/dal code
  const indexMatch = relPath.match(/^src\/features\/([^/]+)\/index\.ts$/);
  if (indexMatch) {
    if (/^\s*export\s+\*\s+from\s+/m.test(content)) {
      addError(
        filePath,
        'Feature index.ts must use explicit named exports (avoid "export *" for Turbopack tree-shaking).'
      );
    }
    if (/['"]\.\/(?:dal|server)(?:\/|['"])|['"]server-only['"]/.test(content)) {
      addError(
        filePath,
        'Feature index.ts is client-safe only and must never import or re-export ./dal, ./server, or server-only.'
      );
    }
  }

  // Rule 2: No cross-feature deep imports (allow only @/features/<name> or @/features/<name>/server)
  const currentFeatureMatch = relPath.match(/^src\/features\/([^/]+)\//);
  const currentFeature = currentFeatureMatch ? currentFeatureMatch[1] : null;
  const importRegex = /from\s+['"]@\/features\/([^/'"]+)\/([^'"]+)['"]/g;
  let match = importRegex.exec(content);
  while (match !== null) {
    const targetFeature = match[1];
    const subPath = match[2];
    if (targetFeature !== currentFeature && subPath !== 'server') {
      addError(
        filePath,
        `Cross-feature deep import "@/features/${targetFeature}/${subPath}" is forbidden. Import via "@/features/${targetFeature}" or "@/features/${targetFeature}/server".`
      );
    }
    match = importRegex.exec(content);
  }
};

const checkLegacyNextSegmentConfigs = (filePath, relPath, content) => {
  if (!relPath.startsWith('src/app/')) return;
  if (/^\s*export\s+const\s+(?:dynamic|revalidate|fetchCache)\s*=/m.test(content)) {
    addError(
      filePath,
      'Legacy route segment config (dynamic/revalidate/fetchCache) is incompatible with Next.js 16 cacheComponents: true. Use "use cache" and <Suspense>.'
    );
  }
};

const main = () => {
  checkNoMiddleware();
  const files = walkFiles(SRC_DIR);

  for (const filePath of files) {
    const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const isCodeFile = /\.(ts|tsx|css)$/.test(filePath);
    if (!isCodeFile) continue;

    const content = fs.readFileSync(filePath, 'utf8');

    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      checkFileNaming(filePath, relPath);
      checkLineLimit(filePath, relPath, content);
      checkArrowComponents(filePath, content);
      checkFeatureBoundaries(filePath, relPath, content);
      checkLegacyNextSegmentConfigs(filePath, relPath, content);
    }

    checkTailwindV4Gradients(filePath, content);
  }

  if (errors.length > 0) {
    console.error('\n❌ KRONOS Architecture Verification Failed:\n');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.error(`\nTotal violations: ${errors.length}\n`);
    process.exit(1);
  }

  console.log(`✅ KRONOS Architecture Verification Passed (${files.length} files scanned, 0 violations).`);
};

main();
