#!/usr/bin/env node
/**
 * Architecture Boundary & Dependency Direction Checker
 * Enforces Feature-Sliced Domain Architecture rules:
 * - core cannot import from domains, pages, or app UI
 * - shared cannot import from domains, pages, or app UI
 * - one domain cannot import internal files from another domain (must use @domains/<targetDomain> public API)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');
const DOMAINS_DIR = path.resolve(SRC_DIR, 'domains');

const violations = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const relPath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
  
  // Skip test suites from boundary checks
  if (relPath.startsWith('test/') || relPath.startsWith('tests/')) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importSource = match[1];

    // Rule 1: core cannot import domains, pages, app
    if (relPath.startsWith('core/')) {
      if (
        importSource.startsWith('@domains') ||
        importSource.startsWith('@pages') ||
        importSource.startsWith('@app') ||
        importSource.includes('/domains/') ||
        importSource.includes('/pages/') ||
        importSource.includes('/app/')
      ) {
        violations.push({
          file: relPath,
          importSource,
          rule: 'Core cannot import from domains, pages, or app',
        });
      }
    }

    // Rule 2: shared cannot import domains, pages, app
    if (relPath.startsWith('shared/')) {
      if (
        importSource.startsWith('@domains') ||
        importSource.startsWith('@pages') ||
        importSource.startsWith('@app') ||
        importSource.includes('/domains/') ||
        importSource.includes('/pages/') ||
        importSource.includes('/app/')
      ) {
        violations.push({
          file: relPath,
          importSource,
          rule: 'Shared cannot import from domains, pages, or app',
        });
      }
    }

    // Rule 3: domain internal cross-import isolation
    // A domain file cannot import another domain's internal files.
    if (relPath.startsWith('domains/')) {
      const parts = relPath.split('/');
      const domainName = parts[1]; // e.g. "iam-auth"

      // Check alias deep imports: @domains/<other>/<internal>
      const domainAliasMatch = importSource.match(/^@domains\/([^/]+)\/(.+)$/);
      if (domainAliasMatch) {
        const targetDomain = domainAliasMatch[1];
        if (targetDomain !== domainName) {
          violations.push({
            file: relPath,
            importSource,
            rule: `Domain '${domainName}' cannot deeply import internal files of '${targetDomain}'. Use '@domains/${targetDomain}' public API instead.`,
          });
        }
      }

      // Check relative deep imports into another domain
      if (importSource.startsWith('.')) {
        const resolvedPath = path.resolve(path.dirname(filePath), importSource);
        const resolvedRelToDomains = path.relative(DOMAINS_DIR, resolvedPath).replace(/\\/g, '/');
        
        // If resolved path is inside domains directory:
        if (!resolvedRelToDomains.startsWith('..') && !path.isAbsolute(resolvedRelToDomains)) {
          const targetParts = resolvedRelToDomains.split('/');
          const targetDomain = targetParts[0];

          if (targetDomain && targetDomain !== domainName) {
            // It points into another domain. Only index.ts / index is permitted
            const subPath = targetParts.slice(1).join('/');
            if (subPath && subPath !== 'index' && subPath !== 'index.ts' && subPath !== 'index.tsx') {
              violations.push({
                file: relPath,
                importSource,
                rule: `Cross-domain relative deep import from '${domainName}' to internal file of '${targetDomain}' ('${subPath}'). Must use '@domains/${targetDomain}' public API.`,
              });
            }
          }
        }
      }
    }
  }
}

scanDir(SRC_DIR);

if (violations.length > 0) {
  console.error(`\x1b[31m[Architecture Check Failed] Found ${violations.length} boundary violation(s):\x1b[0m\n`);
  for (const v of violations) {
    console.error(`  - \x1b[33m${v.file}\x1b[0m: import \x1b[36m"${v.importSource}"\x1b[0m -> ${v.rule}`);
  }
  process.exit(1);
} else {
  console.log('\x1b[32m[Architecture Check Passed] All architectural boundaries and dependency directions are respected.\x1b[0m');
  process.exit(0);
}
