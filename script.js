const STAGES = [0.1, 0.5, 2, 5, 10];
const STAGE_POINTS = [500, 400, 300, 200, 100];
const MAX_ARTISTS = 5;

let state = {
  difficulty: 'easy',
  gameMode: 'normal',
  totalQuestions: 10,
  hitPool: [],
  nichePool: [],
  allPool: [],
  rounds: [],
  currentIndex: 0,
  score: 0,
  stageIndex: 0,
  startOffset: 0,
  clipDuration: 29,
  results: [],
  easyBag: [],
  hardBag: [],
  hitBag: [],
  nicheBag: []
};

const player = document.getElementById('player');
const artistList = document.getElementById('artist-list');
const addArtistBtn = document.getElementById('add-artist-btn');
const startBtn = document.getElementById('start-btn');
const setupError = document.getElementById('setup-error');
const setupStatus = document.getElementById('setup-status');

// Theme toggle
const themeSwitch = document.getElementById('theme-switch');
if (themeSwitch) {
  themeSwitch.checked = document.documentElement.getAttribute('data-theme') === 'dark';
  themeSwitch.addEventListener('change', () => {
    const newTheme = themeSwitch.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

// Game mode
const modeDesc = {
  normal: 'Fixed number of questions',
  endless: 'Keep playing until you fail'
};
const questionCountField = document.getElementById('question-count-field');
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.gameMode = btn.dataset.mode;
    questionCountField.style.display = state.gameMode === 'endless' ? 'none' : '';
    document.getElementById('mode-desc').textContent = modeDesc[btn.dataset.mode];
  });
});

// Number-of-questions stepper
const questionCountInput = document.getElementById('question-count');
document.getElementById('qty-minus').addEventListener('click', () => {
  questionCountInput.value = Math.max(3, (parseInt(questionCountInput.value, 10) || 10) - 1);
});
document.getElementById('qty-plus').addEventListener('click', () => {
  questionCountInput.value = Math.min(30, (parseInt(questionCountInput.value, 10) || 10) + 1);
});

// Artist search
async function searchArtists(query) {
  const url = 'https://itunes.apple.com/search?term=' + encodeURIComponent(query) + '&entity=song&limit=25';
  const res = await fetch(url);
  const data = await res.json();
  const seen = new Map();
  for (const item of (data.results || [])) {
    if (!item.artistId || !item.artistName) continue;
    if (!seen.has(item.artistId)) {
      seen.set(item.artistId, {
        artistId: item.artistId,
        artistName: item.artistName,
        genre: item.primaryGenreName || 'Artist',
        artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '200x200') : null
      });
    }
    if (seen.size >= 8) break;
  }
  return [...seen.values()];
}

function setupArtistAutocomplete(row) {
  const input = row.querySelector('.artist-input');
  const list = row.querySelector('.artist-suggestions');
  const avatar = row.querySelector('.artist-avatar');
  const combo = row.querySelector('.artist-combo');
  let debounceTimer = null;
  let currentResults = [];

  function updateAvatar() {
    if (input.dataset.artworkUrl) {
      avatar.src = input.dataset.artworkUrl;
      combo.classList.add('has-avatar');
    } else {
      combo.classList.remove('has-avatar');
      avatar.removeAttribute('src');
    }
  }

  function renderSuggestions() {
    if (currentResults.length === 0) {
      list.hidden = true;
      list.innerHTML = '';
      return;
    }
    list.innerHTML = '';
    currentResults.forEach(r => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      const imgHtml = r.artwork
        ? '<img class="suggestion-artwork" src="' + r.artwork + '" alt="" onerror="this.remove()">'
        : '<div class="suggestion-artwork art-fallback">' + r.artistName.charAt(0).toUpperCase() + '</div>';
      li.innerHTML = imgHtml +
        '<div class="suggestion-meta"><div class="suggestion-name">' + r.artistName + '</div><small class="suggestion-genre">' + r.genre + '</small></div>' +
        '<span class="suggestion-play">PLAY</span>';
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = r.artistName;
        input.dataset.artistId = r.artistId;
        input.dataset.artworkUrl = r.artwork || '';
        updateAvatar();
        list.hidden = true;
      });
      list.appendChild(li);
    });
    list.hidden = false;
  }

  input.addEventListener('input', () => {
    input.dataset.artistId = '';
    input.dataset.artworkUrl = '';
    updateAvatar();
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) {
      list.hidden = true;
      list.innerHTML = '';
      currentResults = [];
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        currentResults = await searchArtists(q);
        renderSuggestions();
      } catch (e) {
        list.hidden = true;
      }
    }, 300);
  });

  input.addEventListener('focus', () => {
    if (currentResults.length && input.value.trim().length >= 2) list.hidden = false;
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { list.hidden = true; }, 180);
  });
}

function updateAddArtistBtn() {
  const atLimit = artistList.children.length >= MAX_ARTISTS;
  addArtistBtn.disabled = atLimit;
  addArtistBtn.textContent = atLimit ? 'Maximum of 5 artists reached' : '+ Add another artist';
  addArtistBtn.style.cursor = atLimit ? 'default' : '';
  addArtistBtn.style.opacity = atLimit ? '0.6' : '';
}

function addArtistRow() {
  if (artistList.children.length >= MAX_ARTISTS) {
    updateAddArtistBtn();
    return;
  }
  const row = document.createElement('div');
  row.className = 'artist-row';

  const combo = document.createElement('div');
  combo.className = 'artist-combo';
  const avatar = document.createElement('img');
  avatar.className = 'artist-avatar';
  avatar.alt = '';
  const searchIcon = document.createElement('span');
  searchIcon.className = 'search-icon';
  searchIcon.textContent = '\u2315';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'artist-input';
  input.placeholder = 'Search an artist...';
  input.autocomplete = 'off';
  const suggestions = document.createElement('ul');
  suggestions.className = 'artist-suggestions';
  suggestions.hidden = true;
  combo.appendChild(avatar);
  combo.appendChild(searchIcon);
  combo.appendChild(input);
  combo.appendChild(suggestions);
  row.appendChild(combo);

  const rm = document.createElement('button');
  rm.type = 'button';
  rm.className = 'icon-btn';
  rm.textContent = '\u2715';
  rm.setAttribute('aria-label', 'Remove artist');
  rm.addEventListener('click', () => removeOrClearRow(row));
  row.appendChild(rm);

  artistList.appendChild(row);
  setupArtistAutocomplete(row);
  updateAddArtistBtn();
}

function removeOrClearRow(row) {
  if (artistList.children.length > 1) {
    row.remove();
    updateAddArtistBtn();
    return;
  }

  const input = row.querySelector('.artist-input');
  const combo = row.querySelector('.artist-combo');
  const avatar = row.querySelector('.artist-avatar');
  input.value = '';
  input.dataset.artistId = '';
  input.dataset.artworkUrl = '';
  combo.classList.remove('has-avatar');
  avatar.removeAttribute('src');
  input.focus();
}

addArtistRow();
updateAddArtistBtn();
addArtistBtn.addEventListener('click', () => addArtistRow());

const diffDesc = {
  easy: 'Most popular songs or hits',
  medium: 'Includes popular songs and some deep cuts', 
  hard: 'All songs from hits to rare tracks'
};
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.diff;
    document.getElementById('difficulty-desc').textContent = diffDesc[btn.dataset.diff];
  });
});

// Song fetching 
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/feat\.?.*$/i, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchArtistSongs(artistName, artistId) {
  const url = artistId
    ? 'https://itunes.apple.com/lookup?id=' + artistId + '&entity=song&limit=200'
    : 'https://itunes.apple.com/search?term=' + encodeURIComponent(artistName) + '&entity=song&limit=200';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  const query = artistName.trim().toLowerCase();
  const seen = new Set();
  const tracks = [];
  for (const item of (data.results || [])) {
    if (!item.previewUrl || !item.trackName || !item.artistName) continue;
    const artistLower = item.artistName.toLowerCase();
    if (!artistId && !artistLower.includes(query) && !query.includes(artistLower)) continue;
    const key = normalize(item.trackName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tracks.push({
      title: item.trackName,
      artist: item.artistName,
      previewUrl: item.previewUrl,
      artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '300x300') : null,
      sourceArtist: artistName
    });
  }
  return tracks;
}

function buildTiers(tracks) {
  const hitCount = Math.max(3, Math.min(tracks.length, Math.round(tracks.length * 0.2)));
  const hits = tracks.slice(0, hitCount).map(t => ({ ...t, tier: 'hit' }));
  const niche = tracks.slice(hitCount).map(t => ({ ...t, tier: 'niche' }));
  return { hits, niche };
}

function refillBagIfEmpty(bagKey, source) {
  if (state[bagKey].length === 0 && source.length) {
    state[bagKey] = shuffle(source);
  }
}

function pickOneRound() {
  const { difficulty, hitPool, nichePool, allPool } = state;
  if (difficulty === 'easy') {
    const source = hitPool.length ? hitPool : allPool;
    refillBagIfEmpty('easyBag', source);
    return state.easyBag.pop();
  }
  if (difficulty === 'hard') {
    refillBagIfEmpty('hardBag', allPool);
    return state.hardBag.pop();
  }
  const wantHit = Math.random() < 0.65;
  if (wantHit && hitPool.length) {
    refillBagIfEmpty('hitBag', hitPool);
    return state.hitBag.pop();
  }
  if (!wantHit && nichePool.length) {
    refillBagIfEmpty('nicheBag', nichePool);
    return state.nicheBag.pop();
  }
  refillBagIfEmpty('hardBag', allPool);
  return state.hardBag.pop();
}

// Setup -> Start
startBtn.addEventListener('click', async () => {
  // Unlock AudioContext synchronously inside user gesture (before any await) for iPhone 0.1s
  try { getAudioCtx(); } catch (e) { }
  setupError.classList.remove('show');
  const rows = [...artistList.querySelectorAll('.artist-row')];
  const artistData = rows.map(row => {
    const input = row.querySelector('.artist-input');
    return { name: input.value.trim(), id: input.dataset.artistId || null };
  }).filter(a => a.name);

  if (artistData.length === 0) {
    setupError.textContent = 'Enter at least one artist first.';
    setupError.classList.add('show');
    return;
  }

  const n = parseInt(questionCountInput.value, 10) || 10;
  state.totalQuestions = Math.max(3, Math.min(30, n));

  startBtn.disabled = true;
  setupStatus.classList.add('show');

  try {
    let allHits = [], allNiche = [], all = [];
    for (const a of artistData) {
      setupStatus.textContent = 'Fetching ' + a.name + '...';
      const tracks = await fetchArtistSongs(a.name, a.id);
      if (tracks.length === 0) {
        throw new Error('No songs found for "' + a.name + '". Try picking it from the search suggestions.');
      }
      const { hits, niche } = buildTiers(tracks);
      allHits = allHits.concat(hits);
      allNiche = allNiche.concat(niche);
      all = all.concat(tracks);
    }
    state.hitPool = allHits;
    state.nichePool = allNiche;
    state.allPool = all;
    state.easyBag = [];
    state.hardBag = [];
    state.hitBag = [];
    state.nicheBag = [];

    state.currentIndex = 0;
    state.score = 0;
    state.results = [];

    if (state.gameMode === 'endless') {
      state.rounds = [pickOneRound()];
      document.getElementById('q-total').textContent = '\u221e';
    } else {
      state.rounds = Array.from({ length: state.totalQuestions }, () => pickOneRound());
      document.getElementById('q-total').textContent = state.totalQuestions;
    }
    document.getElementById('q-score').textContent = '0';
    document.getElementById('final-score-extra').style.display = 'none';

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    loadRound();
  } catch (err) {
    setupError.textContent = err.message || 'Something went wrong fetching songs.';
    setupError.classList.add('show');
  } finally {
    startBtn.disabled = false;
    setupStatus.classList.remove('show');
  }
});

// Game screen
const discBtn = document.getElementById('disc-btn');
const stageRow = document.getElementById('stage-row');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('next-btn');
const skipBtn = document.getElementById('skip-btn');
const guessForm = document.getElementById('guess-form');
const guessInput = document.getElementById('guess-input');
const songSuggestions = document.getElementById('song-suggestions');
let playTimer = null;

function renderStages() {
  stageRow.innerHTML = '';
  STAGES.forEach((s, i) => {
    const dot = document.createElement('div');
    dot.className = 'stage-dot' + (i === state.stageIndex ? ' current' : (i < state.stageIndex ? ' done' : ''));
    dot.textContent = s + 's';
    stageRow.appendChild(dot);
  });
}

function hideSongSuggestions() {
  songSuggestions.hidden = true;
  songSuggestions.innerHTML = '';
}

function renderSongSuggestions(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 1 || !state.allPool.length) {
    hideSongSuggestions();
    return;
  }
  const matches = state.allPool.filter(t => t.title.toLowerCase().includes(q)).slice(0, 8);
  if (matches.length === 0) {
    hideSongSuggestions();
    return;
  }
  songSuggestions.innerHTML = '';
  matches.forEach(t => {
    const li = document.createElement('li');
    li.className = 'suggestion-item song';
    const imgHtml = t.artwork
      ? '<img class="suggestion-artwork" src="' + t.artwork + '" alt="" onerror="this.remove()">'
      : '<div class="suggestion-artwork art-fallback">' + t.artist.charAt(0).toUpperCase() + '</div>';
    li.innerHTML = imgHtml + '<div class="suggestion-meta"><div class="suggestion-name">' + t.title + '</div><small class="suggestion-genre">' + t.artist + '</small></div>';
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      guessInput.value = t.title;
      hideSongSuggestions();
      guessInput.focus();
    });
    songSuggestions.appendChild(li);
  });
  songSuggestions.hidden = false;
}

guessInput.addEventListener('input', () => renderSongSuggestions(guessInput.value));
guessInput.addEventListener('focus', () => renderSongSuggestions(guessInput.value));
guessInput.addEventListener('blur', () => setTimeout(hideSongSuggestions, 150));

// Web Audio - true 0.1s on all devices
let audioCtx = null;
let audioBuffer = null;
let currentSource = null;
let gainNode = null;
let audioLoadToken = 0;
let skipLocked = false;
let nextLocked = false;

function stopAudio() {
  if (currentSource) {
    try { currentSource.onended = null; currentSource.stop(); } catch (e) { }
    currentSource = null;
  }
  clearTimeout(playTimer);
  playTimer = null;
  try { player.pause(); } catch (e) { }
  discBtn.classList.remove('spinning');
  if (gainNode && audioCtx) {
    try {
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(parseFloat(document.getElementById('volume').value) || 0.8, audioCtx.currentTime);
    } catch (e) { }
  }
}

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = parseFloat(document.getElementById('volume').value) || 0.8;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
document.getElementById('volume').addEventListener('input', (e) => {
  if (gainNode) gainNode.gain.value = parseFloat(e.target.value);
  player.volume = parseFloat(e.target.value);
});

async function loadAudioBuffer(url) {
  const ctx = getAudioCtx();
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  return await ctx.decodeAudioData(arr);
}

function loadRound() {
  stopAudio();
  const myToken = ++audioLoadToken;
  state.stageIndex = 0;
  feedbackEl.className = 'feedback';
  feedbackEl.textContent = '';
  feedbackEl.style.display = 'none';
  nextBtn.style.display = 'none';
  nextBtn.textContent = 'Next question';
  skipBtn.style.display = 'inline-block';
  guessForm.style.display = '';
  guessInput.value = '';
  guessInput.disabled = false;
  hideSongSuggestions();
  document.getElementById('q-current').textContent = state.currentIndex + 1;
  renderStages();

  const round = state.rounds[state.currentIndex];
  audioBuffer = null;
  player.pause();
  discBtn.disabled = true;


  loadAudioBuffer(round.previewUrl).then(buf => {
    if (myToken !== audioLoadToken) return; // superseded by Next/skip spam
    audioBuffer = buf;
    state.clipDuration = buf.duration;
    state.startOffset = Math.random() * Math.max(0, buf.duration - 10);
    discBtn.disabled = false;
  }).catch(() => {
    if (myToken !== audioLoadToken) return;
    player.preload = 'auto';
    player.src = round.previewUrl;
    player.load();
    const onMeta = () => {
      const dur = isFinite(player.duration) && player.duration > 0 ? player.duration : 29;
      state.clipDuration = dur;
      state.startOffset = Math.random() * Math.max(0, dur - 10);
      discBtn.disabled = false;
    };
    player.addEventListener('loadedmetadata', onMeta, { once: true });
    player.addEventListener('error', () => onMeta(), { once: true });
    setTimeout(onMeta, 3000);
  });

  // Preload next round buffer in background
  const nextRound = state.rounds[state.currentIndex + 1];
  if (nextRound && nextRound.previewUrl) {
    loadAudioBuffer(nextRound.previewUrl).catch(() => { });
  }
}

function playSnippet() {
  stopAudio();
  discBtn.classList.add('spinning');
  const duration = STAGES[state.stageIndex]; // true 0.1 on all devices

  if (audioBuffer && audioCtx) {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(gainNode);
    currentSource = src;
    const startAt = Math.min(state.startOffset, Math.max(0, audioBuffer.duration - duration - 0.05));
    try {
      src.start(0, startAt, duration);
    } catch (e) {
      try { src.start(); } catch (e2) { }
    }
    src.onended = () => {
      if (currentSource !== src) return;
      discBtn.classList.remove('spinning');
      currentSource = null;
    };
    clearTimeout(playTimer);
    playTimer = setTimeout(() => {
      if (currentSource !== src) return;
      try { src.stop(); } catch (e) { }
      discBtn.classList.remove('spinning');
      currentSource = null;
    }, duration * 1000 + 80);
    return;
  }

  // Fallback: HTMLAudio (for decode failure)
  try { player.currentTime = state.startOffset; } catch (e) { }
  player.volume = parseFloat(document.getElementById('volume').value);
  const p = player.play();
  if (p && p.catch) p.catch(() => discBtn.classList.remove('spinning'));
  const len = duration * 1000;
  playTimer = setTimeout(() => {
    player.pause();
    discBtn.classList.remove('spinning');
  }, len);
}

discBtn.addEventListener('click', playSnippet);
player.addEventListener('pause', () => discBtn.classList.remove('spinning'));
player.addEventListener('ended', () => discBtn.classList.remove('spinning'));

function endRound(correct, pointsEarned) {
  stopAudio();
  guessInput.disabled = true;
  guessForm.style.display = 'none';
  hideSongSuggestions();
  skipBtn.style.display = 'none';
  nextBtn.style.display = 'inline-block';

  const round = state.rounds[state.currentIndex];
  state.score += pointsEarned;
  document.getElementById('q-score').textContent = state.score;
  state.results.push({ title: round.title, artist: round.artist, points: pointsEarned, correct });

  const coverHtml = round.artwork ? '<img class="reveal-cover" src="' + round.artwork + '" alt="" onerror="this.remove()">' : '';
  feedbackEl.className = 'feedback ' + (correct ? 'correct' : 'wrong');
  feedbackEl.style.display = 'block';
  const isLastNormal = state.gameMode !== 'endless' && state.currentIndex >= state.rounds.length - 1;
  if (correct) {
    feedbackEl.innerHTML = coverHtml + '<b>Correct! +' + pointsEarned + ' pts</b>' + round.title + ' - ' + round.artist;
    nextBtn.textContent = isLastNormal ? 'View score' : (state.gameMode === 'endless' ? 'Next song' : 'Next question');
  } else {
    if (state.gameMode === 'endless') {
      feedbackEl.innerHTML = coverHtml + '<b>Game over! The song was:</b>' + round.title + ' - ' + round.artist;
      nextBtn.textContent = 'View results';
    } else {
      feedbackEl.innerHTML = coverHtml + '<b>The song was:</b>' + round.title + ' - ' + round.artist;
      nextBtn.textContent = isLastNormal ? 'View score' : 'Next question';
    }
  }

  // Play rest of preview with 1.5s fade 
  const fullPreviewLen = Math.min(10, (audioBuffer ? audioBuffer.duration : state.clipDuration) - state.startOffset);
  if (fullPreviewLen > 0.3) {
    if (audioBuffer && audioCtx) {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(gainNode);
      currentSource = src;
      discBtn.classList.add('spinning');
      const baseGain = parseFloat(document.getElementById('volume').value) || 0.8;
      const fadeDur = Math.min(1.5, fullPreviewLen * 0.4);
      try {
        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.setValueAtTime(baseGain, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(baseGain, ctx.currentTime + fullPreviewLen - fadeDur);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + fullPreviewLen);
      } catch(e) {}
      src.onended = () => {
        discBtn.classList.remove('spinning');
        if (currentSource === src) currentSource = null;
        try { gainNode.gain.cancelScheduledValues(ctx.currentTime); gainNode.gain.setValueAtTime(baseGain, ctx.currentTime); } catch(e) {}
      };
      try { src.start(0, state.startOffset, fullPreviewLen); } catch(e) { try { src.start(); } catch(e2) {} }
      clearTimeout(playTimer);
      playTimer = setTimeout(() => {
        try { src.stop(); } catch(e) {}
        discBtn.classList.remove('spinning');
        if (currentSource === src) currentSource = null;
        try { gainNode.gain.cancelScheduledValues(ctx.currentTime); gainNode.gain.setValueAtTime(baseGain, ctx.currentTime); } catch(e) {}
      }, fullPreviewLen * 1000 + 80);
    } else {
      try { player.currentTime = state.startOffset; } catch(e) {}
      player.volume = parseFloat(document.getElementById('volume').value) || 0.8;
      player.play().catch(()=>{});
      discBtn.classList.add('spinning');
      // HTMLAudio fade via interval
      const fadeDur = Math.min(1500, fullPreviewLen * 400);
      const fadeStart = Math.max(0, fullPreviewLen * 1000 - fadeDur);
      setTimeout(() => {
        const startVol = player.volume;
        const steps = 20;
        let s = 0;
        const iv = setInterval(() => {
          s++;
          player.volume = Math.max(0, startVol * (1 - s/steps));
          if (s >= steps) clearInterval(iv);
        }, fadeDur / steps);
      }, fadeStart);
      clearTimeout(playTimer);
      playTimer = setTimeout(() => {
        player.pause();
        player.volume = parseFloat(document.getElementById('volume').value) || 0.8;
        discBtn.classList.remove('spinning');
      }, fullPreviewLen * 1000);
    }
  }
}

function advanceStage() {
  if (skipLocked) return;
  if (state.stageIndex >= STAGES.length - 1) {
    endRound(false, 0);
    return;
  }
  skipLocked = true;
  skipBtn.disabled = true;
  state.stageIndex += 1;
  renderStages();
  feedbackEl.className = 'feedback';
  feedbackEl.textContent = '';
  feedbackEl.style.display = 'none';
  playSnippet();
  setTimeout(() => { skipLocked = false; skipBtn.disabled = false; }, 350);
}

guessForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = guessInput.value.trim();
  if (!val) return;
  const round = state.rounds[state.currentIndex];
  if (!round) return;
  if (normalize(val) === normalize(round.title)) {
    endRound(true, STAGE_POINTS[state.stageIndex]);
  } else {
    hideSongSuggestions();
    feedbackEl.className = 'feedback wrong';
    feedbackEl.style.display = 'block';
    feedbackEl.innerHTML = '<b>Not quite</b>Moving to a longer clip...';
    guessInput.value = '';
    guessInput.disabled = true;
    setTimeout(() => {
      guessInput.disabled = false;
      advanceStage();
    }, 700);
  }
});

skipBtn.addEventListener('click', () => {
  hideSongSuggestions();
  advanceStage();
});

nextBtn.addEventListener('click', () => {
  stopAudio();

  const lastResult = state.results[state.results.length - 1];
  if (state.gameMode === 'endless' && lastResult && !lastResult.correct) {
    showResults();
    return;
  }
  state.currentIndex += 1;
  if (state.gameMode === 'endless') {
    state.rounds.push(pickOneRound());
    loadRound();
  } else {
    if (state.currentIndex >= state.rounds.length) {
      showResults();
    } else {
      loadRound();
    }
  }
});

// Back button + exit modal
const backBtn = document.getElementById('back-btn');
const exitModal = document.getElementById('exit-modal');
const exitCancelBtn = document.getElementById('exit-cancel-btn');
const exitConfirmBtn = document.getElementById('exit-confirm-btn');

function showExitModal() {
  exitModal.classList.remove('hidden');
  exitModal.setAttribute('aria-hidden', 'false');
}
function hideExitModal() {
  exitModal.classList.add('hidden');
  exitModal.setAttribute('aria-hidden', 'true');
}

function returnToSetup() {
  stopAudio();
  ++audioLoadToken; // invalidate any pending loadAudioBuffer
  player.removeAttribute('src');
  player.load();
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('results-screen').classList.remove('active');
  document.getElementById('setup-screen').classList.add('active');
  feedbackEl.className = 'feedback';
  feedbackEl.textContent = '';
  feedbackEl.style.display = 'none';
  hideExitModal();
}

backBtn.addEventListener('click', () => showExitModal());
exitCancelBtn.addEventListener('click', () => hideExitModal());
exitConfirmBtn.addEventListener('click', () => returnToSetup());
exitModal.addEventListener('click', (e) => { if (e.target === exitModal) hideExitModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !exitModal.classList.contains('hidden')) hideExitModal();
});

const navHomeLink = document.getElementById('nav-home-link');
navHomeLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (document.getElementById('game-screen').classList.contains('active')) {
    showExitModal();
  } else if (document.getElementById('results-screen').classList.contains('active')) {
    returnToSetup();
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// Results
function showResults() {
  stopAudio();
  ++audioLoadToken;
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('results-screen').classList.add('active');
  document.getElementById('final-score-num').textContent = state.score;

  const ofEl = document.getElementById('final-score-of');
  const extraEl = document.getElementById('final-score-extra');

  if (state.gameMode === 'endless') {
    const correctCount = state.results.filter(r => r.correct).length;
    ofEl.textContent = correctCount + ' correct, ' + state.results.length + ' played';
    const key = 'endlessHighScore';
    const prevHigh = parseInt(localStorage.getItem(key) || '0', 10);
    let msg = '';
    if (state.score > prevHigh) {
      localStorage.setItem(key, String(state.score));
      msg = 'New high score! Previous: ' + prevHigh;
    } else if (prevHigh > 0) {
      msg = 'High score: ' + prevHigh;
    }
    if (msg) {
      extraEl.textContent = msg;
      extraEl.style.display = 'block';
    } else {
      extraEl.style.display = 'none';
    }
  } else {
    ofEl.textContent = 'out of ' + (state.rounds.length * STAGE_POINTS[0]);
    extraEl.style.display = 'none';
  }

  const list = document.getElementById('results-list');
  list.innerHTML = '';
  state.results.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = '<div><div class="rtitle">' + r.title + '</div><div class="rartist">' + r.artist + '</div></div>' +
      '<div class="rpts ' + (r.points > 0 ? 'won' : 'zero') + '">' + (r.points > 0 ? '+' + r.points : '0') + '</div>';
    list.appendChild(li);
  });
}

document.getElementById('play-again-btn').addEventListener('click', () => {
  document.getElementById('results-screen').classList.remove('active');
  document.getElementById('setup-screen').classList.add('active');
  player.pause();
  discBtn.classList.remove('spinning');
});
