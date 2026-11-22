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

const stripLineAndBlockComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const normalizeSpecifierToRepoRel = (filePath, specifier) => {
  if (specifier.startsWith('@/')) {
    const cleanAlias = specifier.slice(2).replace(/\\/g, '/');
    return path.posix
      .normalize(`src/${cleanAlias}`)
      .replace(/^\.\//, '')
      .replace(/\/+$/, '');
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const absTarget = path.resolve(path.dirname(filePath), specifier);
    return path.relative(ROOT_DIR, absTarget).replace(/\\/g, '/').replace(/\/+$/, '');
  }
  return null;
};

const hasAliasParentTraversal = (specifier) =>
  specifier.startsWith('@/') &&
  /(?:^|\/)\.\.(?:\/|$)/.test(specifier.slice(2).replace(/\\/g, '/'));

const extractModuleSpecifiers = (content) => {
  const clean = stripLineAndBlockComments(content);
  const specifiers = [];
  const patterns = [
    /(?:^|;)\s*(?:import|export)\s+(?:type\s+)?[^;]*?\bfrom\s*['"]([^'"]+)['"]/gm,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /^\s*import\s+['"]([^'"]+)['"]/gm,
  ];
  for (const regex of patterns) {
    let match = regex.exec(clean);
    while (match !== null) {
      specifiers.push(match[1]);
      match = regex.exec(clean);
    }
  }
  return specifiers;
};

const parseFeaturePath = (relPath) => {
  const deptMatch = relPath.match(
    /^src\/features\/(departments\/(?!(?:index|server|dal)(?:\.|\/|$))[^/.]+)(?:\/(.+))?$/
  );
  if (deptMatch) {
    return { featureKey: deptMatch[1], subPath: deptMatch[2] ?? '' };
  }
  const match = relPath.match(/^src\/features\/([^/]+)(?:\/(.+))?$/);
  if (!match) return null;
  return { featureKey: match[1], subPath: match[2] ?? '' };
};

const checkFeatureBoundaries = (filePath, relPath, content) => {
  const specifiers = extractModuleSpecifiers(content);
  const currentFeatureInfo = parseFeaturePath(relPath);
  const currentFeature = currentFeatureInfo?.featureKey ?? null;

  // Rule 0: Never allow ".." traversal inside "@/" path aliases
  for (const specifier of specifiers) {
    if (hasAliasParentTraversal(specifier)) {
      addError(
        filePath,
        `Path traversal ".." inside "@/" alias "${specifier}" is forbidden. Use a clean canonical import path.`
      );
    }
  }

  // Rule 1: feature/department index.ts must not use `export *` or import/re-export ANY server or dal code
  if (currentFeatureInfo?.subPath === 'index.ts') {
    if (/^\s*export\s+\*\s+from\s+/m.test(stripLineAndBlockComments(content))) {
      addError(
        filePath,
        'Feature index.ts must use explicit named exports (avoid "export *" for Turbopack tree-shaking).'
      );
    }
    for (const specifier of specifiers) {
      if (specifier === 'server-only') {
        addError(filePath, 'Feature index.ts is client-safe only and must never import server-only.');
        continue;
      }
      const resolvedRel = normalizeSpecifierToRepoRel(filePath, specifier);
      const targetInfo = resolvedRel ? parseFeaturePath(resolvedRel) : null;
      if (targetInfo && /^(?:server|dal)(?:\.(?:ts|tsx|js|mjs)|\/|$)/.test(targetInfo.subPath)) {
        addError(
          filePath,
          `Feature index.ts is client-safe only and must never import or re-export server/dal module "${specifier}" (resolves to "${resolvedRel}").`
        );
      }
    }
  }

  // Rule 2: No cross-feature/department deep imports (aliased @/features/* OR relative ./ and ../)
  for (const specifier of specifiers) {
    const resolvedRel = normalizeSpecifierToRepoRel(filePath, specifier);
    const targetInfo = resolvedRel ? parseFeaturePath(resolvedRel) : null;
    if (!targetInfo) continue;

    const cleanSubPath = targetInfo.subPath.replace(/\.(?:ts|tsx|js|mjs)$/, '');
    const isPublicEntry = cleanSubPath === '' || cleanSubPath === 'index' || cleanSubPath === 'server';

    if (targetInfo.featureKey !== currentFeature && !isPublicEntry) {
      addError(
        filePath,
        `Cross-feature deep import "${specifier}" (resolves to "${resolvedRel}") is forbidden. Import via "@/features/${targetInfo.featureKey}" or "@/features/${targetInfo.featureKey}/server".`
      );
    }
  }
};

const checkLegacyNextSegmentConfigs = (filePath, relPath, content) => {
  if (!relPath.startsWith('src/app/')) return;
  const clean = stripLineAndBlockComments(content);
  const directExportPattern =
    /^\s*export\s+(?:const|let|var)\s+(?:dynamic|revalidate|fetchCache)\b(?:\s*:\s*[^=]+)?\s*=/m;
  const namedExportPattern =
    /^\s*export\s*\{[^}]*\b(?:dynamic|revalidate|fetchCache)\b[^}]*\}/m;
  if (directExportPattern.test(clean) || namedExportPattern.test(clean)) {
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

    checkLineLimit(filePath, relPath, content);

    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      checkFileNaming(filePath, relPath);
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
