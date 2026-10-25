const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');

// Optional tooling lives outside the application; nothing is installed by tests.
test('Vercel-compiled routing, local Node function runtime, assets and full Atlas API audit', {
  skip: !process.env.VERCEL_TOOLING_DIR,
  timeout: 180000,
}, async (t) => {
  const root = path.resolve(__dirname, '../..');
  const tools = createRequire(path.join(path.resolve(process.env.VERCEL_TOOLING_DIR), 'package.json'));
  const { getTransformedRoutes } = tools('@vercel/routing-utils');
  const { startDevServer } = tools('@vercel/node');
  const { nodeFileTrace } = tools('@vercel/nft');
  const config = require('../../vercel.json');
  const compiled = getTransformedRoutes(config);
  assert.equal(compiled.error, null);
  const rewrites = compiled.routes.filter((route) => route.src && route.dest);
  assert.equal(rewrites.length, 2);
  for (const route of ['/api', '/api/health', '/api/teams', '/api/auth/register', '/api/no-such-route']) {
    assert.ok(new RegExp(rewrites[0].src).test(route));
    assert.ok(!new RegExp(rewrites[1].src).test(route));
  }
  for (const route of ['/assets/missing.js', '/assets/missing', '/favicon.svg']) assert.ok(!new RegExp(rewrites[1].src).test(route));
  const trace = await nodeFileTrace(['api/handler.js'], {
    base: root,
    ignore: (file) => /(^|\/)\.env(?:\.|$)/.test(file),
  });
  for (const file of ['server/index.js', 'server/config/hackathonDB.js', 'server/node_modules/express/index.js', 'server/node_modules/mongoose/index.js']) assert.ok(trace.fileList.has(file), `Function dependency must be traced: ${file}`);
  assert.ok(![...trace.fileList].some((file) => /(^|\/)\.env(?:\.|$)/.test(file)));
  t.diagnostic('Official Vercel route compilation and dependency tracing passed; private environment files excluded.');

  require('dotenv').config({ path: path.join(root, 'server/.env'), quiet: true });
  assert.ok(process.env.MONGO_URI && process.env.JWT_SECRET, 'Private Atlas test configuration is required');
  const oldVercel = process.env.VERCEL;
  process.env.VERCEL = '1';
  let runtime;
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (runtime) await runtime.shutdown();
    if (oldVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = oldVercel;
  });
  runtime = await startDevServer({
    entrypoint: 'api/handler.js', workPath: root, files: {},
    config: config.functions['api/handler.js'], meta: {},
  });
  assert.ok(runtime && runtime.port);
  const output = path.join(root, config.outputDirectory);
  const index = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const assetPath = index.match(/src="([^" ]+\.js)"/)?.[1];
  assert.ok(assetPath, 'Build the React frontend before running this check');
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

  // This local router applies the official compiled rules and forwards the
  // original URL to the official function development runtime. It is not a deployment.
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(output, `.${pathname}`);
    const contained = file.startsWith(`${output}${path.sep}`);
    if (contained && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
      return;
    }
    const rewrite = rewrites.find((route) => new RegExp(route.src).test(pathname));
    if (rewrite?.dest.startsWith('/api/handler')) {
      const upstream = http.request({ hostname: '127.0.0.1', port: runtime.port, method: req.method, path: req.url, headers: req.headers }, (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
      upstream.on('error', () => { res.writeHead(502); res.end(); });
      req.pipe(upstream);
    } else if (rewrite?.dest.startsWith('/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(index);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/', '/dashboard', '/teams/new', '/teams/012345678901234567890123/edit', '/my-requests', '/admin']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), index);
  }
  const asset = await fetch(`${base}${assetPath}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.notEqual(await asset.text(), index);
  assert.equal((await fetch(`${base}/assets/does-not-exist.js`)).status, 404);
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', app: 'Hackathon Team Finder' });
  for (const route of ['/api', '/api/no-such-route']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'API route not found.' });
  }
  t.diagnostic('Homepage, React deep links, real built JS assets, missing assets, health and API 404 separation passed over HTTP.');

  const childEnv = { ...process.env, RUN_ATLAS_TESTS: '1', AUDIT_BASE_URL: `${base}/api` };
  // A nested test runner must not inherit the parent's internal reporter mode.
  delete childEnv.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, ['--test', path.join(__dirname, 'audit.test.js')], {
    cwd: root,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let outputSummary = '';
  child.stdout.on('data', (chunk) => {
    outputSummary += chunk.toString();
  });
  // Do not echo child diagnostics that could contain request internals on failure.
  child.stderr.on('data', () => {});
  const [code] = await once(child, 'exit');
  if (code !== 0) {
    for (const line of outputSummary.split('\n')) {
      if (/^\s*(?:not ok |✖ |expected: \d|actual: \d|error: ')/.test(line) && !line.includes(process.env.MONGO_URI) && !line.includes(process.env.JWT_SECRET)) t.diagnostic(line);
    }
  }
  assert.equal(code, 0, 'Existing Atlas API suite must pass through the local Vercel runtime');
  assert.ok(outputSummary.includes('Cleanup verified'), 'Temporary Atlas records must be cleaned up');
  t.diagnostic('Existing full Atlas API audit passed through the official local Node function runtime; cleanup verified. No cloud/browser testing claimed.');
});
