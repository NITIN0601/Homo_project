import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, "../../");

function getSourceFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "test" && entry.name !== "tests") {
        getSourceFiles(fullPath, fileList);
      }
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("Architectural Boundary Rules & Dependency Direction", () => {
  const allFiles = getSourceFiles(SRC_DIR);

  it("Rule 1: core layer must not import from domains, pages, or app UI", () => {
    const coreFiles = allFiles.filter((f) => f.includes("/src/core/"));
    const forbiddenImports: Array<{ file: string; importLine: string }> = [];

    for (const file of coreFiles) {
      const content = fs.readFileSync(file, "utf8");
      const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importSrc = match[1];
        if (
          importSrc.startsWith("@domains") ||
          importSrc.startsWith("@pages") ||
          importSrc.startsWith("@app") ||
          importSrc.includes("/domains/") ||
          importSrc.includes("/pages/") ||
          importSrc.includes("/app/")
        ) {
          forbiddenImports.push({ file: path.relative(SRC_DIR, file), importLine: importSrc });
        }
      }
    }

    expect(forbiddenImports).toEqual([]);
  });

  it("Rule 2: shared layer must not import from domains, pages, or app UI", () => {
    const sharedFiles = allFiles.filter((f) => f.includes("/src/shared/"));
    const forbiddenImports: Array<{ file: string; importLine: string }> = [];

    for (const file of sharedFiles) {
      const content = fs.readFileSync(file, "utf8");
      const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importSrc = match[1];
        if (
          importSrc.startsWith("@domains") ||
          importSrc.startsWith("@pages") ||
          importSrc.startsWith("@app") ||
          importSrc.includes("/domains/") ||
          importSrc.includes("/pages/") ||
          importSrc.includes("/app/")
        ) {
          forbiddenImports.push({ file: path.relative(SRC_DIR, file), importLine: importSrc });
        }
      }
    }

    expect(forbiddenImports).toEqual([]);
  });

  it("Rule 3: all 7 architectural domains export a valid public API index.ts", () => {
    const domains = [
      "iam-auth",
      "tenant-governance",
      "scheduling",
      "clinical-ehr",
      "dispensary-pharmacy",
      "billing-finance",
      "patient-engagement",
    ];

    for (const domain of domains) {
      const domainIndex = path.join(SRC_DIR, "domains", domain, "index.ts");
      expect(fs.existsSync(domainIndex)).toBe(true);
      const content = fs.readFileSync(domainIndex, "utf8");
      expect(content.length).toBeGreaterThan(50);
    }
  });

  it("Rule 4: domains cannot deeply import internal files of another domain", () => {
    const domainFiles = allFiles.filter((f) => f.includes("/src/domains/"));
    const deepImports: Array<{ file: string; importLine: string }> = [];

    for (const file of domainFiles) {
      const relPath = path.relative(SRC_DIR, file).replace(/\\/g, "/");
      const domainName = relPath.split("/")[1];

      const content = fs.readFileSync(file, "utf8");
      const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importSrc = match[1];
        const deepAliasMatch = importSrc.match(/^@domains\/([^/]+)\/(.+)$/);
        if (deepAliasMatch && deepAliasMatch[1] !== domainName) {
          deepImports.push({ file: relPath, importLine: importSrc });
        }
      }
    }

    expect(deepImports).toEqual([]);
  });
});
