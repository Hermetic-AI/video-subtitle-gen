#!/usr/bin/env node
'use strict';

/**
 * One-click install for video-subtitle-gen.
 * Copies this skill into your Claude skills directory.
 *
 * Usage:
 *   node install.mjs                    # auto-detect platform
 *   node install.mjs --target <path>    # custom target directory
 */

import { existsSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

// Parse --target flag
let targetDir = null;
const targetIdx = args.indexOf('--target');
if (targetIdx !== -1 && args[targetIdx + 1]) {
  targetDir = resolve(args[targetIdx + 1]);
}

// Auto-detect Claude skills directory
function detectSkillsDir() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    console.error('Cannot detect home directory. Use --target <path> to specify.');
    process.exit(1);
  }

  const candidates = [
    join(home, '.claude', 'skills'),
    join(home, '.config', 'claude', 'skills'),
  ];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  // Default: create ~/.claude/skills
  return candidates[0];
}

const skillsDir = targetDir || detectSkillsDir();
const skillName = 'video-subtitle-gen';
const destDir = join(skillsDir, skillName);
const srcDir = __dirname;

// Validate source has required files
for (const f of ['SKILL.md', 'cli.mjs']) {
  if (!existsSync(join(srcDir, f))) {
    console.error(`Missing ${f} in source directory. Run this from the skill root.`);
    process.exit(1);
  }
}

// Create skills dir if needed
mkdirSync(skillsDir, { recursive: true });

// Remove existing install
if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true, force: true });
  console.log(`Replacing existing install at ${destDir}`);
}

// Copy skill files (exclude node_modules, .git, install.mjs itself)
const ignore = new Set(['node_modules', '.git', 'install.mjs', 'package-lock.json']);
const entries = readdirSync(srcDir, { withFileTypes: true });
mkdirSync(destDir, { recursive: true });
for (const entry of entries) {
  if (ignore.has(entry.name)) continue;
  const src = join(srcDir, entry.name);
  const dest = join(destDir, entry.name);
  cpSync(src, dest, { recursive: true });
}

console.log(`✓ Installed ${skillName} to ${destDir}`);
console.log(`\nQuick start:`);
console.log(`  1. Tell your agent: "Generate video voiceover subtitles for [your topic]"`);
console.log(`  2. Or run directly: node ${join(destDir, 'cli.mjs')} --help`);
