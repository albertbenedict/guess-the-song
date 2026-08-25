# Guess the Song!

A song-guessing game: pick an artist (or a few), pick a mode and difficulty,
and try to name the song from the shortest possible clip.

## Running it

1. Open this folder in VS Code (`File > Open Folder...`).
2. Install the **Live Server** extension (by Ritwick Dey) from the Extensions tab.
3. Right-click `index.html` in the file explorer → **Open with Live Server**.
4. It opens at something like `http://127.0.0.1:5500` — that's it, working.


## Files

- `index.html` — page structure/markup
- `style.css` — theme (colors match your portfolio, light + dark mode) and layout
- `script.js` — game logic: artist search, fetching songs from iTunes, round
  flow, scoring, results screen
- `README.md` — this file

## How the game works

- Type an artist name in the search box and pick it from the dropdown — one
  iTunes call returns both the name and an album-cover thumbnail together
  (no separate slow lookups, no CORS-blocked calls).
- Choose a mode: **Normal** plays a fixed number of questions (± with the
  stepper). **Endless** keeps going until you fail to guess a song, then
  shows how many you got in a row and tracks your best run in this browser.
- Choose difficulty: Easy = well-known songs only, Medium = a weighted mix
  leaning toward well-known songs, Hard = fully random across the whole
  catalog fetched for that artist.
- "Hit" vs. "deep cut" is a heuristic (top ~20% of iTunes's search-relevance
  results per artist counts as a hit) — not real chart data, since that isn't
  available from a free, no-auth API.
- Each round plays a random point in the 30-second preview clip, always
  leaving at least 10 seconds of clip remaining.
- Guessing has its own autocomplete dropdown with album covers, filtered
  from the songs available for your chosen artist(s).
- Scoring: 500 / 400 / 300 / 200 / 100 points for guessing correctly at the
  0.1s / 0.5s / 2s / 5s / 10s reveal. A wrong guess automatically reveals a
  longer clip; Skip does the same without requiring a guess first. The
  album cover shows alongside both the correct-guess and reveal messages.
- The Back button (and the nav title, mid-game) opens a confirmation before
  leaving to the setup screen, so a misclick can't wipe a run.
- Light/dark toggle in the top-right, matching your portfolio's palette and
  remembered between visits (falls back to your OS preference first time).


## Recent fixes

- Replaced the artist-artwork lookup with a single combined API call —
  the old version chained up to 3 calls per suggestion, one of which
  (Deezer) can't actually be called from a browser at all (no CORS support),
  and used a placeholder image service that isn't reliable.
- Fixed a race condition where clicking a suggestion before its artwork
  finished loading left that row's avatar permanently blank.
- Removed a timing bug where the play button could unlock before the
  round's random start-offset had actually been calculated.
- Endless mode now pulls from a persistent shuffled pool instead of
  regenerating a fresh batch every 20 rounds, so songs can't repeat right
  at the seam between batches.
- Re-added album cover art to the guess dropdown and the correct/reveal
  feedback (these had dropped out of the last local edit).
