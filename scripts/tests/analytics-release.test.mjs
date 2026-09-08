import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {after, before, test} from 'node:test';

import {chromium} from '@playwright/test';

import {analyticsPlanChange, requiresReaderBeforeApply, verifyPublicReader} from '../verify_public_stats_reader.mjs';

const artifactDirectory = path.resolve('out');
const fixture = JSON.parse(await readFile('tests/fixtures/stats-v1.json', 'utf8'));
let browser, server, origin, mode = 'valid';
before(async () => {
  browser = await chromium.launch();
  server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/stats.json') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(fixture));
      return;
    }
    const filename = url.pathname === '/stats' ? 'stats.html' : url.pathname.slice(1);
    try {
      let bytes = await readFile(path.join(artifactDirectory, filename));
      if (mode === 'stale-html' && filename === 'stats.html') bytes = Buffer.from('<h1>Old reader</h1>');
      if (mode === 'stale-asset' && filename.endsWith('.js')) bytes = Buffer.concat([bytes, Buffer.from('\n/* stale */')]);
      response.setHeader('Content-Type', filename.endsWith('.html') ? 'text/html' : filename.endsWith('.js') ? 'application/javascript' : filename.endsWith('.woff2') ? 'font/woff2' : 'text/css');
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await browser?.close();
  await new Promise(resolve => server?.close(resolve));
});

test('served candidate reader passes actual legacy and synthetic v1/v2 behavior', async () => {
  mode = 'valid';
  const result = await verifyPublicReader({origin, artifactDirectory, browser, allowLocal: true});
  assert.equal(result.livePayloadVersion, 1);
  assert.deepEqual(result.contracts, ['live', 'v1', 'v2']);
  assert.ok(result.assets.length > 0);
});

test('stale cached HTML blocks release before reader behavior can pass', async () => {
  mode = 'stale-html';
  await assert.rejects(verifyPublicReader({origin, artifactDirectory, browser, allowLocal: true}), /HTML differs/);
});

test('stale asset bytes block release even if appended bytes still render correctly', async () => {
  mode = 'stale-asset';
  await assert.rejects(verifyPublicReader({origin, artifactDirectory, browser, allowLocal: true}), /asset differs/);
});

test('release endpoints require HTTPS and an origin without path/query/credentials', async () => {
  for (const invalid of ['http://example.com', 'https://example.com/stats', 'https://a:b@example.com', 'https://example.com/?bypass=1']) {
    await assert.rejects(verifyPublicReader({origin: invalid, artifactDirectory, browser}), /origin/);
  }
});

test('create and replace require pre-apply reader proof; update does not bypass later verification', () => {
  const plan = actions => ({format_version: '1.2', resource_changes: [
    {type: 'aws_lambda_function', name: 'stats_aggregator', change: {actions}},
  ]});
  assert.equal(requiresReaderBeforeApply(plan(['create'])), true);
  assert.equal(requiresReaderBeforeApply(plan(['delete', 'create'])), true);
  assert.equal(requiresReaderBeforeApply(plan(['update'])), false);
  assert.equal(requiresReaderBeforeApply(plan(['no-op'])), false);
  assert.throws(() => requiresReaderBeforeApply({}), /plan/);
  assert.throws(() => requiresReaderBeforeApply(plan(['unexpected'])), /actions/);
});

test('analytics plan changes are identified for the migration approval gate', () => {
  const plan = actions => ({format_version: '1.2', resource_changes: [
    {type: 'aws_lambda_function', name: 'stats_aggregator', change: {actions}},
  ]});
  assert.equal(analyticsPlanChange(plan(['create'])), true);
  assert.equal(analyticsPlanChange(plan(['update'])), true);
  assert.equal(analyticsPlanChange(plan(['delete', 'create'])), true);
  assert.equal(analyticsPlanChange(plan(['delete'])), true);
  assert.equal(analyticsPlanChange(plan(['no-op'])), false);
  assert.equal(analyticsPlanChange({format_version: '1.2', resource_changes: []}), false);
  assert.throws(() => analyticsPlanChange(plan(['unexpected'])), /actions/);
});
