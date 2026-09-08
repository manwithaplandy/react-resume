import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';

function runStep(workflow, name) {
  const marker = `      - name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `Missing workflow step: ${name}`);
  const remainder = workflow.slice(start + marker.length);
  const end = remainder.indexOf('\n      - name:');
  const step = end === -1 ? remainder : remainder.slice(0, end);
  const multiline = step.match(/        run: \|\n((?:          .*\n?)+)/);
  if (multiline) return multiline[1].replace(/^ {10}/gm, '');
  const single = step.match(/^        run: (.+)$/m);
  assert.ok(single, `Expected a run command for: ${name}`);
  return single[1] + '\n';
}

function githubRunShell(workflow, script) {
  const explicit = workflow.match(/^defaults:\n  run:\n(?:    #.*\n)*    shell: ([^\n]+)$/m)?.[1];
  // GitHub documents pipefail only for the explicit bash shell. Reproduce
  // the two documented templates rather than assuming the host default.
  return explicit === 'bash'
    ? ['/bin/bash', ['--noprofile', '--norc', '-eo', 'pipefail', script]]
    : ['/bin/bash', ['-e', script]];
}

test('a failed command piped to tee fails the actual archive-build workflow step', () => {
  const workflow = readFileSync('.github/workflows/checks.yml', 'utf8');
  const directory = mkdtempSync(path.join(os.tmpdir(), 'e5-workflow-pipeline-'));
  try {
    const bin = path.join(directory, 'bin');
    mkdirSync(bin);
    mkdirSync(path.join(directory, 'check-logs'));
    writeFileSync(path.join(bin, 'python'), '#!/bin/bash\necho synthetic archive failure\nexit 23\n', {mode: 0o755});
    const script = path.join(directory, 'run.sh');
    writeFileSync(script, runStep(workflow, 'Build deterministic Lambda archives'));
    const [shell, args] = githubRunShell(workflow, script);
    const result = spawnSync(shell, args, {
      cwd: directory,
      env: {PATH: `${bin}:/usr/bin:/bin`},
      encoding: 'utf8',
    });
    assert.equal(result.status, 23, `The failing producer was hidden by tee:\n${result.stdout}${result.stderr}`);
    assert.match(readFileSync(path.join(directory, 'check-logs/release-packaging.log'), 'utf8'), /synthetic archive failure/);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});

test('a failed producer in the actual deployment digest pipeline stops the step', () => {
  const workflow = readFileSync('.github/workflows/main.yml', 'utf8');
  const directory = mkdtempSync(path.join(os.tmpdir(), 'e5-deploy-pipeline-'));
  try {
    const bin = path.join(directory, 'bin');
    mkdirSync(bin);
    writeFileSync(path.join(bin, 'aws'), '#!/bin/bash\necho deployed-digest\n', {mode: 0o755});
    writeFileSync(path.join(bin, 'openssl'), '#!/bin/bash\nif [ "$1" = dgst ]; then echo synthetic digest failure >&2; exit 23; fi\ncat\n', {mode: 0o755});
    mkdirSync(path.join(directory, 'release-artifacts'));
    writeFileSync(path.join(directory, 'release-artifacts/stats-aggregator.zip'), 'synthetic');
    const output = path.join(directory, 'github-output');
    const script = path.join(directory, 'run.sh');
    writeFileSync(script, runStep(workflow, 'Compare checked analytics package with deployed code'));
    const [shell, args] = githubRunShell(workflow, script);
    const result = spawnSync(shell, args, {
      cwd: directory,
      env: {
        PATH: `${bin}:/usr/bin:/bin`,
        FUNCTION_NAME: 'synthetic',
        REQUIRES_READER: 'false',
        GITHUB_OUTPUT: output,
      },
      encoding: 'utf8',
    });
    assert.equal(result.status, 23, `The failing digest producer was hidden by its pipeline:\n${result.stdout}${result.stderr}`);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
