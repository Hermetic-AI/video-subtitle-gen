# Voiceover Script Writing Guide

How to write scripts that the CLI turns into great subtitles.

## One line = one subtitle cue

Each line in your `.md` becomes one subtitle on screen. Split by **sense group**, not by grammar:

```
# good — one thought per line
Here is how I automated my morning routine
all of it runs while I am still hitting snooze

# bad — one long line
Here is how I automated my morning routine all of it runs while I am still hitting snooze
```

Target **15–25 chars/line**, max 35. The CLI shows ~2 lines at a time; longer lines overflow.

## Use 【pause】 for rhythm

Add `【pause】` where the voice should breathe. The CLI:
- Adds +300ms trailing silence (estimate mode only)
- Strips the marker from the displayed subtitle text

```
First, a script pulls my calendar and to-do list
then it picks the three things that actually matter today【pause】
```

## Spoken language, not written

Write the way people actually talk:

- Use "I", "you", "we" — not "one should"
- Short sentences, fragments, filler words all stay
- Read it aloud. If you stumble, shorten it.

## Timecode anchors [mm:ss]

Pin a line's start time by prepending `[mm:ss]`. Used with `--total` for per-segment calibration:

```
[00:00] Here is how I automated my morning routine
[00:06] all of it runs while I am still hitting snooze
```

Rules:
- Anchors only work with `--total`
- Must be strictly increasing
- Must be inside `(0, total)`

## Storyboard table + narration in one file

Put both sections in the same `.md`. The CLI auto-filters the table and keeps only the narration:

```markdown
---
title: My Video Script
platform: TikTok
---

## Storyboard Table

| # | Visual | Narration | Est. |
|---|--------|-----------|------|
| 1 | Dashboard view | Here is my workflow | ~5s |

## One-Line Narration

Here is my workflow
it runs while I sleep【pause】
```

The `---` frontmatter block is also auto-skipped.

## Numbers and English

The CLI counts by character. "GitHub" (7 chars) reads faster than 7 CJK chars. Calibrate with `--total` at the end, or tune `--cps` manually (default 4.5 chars/sec).
