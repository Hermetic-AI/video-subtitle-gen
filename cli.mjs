#!/usr/bin/env node
'use strict';

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '1.0.0';
const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------- arg parsing ----------------
function parseArgs(argv) {
  const a = {
    format: 'all', out: './out', cps: 4.5, pause: 400,
    font: 'sans-serif', fontsize: 56, col: -1,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === '--file') a.file = v();
    else if (k === '--text') a.text = v();
    else if (k === '--out') a.out = v();
    else if (k === '--format') a.format = v();
    else if (k === '--total') a.total = parseFloat(v());
    else if (k === '--cps') a.cps = parseFloat(v());
    else if (k === '--pause') a.pause = parseFloat(v());
    else if (k === '--col') a.col = parseInt(v(), 10);
    else if (k === '--font') a.font = v();
    else if (k === '--fontsize') a.fontsize = parseInt(v(), 10);
    else if (k === '--title') a.title = v();
    else if (k === '--base') a.base = v();
    else if (k === '-h' || k === '--help') a.help = true;
    else if (k === '--version') a.version = true;
  }
  return a;
}

const HELP = `video-subtitle-gen — voiceover script → SRT/LRC/ASS subtitles

Usage:
  node cli.mjs --file <script> [--out <dir>] [--format all|srt|lrc|ass]
               [--total <sec>] [--cps 4.5] [--pause 400] [--col <n>]
               [--font "sans-serif"] [--fontsize 56] [--title <str>] [--base <name>]

Input: one-line-per-sentence text/markdown; each line = one subtitle cue.
  - Leading [mm:ss] timecode anchor (only in --total mode, per-segment calibration)
  - Inline [pause] or 【pause】 marker: +300ms trailing silence in estimate mode (ignored in precise mode)
  - --col <n>: extract narration from storyboard table column n (0-based)
  - Auto-filtered: # headings/tags, --- rules, blank lines, | table rows (outside --col mode), - / > prefixes

Timing:
  - No --total: estimate by speaking rate (cps, chars/sec) + trailing silence per line
  - With --total: proportional split of total duration by character count (anchors split per-segment)

Output: <out>/<base>.{srt,lrc,ass} (srt/lrc with UTF-8 BOM, ass without)

Examples:
  node cli.mjs --file voiceover.md --out ./out
  node cli.mjs --file voiceover.md --out ./out --total 58
  node cli.mjs --file storyboard.md --col 2 --out ./out --total 60
`;

// ---------------- input cleaning ----------------
const ANCHOR_RE = /^\s*\[(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]\s*(.*)$/;
const HASH_RE = /^\s*#/;                   // # heading or #tag
const HR_RE = /^\s*([-*_])\1\1+[-*_\s]*$/; // --- /***/___
const TABLE_SEP_RE = /^\s*\|[-:\s|]+\|\s*$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const PAUSE_TEST_RE = /[【\[](停|pause)[】\]]/;
const PAUSE_RE = /[【\[](停|pause)[】\]]/g;

function extractLines(raw, col) {
  const out = [];
  const lines = raw.split(/\r?\n/);
  // skip YAML frontmatter block (--- ... ---) at top of file
  let i = 0;
  if (lines[0].trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    i++; // skip the closing ---
  }
  for (; i < lines.length; i++) {
    const line = lines[i];
    let text = line;
    if (col >= 0) {
      if (HASH_RE.test(line) || HR_RE.test(line) || TABLE_SEP_RE.test(line) || line.trim() === '') continue;
      if (!TABLE_ROW_RE.test(line)) continue;
      const cells = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(s => s.trim());
      text = cells[col] != null ? cells[col] : '';
    } else {
      // strip list/quote prefixes
      text = text.replace(/^\s*(?:[-*]\s+|>\s*)+/, '');
      if (line.trim() === '' || HASH_RE.test(text) || HR_RE.test(text) || TABLE_SEP_RE.test(text) || TABLE_ROW_RE.test(text)) continue;
    }
    // anchor
    let anchor = null;
    const m = text.match(ANCHOR_RE);
    if (m) {
      anchor = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
      text = m[3];
    }
    // pause marker
    let extraPause = 0;
    if (PAUSE_TEST_RE.test(text)) {
      extraPause = 300;
      text = text.replace(PAUSE_RE, ' ').replace(/\s+/g, ' ').trim();
    }
    text = text.trim();
    if (text === '') continue;
    out.push({ text, anchor, extraPause });
  }
  return out;
}

function charCount(text) {
  return [...text].length;
}

// ---------------- timing ----------------
function estimateTiming(subs, cps, pauseMs) {
  let t = 0;
  for (const s of subs) {
    const speak = s.chars / cps;
    s.start = t;
    s.end = t + speak;
    t += speak + (pauseMs + s.extraPause) / 1000;
  }
  return subs.length ? subs[subs.length - 1].end : 0;
}

function preciseTiming(subs, total) {
  const segs = [];
  let cur = { start: 0, indices: [] };
  for (let i = 0; i < subs.length; i++) {
    const a = subs[i].anchor;
    if (a != null && a > cur.start && a < total && cur.indices.length > 0) {
      cur.end = a;
      segs.push(cur);
      cur = { start: a, indices: [i] };
    } else {
      cur.indices.push(i);
    }
  }
  cur.end = total;
  segs.push(cur);

  for (const seg of segs) {
    const span = Math.max(0, seg.end - seg.start);
    const sum = seg.indices.reduce((acc, idx) => acc + subs[idx].chars, 0) || 1;
    let t = seg.start;
    for (const idx of seg.indices) {
      const dur = span * (subs[idx].chars / sum);
      subs[idx].start = t;
      subs[idx].end = t + dur;
      t += dur;
    }
  }
  if (subs.length) subs[subs.length - 1].end = Math.min(subs[subs.length - 1].end, total);
}

// ---------------- formatting ----------------
function pad(n, w) { return String(n).padStart(w, '0'); }

function srtTime(sec) {
  let ms = Math.round(sec * 1000);
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mmm = ms % 1000;
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(mmm, 3)}`;
}

function lrcTime(sec) {
  let ms = Math.round(sec * 1000);
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `[${pad(m, 2)}:${pad(s, 2)}.${pad(cs, 2)}]`;
}

function assTime(sec) {
  let cs = Math.round(sec * 100);
  if (cs < 0) cs = 0;
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${pad(m, 2)}:${pad(s, 2)}.${pad(c, 2)}`;
}

function fmtSrt(subs) {
  let out = '';
  subs.forEach((s, i) => {
    out += `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n\n`;
  });
  return out;
}

function fmtLrc(subs, title) {
  let head = '';
  if (title) head += `[ti:${title}]\n`;
  head += `[by:video-subtitle-gen]\n`;
  const total = subs.length ? subs[subs.length - 1].end : 0;
  head += `[length:${pad(Math.floor(total / 60), 2)}:${pad(Math.floor(total % 60), 2)}]\n`;
  let out = head + '\n';
  for (const s of subs) out += `${lrcTime(s.start)}${s.text}\n`;
  return out;
}

function fmtAss(subs, args) {
  const font = args.font, fs = args.fontsize;
  const header =
`[Script Info]
; Generated by video-subtitle-gen
; Timing is estimated or proportionally allocated — calibrate with the real recording
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${font},${fs},&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2.6,1.2,2,40,40,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  let out = header;
  for (const s of subs) {
    const text = s.text.replace(/\r?\n/g, '\\N');
    out += `Dialogue: 0,${assTime(s.start)},${assTime(s.end)},Default,,0,0,0,,${text}\n`;
  }
  return out;
}

// ---------------- main ----------------
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); process.exit(0); }
  if (args.version) { process.stdout.write(`video-subtitle-gen v${VERSION}\n`); process.exit(0); }

  let raw;
  if (args.file) {
    try { raw = readFileSync(args.file, 'utf8'); }
    catch (e) { process.stderr.write(`读取文件失败: ${args.file} — ${e.message}\n`); process.exit(2); }
  } else if (args.text != null) {
    raw = args.text;
  } else {
    process.stderr.write(`需要 --file <path> 或 --text <string>。--help 查看用法。\n`);
    process.exit(1);
  }

  const subs = extractLines(raw, args.col);
  if (subs.length === 0) {
    process.stderr.write(`未提取到任何字幕行。检查输入是否为"一行一句"，或 --col 列号是否正确。\n`);
    process.exit(3);
  }
  subs.forEach(s => { s.chars = charCount(s.text); });

  let totalReported;
  const precise = args.total != null && !Number.isNaN(args.total);
  if (precise) {
    preciseTiming(subs, args.total);
    totalReported = args.total;
  } else {
    totalReported = estimateTiming(subs, args.cps, args.pause);
  }

  let base = args.base;
  if (!base) base = args.file ? basename(args.file, extname(args.file)) : '字幕';

  mkdirSync(args.out, { recursive: true });

  const formats = args.format === 'all' ? ['srt', 'lrc', 'ass'] : [args.format];
  const BOM = '﻿';
  const paths = [];
  for (const f of formats) {
    const p = join(args.out, `${base}.${f}`);
    let content;
    if (f === 'srt') content = BOM + fmtSrt(subs);
    else if (f === 'lrc') content = BOM + fmtLrc(subs, args.title || base);
    else if (f === 'ass') content = fmtAss(subs, args);
    else { process.stderr.write(`未知格式: ${f}（可选 srt/lrc/ass/all）\n`); process.exit(1); }
    writeFileSync(p, content, 'utf8');
    paths.push(p);
  }

  for (const p of paths) process.stdout.write(`OUT: ${p}\n`);
  const mode = precise ? '精确' : '估算';
  process.stdout.write(`✓ ${subs.length} 条字幕 · ${mode}总时长 ${totalReported.toFixed(1)}s\n`);
}

main();
