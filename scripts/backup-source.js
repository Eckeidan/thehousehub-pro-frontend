#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const frontendRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(frontendRoot, "..");
const backendRoot = path.join(workspaceRoot, "backend");
const outputRoot = path.resolve(
  process.env.THEHOUSEHUB_BACKUP_DIR || path.join(os.homedir(), "TheHouseHubBackups")
);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "UTC");
const archiveBaseName = `thehousehub-source-${timestamp}`;
const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${archiveBaseName}-`));
const stagingProjectRoot = path.join(stagingRoot, "thehousehub.pro");
const archivePath = path.join(outputRoot, `${archiveBaseName}.zip`);

const excludedDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  "backups",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "out",
  "uploads",
]);

const excludedFiles = new Set([
  ".DS_Store",
  "node_modules.zip",
]);

const excludedExtensions = [
  ".dump",
  ".log",
  ".pem",
  ".tsbuildinfo",
];

function shouldExclude(sourcePath, entryName) {
  if (excludedDirectories.has(entryName)) return true;
  if (excludedFiles.has(entryName)) return true;
  if (entryName === ".env" || entryName.startsWith(".env.")) return true;

  return excludedExtensions.some((extension) => entryName.endsWith(extension));
}

function copyFilteredDirectory(sourceDir, destinationDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing source directory: ${sourceDir}`);
  }

  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (shouldExclude(sourcePath, entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyFilteredDirectory(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function getGitSummary(repoPath) {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function writeManifest() {
  const manifest = {
    createdAt: new Date().toISOString(),
    workspaceRoot,
    frontendCommit: getGitSummary(frontendRoot),
    backendCommit: getGitSummary(backendRoot),
    excludes: {
      directories: Array.from(excludedDirectories).sort(),
      files: Array.from(excludedFiles).sort(),
      extensions: excludedExtensions.sort(),
      secrets: [".env", ".env.*"],
    },
  };

  fs.writeFileSync(
    path.join(stagingProjectRoot, "BACKUP_MANIFEST.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

function createArchive() {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(stagingProjectRoot, { recursive: true });

  copyFilteredDirectory(frontendRoot, path.join(stagingProjectRoot, "frontend"));
  copyFilteredDirectory(backendRoot, path.join(stagingProjectRoot, "backend"));
  writeManifest();

  execFileSync("zip", ["-qr", archivePath, "thehousehub.pro"], {
    cwd: stagingRoot,
    stdio: "inherit",
  });

  fs.rmSync(stagingRoot, { recursive: true, force: true });
}

try {
  createArchive();
  console.log(`Source backup created: ${archivePath}`);
} catch (error) {
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  console.error(`Backup failed: ${error.message}`);
  process.exit(1);
}
