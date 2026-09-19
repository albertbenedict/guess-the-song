# Guess the Song! — [Play → https://albertbenedict.github.io/guess-the-song/](https://albertbenedict.github.io/guess-the-song/)

A song-guessing game: pick 1–5 artists, guess from the shortest clip you can (0.1s → 10s).

![Setup screenshot](screenshot.png)

## Running it
1. VS Code → `File > Open Folder...` → this folder
2. Install **Live Server** → right-click `index.html` → **Open with Live Server**
3. Opens at `http://localhost:5500` — or just use the Play link above.

## Features
- **Modes:** Normal (3–30 Q) / Endless (∞ until fail, best run saved)
- **Difficulty:** Easy (balanced hits, every artist shows up) / Medium (mix) / Hard (all songs)
- **Clips:** 0.1s / 0.5s / 2s / 5s / 10s → 500 / 400 / 300 / 200 / 100 pts. Wrong guess reveals a longer clip.
- **Extras:** 1–5 artists, light/dark theme, keyboard shortcuts (arrows + Enter + Space to replay).

## How to play
1. Type an artist → pick from the dropdown.
2. Pick mode + difficulty → **Start game**.
3. Tap the disc → type your guess → **Guess** (or **Skip** for a longer clip).

## Tech
- Vanilla `index.html / style.css / script.js`, no build.
- **Audio:** Web Audio for exact 0.1s clips, `<audio>` fallback.
- **APIs:** iTunes (songs + 30s previews) + YouTube (artist photos) + Spotify (hit ranking via `api/spotify.js` proxy, iTunes still plays audio).

## Known limits
- 30s previews only; YouTube photos need 100 free lookups/day (repeats are cached).
