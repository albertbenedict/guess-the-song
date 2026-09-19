let cachedToken = null;
let tokenExp = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExp - 60000) return cachedToken;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Missing SPOTIFY_CLIENT_ID/SECRET env');
  const creds = Buffer.from(id + ':' + secret).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + creds,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('Spotify token ' + res.status + ' ' + await res.text());
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExp = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing q' });
  try {
    const token = await getToken();
    const url = 'https://api.spotify.com/v1/search?q=' + encodeURIComponent(q) + '&type=track&limit=1&market=US';
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const j = await r.json();
    const hit = j.tracks?.items?.[0];
    return res.status(200).json({
      popularity: hit ? hit.popularity : 50,
      name: hit ? hit.name : null,
      artists: hit ? hit.artists.map(a => a.name).join(', ') : null,
      preview: hit ? hit.preview_url : null
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
