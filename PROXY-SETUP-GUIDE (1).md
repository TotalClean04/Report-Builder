# Permit & File-Review AI Reading — Setup Guide

The app reads permit pages AND case documents (File Review) with AI. Both go
through the same small helper program — the **proxy** — which holds your
Anthropic API key. This guide sets it up once (about 10 minutes).

Everything else in the app works **without** any of this: adding permit pages,
inserting them into Appendix B, dragging in File Review documents, and
typing/editing both lists by hand. The proxy is only needed for the two AI
buttons ("Read permits with AI" and "Read documents with AI").

---

## What you need
- The file `permit-proxy.js` (included).
- An Anthropic API key (instructions below).
- Node.js installed on the computer that will run the proxy.

---

## Step 1 — Get an Anthropic API key
1. Go to **https://console.anthropic.com**
2. Sign in (or create an account).
3. Open **Settings → API Keys → Create Key**.
4. Copy the key (it starts with `sk-ant-...`). Keep it private — anyone with it
   can use your account.
5. Add a little credit under **Billing** (reading a permit page costs a fraction
   of a cent).

## Step 2 — Install Node.js
1. Go to **https://nodejs.org** and download the **LTS** version.
2. Install it (accept the defaults).
3. To confirm it worked, open a terminal / command prompt and type:
   `node --version`  — you should see a version number.

## Step 3 — Add your key to the proxy
1. Open `permit-proxy.js` in any text editor (Notepad is fine).
2. Find the line near the top:
   `const ANTHROPIC_API_KEY = 'PASTE-YOUR-API-KEY-HERE';`
3. Replace `PASTE-YOUR-API-KEY-HERE` with your key (keep the quotes).
4. Save the file.

## Step 4 — Run the proxy
1. Open a terminal / command prompt.
2. Go to the folder that has `permit-proxy.js`. For example:
   `cd Downloads`  (or wherever you saved it)
3. Run:  `node permit-proxy.js`
4. You should see: `Permit proxy running at http://localhost:8787/read-permit`
5. **Leave this window open** while you use the app. Closing it stops the proxy.

That's it. Open the app, add permit pages, and click **Read permits with AI**.

---

## Sharing it with your whole company (later)
Right now the proxy runs on your computer, so only you can use it. To let everyone
use it, run the same file on an always-on server instead:

1. Get a small cloud server (e.g. DigitalOcean, Render, or Railway — about
   $5–6/month) or use your existing private server.
2. Copy `permit-proxy.js` onto it and run `node permit-proxy.js` there
   (tools like `pm2` keep it running 24/7).
3. That server has an address, e.g. `http://your-server-address:8787`.
4. In the app file, find this line near the permit code:
   `const PERMIT_AI_ENDPOINT = 'http://localhost:8787/read-permit';`
   and change `localhost` to your server's address:
   `const PERMIT_AI_ENDPOINT = 'http://your-server-address:8787/read-permit';`
5. Now everyone's app points at that one proxy. The key lives only on the server.

Nothing else changes — the app and the proxy are the same files either way.

---

## If the AI button says it can't reach the proxy
- Make sure the terminal window running `node permit-proxy.js` is still open.
- Make sure you pasted your API key in Step 3.
- Make sure the `PERMIT_AI_ENDPOINT` line in the app matches where the proxy runs
  (same address and port, `8787`).
- You can always add permits by hand with **+ Add permit** — the report still
  generates normally.

---

## About the PDF option
Dropping **image screenshots** of permits works everywhere.
Uploading a **PDF** (which the app splits into pages) needs the app to be *served*
from a web address — for example via GitHub Pages or your server — rather than
opened as a local file, because browsers restrict PDF processing on local files.
The two files `pdf.min.js` and `pdf.worker.min.js` must sit in the same folder as
the app for PDF splitting to work.
