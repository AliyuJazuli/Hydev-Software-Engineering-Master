# HYDEV SE

A local software-engineering mastery platform: lessons, hands-on labs with
real code execution, an evidence trail, and HYDEV AI as an in-app tutor.

## HYDEV AI (connecting a real model)

By default, HYDEV AI's chat panel runs on a small local rule-based tutor
engine (no internet, no API key needed) — it can give hints, explanations,
and code reviews, but it can only genuinely "understand" things it's been
explicitly coded to recognize.

To connect a real model (via [OpenRouter](https://openrouter.ai)) so HYDEV
AI can answer truly open-ended questions:

1. Go into the `data` folder and copy `ai-config.local.json.example`,
   pasting the copy in the same folder.
2. Rename the copy to exactly `ai-config.local.json` — **watch out for
   Windows hiding file extensions**: if you rename it in Notepad or File
   Explorer with extensions hidden, it can silently end up named
   `ai-config.local.json.txt` instead, which won't be picked up. If you're
   not sure, open a terminal in the project folder and run `dir data` (or
   `ls data` on macOS/Linux) and check the exact filename.
3. Open it and put in your OpenRouter API key and preferred model:
   ```json
   { "apiKey": "sk-or-v1-...", "model": "meta-llama/llama-3.1-8b-instruct:free" }
   ```
4. That's it — **no server restart needed**, the file is re-read on every
   chat message. `data/ai-config.local.json` is gitignored, so your key is
   never committed.

**How to check it actually worked**: open the HYDEV AI chat panel (bottom
right). Right under the header there's a status line:
- 🟢 green "Connected to OpenRouter (model: ...)" — it worked.
- 🟠 orange "Local tutor only — <specific reason>" — it didn't, and it
  tells you exactly why (file not found, wrong filename, invalid JSON,
  etc.) rather than just failing silently. Fix whatever it names, then
  close and reopen the chat panel to re-check — no reload needed.

The same status is also printed to the server's console log on startup.

If it's still not connecting after the status line says "Connected", the
problem is between the server and OpenRouter itself (bad/expired key, no
credit, rate limit, wrong model ID) — those errors show up as a chat reply
rather than the status line, since the status line only checks whether a
key is configured, not whether OpenRouter itself accepts it.

## Choosing a programming language (JavaScript or Kotlin)

Open Settings (⚙ icon, top right) → "Teach programming in" → JavaScript or
Kotlin. This changes the Programming pillar's lesson content, code
examples, and Labs starter code to match — it's a genuine content switch,
not just a per-challenge dropdown. Kotlin code execution in Labs requires
the Kotlin compiler (`kotlinc`) installed and on PATH; JavaScript always
works since it just uses Node.

## Running it

You need [Node.js](https://nodejs.org) installed. Then, from this folder:

```
npm start
```

This starts the local server (default `http://127.0.0.1:4173`). Open that
URL in your browser.

## One-click launcher (Windows)

Instead of running `npm start` and opening a browser tab manually every
time, you can use the smart launcher. It's idempotent: if the server is
already running, clicking it again just reopens the app instead of
starting a second server.

- **`se-start.bat`** — double-click this. It checks whether the server is
  already listening on port 4173:
  - If yes: does nothing to the server, just opens HYDEV SE.
  - If no: starts the server in the background and waits for it to be
    ready.

  Either way, it then decides how to open HYDEV SE:
  - **If HYDEV SE has already been installed as a PWA** (see below), it
    finds the shortcut that installation created and launches it directly
    -- so you get the real installed app, in its own window, with its own
    taskbar icon. Never a generic browser tab.
  - **If it hasn't been installed yet**, it opens a normal browser tab
    (address bar and all) instead of a chromeless app window, so the
    browser's install button/menu is actually visible to you.
- **`HYDEV SE.vbs`** — the same launcher, but completely silent (no
  console window flash). This is the one to actually turn into your
  desktop/taskbar icon.
- **`create-desktop-shortcut.ps1`** (or its wrapper,
  **`Create Desktop Shortcut.bat`**) — run this **once**. It adds a
  "HYDEV SE" shortcut to your Desktop, pointed at `HYDEV SE.vbs`, with the
  HYDEV icon (`assets/hydev-icon.ico`) already set. From there you can drag
  it to your Taskbar or pin it to Start.

### First-time setup: browser tab → install → real app

1. Run `Create Desktop Shortcut.bat` once.
2. Click the new "HYDEV SE" desktop icon. Since it isn't installed yet,
   this starts the server and opens a normal browser tab.
3. In that tab (Chrome or Edge), click the install icon in the address bar
   (or the browser menu → "Install HYDEV SE..."). This registers it as a
   real, OS-level PWA — it'll show up in Windows' installed-apps list, get
   its own icon, its own window, no address bar.
4. From then on, clicking the same "HYDEV SE" desktop icon detects the
   installed app and opens *that* directly (starting the server first,
   only if it isn't already running) — it will never open a plain Chrome
   tab again once step 3 is done.

The launcher can't install the PWA for you automatically — browsers
require an actual click on their own install control for that (it's a
deliberate security restriction), which is why step 3 is manual. Everything
else (starting the server, detecting what's installed, opening the right
thing) is automatic from then on.

### macOS / Linux

There's no equivalent one-click launcher script yet — run `npm start` (or
`node server/index.js`) and open the URL manually, or install the PWA from
the browser as described above (macOS/Linux browsers can't auto-start the
local server either, for the same sandboxing reason).

## Project layout

```
├── assets/            icons
├── css/                styles
├── data/               curriculum, challenges, config, rubrics (JSON)
├── js/                 app logic (curriculum, labs, evidence, HYDEV AI, etc.)
├── server/index.js     local static file server + code execution endpoint
├── index.html
├── manifest.json        PWA manifest
├── sw.js                minimal service worker
├── se-start.bat          launcher (visible console)
├── HYDEV SE.vbs          launcher (silent)
├── create-desktop-shortcut.ps1 / Create Desktop Shortcut.bat
└── start-hydev.ps1       the actual launcher logic (PowerShell)
```
