const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { URL } = require('url');

const root = path.resolve(__dirname, '..');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function safeFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}`).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(root, relative);
  return filePath.startsWith(`${root}${path.sep}`) ? filePath : null;
}

function readRequestBody(request, callback) {
  let body = '';
  request.on('data', chunk => {
    body += chunk;
    if (body.length > 100000) request.destroy(new Error('Request too large'));
  });
  request.on('end', () => callback(null, body));
  request.on('error', error => callback(error));
}

function executeCode(language, code, callback) {
  if (language === 'kotlin') {
    executeKotlin(code, callback);
    return;
  }

  const commands = {
    javascript: { command: process.execPath, args: ['-e', code] },
    python: {
      command: process.platform === 'win32' ? 'py' : 'python3',
      args: process.platform === 'win32' ? ['-3', '-c', code] : ['-c', code]
    }
  };
  const runtime = commands[language];
  if (!runtime) {
    callback(null, { ok: false, error: 'This language is not available in the local runner yet. JavaScript runs with Node.js. Python requires Python 3 to be installed. Kotlin requires a Kotlin compiler (kotlinc) on PATH.' });
    return;
  }

  runProcess(runtime.command, runtime.args, language, callback);
}

// Kotlin script files (.kts) execute top-level statements directly and do
// NOT auto-invoke a `fun main()` the way a compiled Kotlin program's JVM
// entry point does -- that's a compiled-program convention, not a script
// one. A `fun main() { ... }` that's never explicitly called produces
// *zero output*, silently. Since idiomatic Kotlin (and what learners are
// taught) is to wrap runnable code in `fun main()`, we auto-append an
// explicit `main()` call when the script defines one but doesn't already
// call it -- rather than relying on every starter/submission to remember
// to call it themselves.
function ensureMainInvoked(code) {
  const mainFnDeclarations = code.match(/\bfun\s+main\s*\([^)]*\)/g) || [];
  if (mainFnDeclarations.length === 0) return code; // no main() defined -- plain top-level script, leave as-is
  const allMainReferences = code.match(/\bmain\s*\(/g) || [];
  if (allMainReferences.length > mainFnDeclarations.length) return code; // already called somewhere
  return `${code}\nmain()\n`;
}

// Kotlin has no "-e/-c inline code" flag like node/python, so the code is
// written to a temporary .kts (Kotlin script) file and run with
// `kotlinc -script <file>`. This requires the Kotlin compiler (kotlinc) to
// be installed and on PATH -- if it isn't, this fails the same way Python
// does when python3 is missing: a clear message, not a silent no-op.
function executeKotlin(code, callback) {
  const scriptPath = path.join(os.tmpdir(), `hydev-kotlin-${Date.now()}-${Math.random().toString(36).slice(2)}.kts`);
  fs.writeFile(scriptPath, ensureMainInvoked(code), writeError => {
    if (writeError) {
      callback(null, { ok: false, error: `Could not prepare the Kotlin script file: ${writeError.message}` });
      return;
    }
    const cleanup = () => fs.unlink(scriptPath, () => {});
    const command = process.platform === 'win32' ? 'kotlinc.bat' : 'kotlinc';
    runProcess(command, ['-script', scriptPath], 'kotlin', (error, result) => {
      cleanup();
      callback(error, result);
    });
  });
}

function runProcess(command, args, language, callback) {
  const windowsBatchFile = process.platform === 'win32' && /\.(bat|cmd)$/i.test(command);
  const options = {
    cwd: os.tmpdir(),
    env: { PATH: process.env.PATH || '', SystemRoot: process.env.SystemRoot || '' },
    shell: windowsBatchFile,
    windowsHide: true
  };
  let child;
  try {
    child = spawn(command, args, options);
  } catch (error) {
    callback(null, { ok: false, error: `Runtime could not be started: ${error.message}` });
    return;
  }
  let output = '';
  let timedOut = false;
  let settled = false;
  const finish = result => {
    if (settled) return;
    settled = true;
    callback(null, result);
  };
  const append = chunk => {
    output += chunk.toString();
    if (output.length > 20000) child.kill();
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  // Kotlin needs JVM startup plus script compilation, which alone often
  // takes several seconds before the learner's code even begins running --
  // a uniform short timeout would kill legitimate, correct Kotlin
  // submissions before they finish (verified: ~5s is not enough headroom).
  const timeoutMs = language === 'kotlin' ? 30000 : 5000;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  child.on('error', error => {
    clearTimeout(timer);
    let message;
    if (error.code === 'ENOENT' && language === 'python') {
      message = 'Python 3 is not installed or the Windows py launcher is unavailable. Install Python 3, enable the launcher, and restart HYDEV SE.';
    } else if (error.code === 'ENOENT' && language === 'kotlin') {
      message = 'Kotlin compiler (kotlinc) was not found on PATH. Install the Kotlin command-line compiler (which includes kotlinc) to run Kotlin locally -- JavaScript and Python do not need this.';
    } else {
      message = `Runtime unavailable: ${error.message}`;
    }
    finish({ ok: false, error: message });
  });
  child.on('close', exitCode => {
    clearTimeout(timer);
    finish({
      ok: !timedOut && exitCode === 0,
      timedOut,
      output: output.slice(0, 20000),
      error: timedOut
        ? `Execution stopped after ${timeoutMs / 1000} seconds.`
        : (exitCode === 0 ? '' : (output.trim() || `Process exited with code ${exitCode}.`))
    });
  });
}

// ---------------------------------------------------------------------------
// HYDEV AI real-model connection (OpenRouter).
//
// Config comes from (in priority order):
//   1. Environment variables: OPENROUTER_API_KEY, OPENROUTER_MODEL
//   2. A local config file: data/ai-config.local.json (gitignored -- never
//      commit this, it holds your API key), shaped like:
//        { "apiKey": "sk-or-...", "model": "some/model-id" }
// If neither is present, /api/ai/chat reports { configured: false } and the
// client falls back to the local rule-based tutor -- nothing else in
// HYDEV SE depends on this being configured.
//
// This is re-read from disk on every request (not cached at startup), so
// editing data/ai-config.local.json takes effect immediately -- no server
// restart needed.
// ---------------------------------------------------------------------------
function loadAiConfig() {
  const configPath = path.join(root, 'data', 'ai-config.local.json');
  let fileConfig = {};
  let fileStatus = 'not_found'; // not_found | parsed | parse_error
  let parseErrorMessage = '';

  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      fileStatus = 'parsed';
    } catch (e) {
      fileStatus = 'parse_error';
      parseErrorMessage = e.message;
    }
  }

  // Common Windows gotcha: editors like Notepad can silently save
  // "ai-config.local.json" as "ai-config.local.json.txt" if file
  // extensions are hidden. Detect that specifically so the error message
  // can name the actual problem instead of just saying "not configured".
  let misnamedFile = null;
  if (fileStatus === 'not_found') {
    try {
      const dataDir = path.join(root, 'data');
      const candidate = fs.readdirSync(dataDir).find(name =>
        name.toLowerCase().startsWith('ai-config.local.json') && name !== 'ai-config.local.json' && name !== 'ai-config.local.json.example'
      );
      if (candidate) misnamedFile = candidate;
    } catch (e) {
      // data/ directory should always exist in this project; ignore if not.
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY || fileConfig.apiKey || '';
  const model = process.env.OPENROUTER_MODEL || fileConfig.model || 'meta-llama/llama-3.1-8b-instruct:free';
  const source = process.env.OPENROUTER_API_KEY ? 'environment variable' : (fileStatus === 'parsed' && fileConfig.apiKey ? 'data/ai-config.local.json' : null);

  return {
    apiKey,
    model,
    configured: !!apiKey,
    diagnostics: { fileStatus, parseErrorMessage, misnamedFile, source }
  };
}

function describeAiConfigProblem(config) {
  const d = config.diagnostics;
  if (config.configured) return '';
  if (d.misnamedFile) {
    return `Found "${d.misnamedFile}" in data/, but it needs to be named exactly "ai-config.local.json" (no extra extension -- a common cause is Notepad adding ".txt" when the file was saved).`;
  }
  if (d.fileStatus === 'parse_error') {
    return `data/ai-config.local.json exists but isn't valid JSON: ${d.parseErrorMessage}. Check for a missing comma, quote, or brace.`;
  }
  if (d.fileStatus === 'not_found') {
    return 'No data/ai-config.local.json found (and no OPENROUTER_API_KEY environment variable set). Copy data/ai-config.local.json.example to data/ai-config.local.json and add your key.';
  }
  return 'data/ai-config.local.json was found and parsed, but it has no "apiKey" value set.';
}

function handleAiStatus(request, response) {
  const config = loadAiConfig();
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    configured: config.configured,
    model: config.configured ? config.model : null,
    problem: describeAiConfigProblem(config)
  }));
}

function handleAiChat(request, response) {
  readRequestBody(request, (bodyError, body) => {
    if (bodyError) {
      response.writeHead(413, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, configured: false, error: 'Request body is too large.' }));
      return;
    }
    const config = loadAiConfig();
    if (!config.configured) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, configured: false, error: describeAiConfigProblem(config) }));
      return;
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, configured: true, error: 'Expected a JSON chat request.' }));
      return;
    }
    if (!Array.isArray(payload.messages)) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false, configured: true, error: 'Expected a messages array.' }));
      return;
    }

    const messages = payload.system
      ? [{ role: 'system', content: payload.system }, ...payload.messages]
      : payload.messages;

    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'http://127.0.0.1',
        'X-Title': 'HYDEV SE'
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: 700
      })
    })
      .then(async (apiResponse) => {
        const data = await apiResponse.json();
        if (!apiResponse.ok || data.error) {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ ok: false, configured: true, error: (data.error && data.error.message) || `OpenRouter returned ${apiResponse.status}` }));
          return;
        }
        const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: !!text, configured: true, text: text || '', error: text ? '' : 'Empty response from model.' }));
      })
      .catch((error) => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, configured: true, error: `Could not reach OpenRouter: ${error.message}` }));
      });
  });
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/api/ai/status') {
    handleAiStatus(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/ai/chat') {
    handleAiChat(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/execute') {
    readRequestBody(request, (bodyError, body) => {
      if (bodyError) {
        response.writeHead(413, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'Request body is too large.' }));
        return;
      }
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (error) {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'Expected a JSON execution request.' }));
        return;
      }
      if (!payload.code || typeof payload.code !== 'string' || payload.code.length > 50000) {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: 'Code must be a non-empty string under 50 KB.' }));
        return;
      }
      executeCode(payload.language, payload.code, (executionError, result) => {
        if (executionError) {
          response.writeHead(500, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ ok: false, error: executionError.message }));
          return;
        }
        response.writeHead(result.ok ? 200 : 422, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result));
      });
    });
    return;
  }

  const filePath = safeFilePath(request.url || '/');
  if (!filePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`HYDEV SE could not start: port ${port} is already in use.`);
    console.error('Start it on another port, for example: $env:PORT=4174; npm start');
  } else {
    console.error('HYDEV SE server error:', error);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`HYDEV SE running at http://${host}:${port}`);
  console.log('Stop with Ctrl+C. Set PORT to run beside another local server.');
  const aiConfig = loadAiConfig();
  if (aiConfig.configured) {
    console.log(`HYDEV AI: connected to OpenRouter (model: ${aiConfig.model})`);
  } else {
    console.log(`HYDEV AI: not connected -- ${describeAiConfigProblem(aiConfig)}`);
    console.log('(This is fine -- the local rule-based tutor still works. See README for how to connect a real model.)');
  }
});
