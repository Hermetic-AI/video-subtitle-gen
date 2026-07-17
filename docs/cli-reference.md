# CLI Reference

Full flag reference and usage examples for `cli.mjs`.

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--file <path>` | — | Input file (mutually exclusive with `--text`) |
| `--text <string>` | — | Input text literal |
| `--out <dir>` | `./out` | Output directory (auto-created) |
| `--format <f>` | `all` | `srt` / `lrc` / `ass` / `all` |
| `--total <sec>` | — | Target total duration. Supply real recording length to calibrate |
| `--cps <float>` | `4.5` | Speaking rate, chars/sec (faster 5–6, slower 3.5–4) |
| `--pause <ms>` | `400` | Trailing silence per line |
| `--col <n>` | — | Storyboard column index (0-based), enables column-extraction mode |
| `--font <name>` | `sans-serif` | ASS font |
| `--fontsize <int>` | `56` | ASS font size |
| `--title <str>` | — | LRC / ASS title metadata |
| `--base <name>` | input filename | Output filename base |
| `-h`, `--help` | — | Show help |
| `--version` | — | Show version |

## Timing modes

| Mode | Trigger | Algorithm |
|------|---------|-----------|
| **Estimate** | no `--total` | per-line duration = char count ÷ `--cps` + trailing silence (`--pause` +300ms at `【pause】`) |
| **Precise** | `--total <sec>` | proportional split of total duration by character count; anchors split per-segment |

## Output files

- `<base>.srt` — UTF-8 BOM (CJK renders correctly in Windows players / CapCut)
- `<base>.lrc` — `[ti:][by:][length:]` metadata header
- `<base>.ass` — bottom-center style (sans-serif / size 56 / white-on-black)

stdout prints `OUT: <path>` per file, then a summary line:
```
OUT: ./out/script.srt
OUT: ./out/script.lrc
OUT: ./out/script.ass
✓ 14 subtitles · estimated total 58.3s
```

## Usage examples

```bash
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"

# Draft estimate
node "$SKILL_DIR/cli.mjs" --file script.md --out ./out

# Calibrate with real recording length
node "$SKILL_DIR/cli.mjs" --file script.md --out ./out --total 58

# Anchored calibration (lines with [mm:ss] anchors + --total)
node "$SKILL_DIR/cli.mjs" --file script-anchored.md --out ./out --total 58

# Extract narration from storyboard table column 2
node "$SKILL_DIR/cli.mjs" --file storyboard.md --out ./out --col 2 --total 60

# SRT only
node "$SKILL_DIR/cli.mjs" --file script.md --out ./out --format srt

# From a text literal
node "$SKILL_DIR/cli.mjs" --text "First line of narration" --out ./out
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | missing `--file` or `--text` |
| 2 | file read error |
| 3 | no subtitle lines extracted |
