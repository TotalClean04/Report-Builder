// ============================================================
//  Permit-reading proxy for the Report Builder app
//  ------------------------------------------------------------
//  This little server sits between your app and Anthropic.
//  It holds your API key (the app never sees it) and relays
//  permit-page images to Claude, returning structured permits.
//
//  SETUP (one time):
//    1. Install Node.js  ->  https://nodejs.org  (LTS version)
//    2. Put your Anthropic API key in the line below.
//    3. In a terminal, in this folder, run:   node permit-proxy.js
//    4. Leave it running. Point the app's PERMIT_AI_ENDPOINT at it.
//
//  No extra libraries needed — this uses only what ships with Node.
// ============================================================

// ---- 1. YOUR SETTINGS ----------------------------------------------------
const ANTHROPIC_API_KEY = 'PASTE-YOUR-API-KEY-HERE'; // <-- put your key here
const PORT = 8787;                                    // must match the app
const MODEL = 'claude-sonnet-4-6';                    // vision-capable model
// -------------------------------------------------------------------------

const http = require('http');
const https = require('https');

// The instruction we give Claude for every permit page.
const SYSTEM_PROMPT =
  'You are reading a scanned building-permit document (one page). ' +
  'Extract every distinct permit visible on the page. For each permit return: ' +
  'number (the permit number), date (MM/DD/YYYY if present, else empty), ' +
  'type (the work class / permit type, e.g. Roofing, Building, Plumbing, Electrical, Mechanical), ' +
  'description (a short summary of the work). ' +
  'Also set "relevant" to true when the permit relates to the building envelope or storm/roof damage ' +
  '(keywords like roof, re-roof, shingle, truss, building, structural, window, siding, wind) ' +
  'and false for clearly unrelated work (e.g. plumbing, pool, solar) — but ALWAYS still return the permit either way, ' +
  'just with relevant=false, so the user can decide. ' +
  'Respond with ONLY a JSON object of the form {"permits":[{"number","date","type","description","relevant"}]} and nothing else.';

function callAnthropic(mediaType, imageBase64) {
  return new Promise(function (resolve, reject) {
    const payload = JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: 'Extract the permits from this page as JSON.' }
        ]
      }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, function (res) {
      let body = '';
      res.on('data', function (c) { body += c; });
      res.on('end', function () {
        try {
          const data = JSON.parse(body);
          const text = (data.content || []).map(function (b) { return b.text || ''; }).join('');
          // pull the JSON object out of the reply
          const match = text.match(/\{[\s\S]*\}/);
          const parsed = match ? JSON.parse(match[0]) : { permits: [] };
          resolve(parsed);
        } catch (e) {
          reject(new Error('Bad response from Anthropic: ' + body.slice(0, 300)));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const server = http.createServer(function (req, res) {
  // Allow the app (running in a browser) to call this proxy.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/read-permit') {
    let body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () {
      let parsed;
      try { parsed = JSON.parse(body); }
      catch (e) { res.writeHead(400); res.end('{"error":"bad json"}'); return; }

      callAnthropic(parsed.media_type || 'image/png', parsed.image_base64)
        .then(function (result) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        })
        .catch(function (err) {
          console.error(err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, function () {
  console.log('Permit proxy running at http://localhost:' + PORT + '/read-permit');
  if (ANTHROPIC_API_KEY.indexOf('PASTE') === 0) {
    console.log('\n  ⚠  You have not set your API key yet.');
    console.log('     Open this file and paste your key into ANTHROPIC_API_KEY.\n');
  }
});
