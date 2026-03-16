const { resolveLocalSource, buildCloneUrl, resolveGitSource } = require('../src/sources');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('resolveLocalSource', () => {
  test('resolves existing local path relative to config dir', () => {
    const configDir = path.resolve(__dirname, '..');
    const source = { type: 'local', path: './test/fixtures/protos', roots: [{ path: '.' }] };
    const result = resolveLocalSource(source, configDir);
    expect(result.resolvedPath).toBe(path.join(configDir, 'test/fixtures/protos'));
    expect(fs.existsSync(result.resolvedPath)).toBe(true);
  });

  test('throws for nonexistent local path', () => {
    const source = { type: 'local', path: './nonexistent', roots: [{ path: '.' }] };
    expect(() => resolveLocalSource(source, '/tmp')).toThrow(/does not exist/);
  });
});

describe('buildCloneUrl', () => {
  test('returns plain URL when no token', () => {
    const url = buildCloneUrl('https://github.com/org/repo', null);
    expect(url).toBe('https://github.com/org/repo');
  });

  test('injects token into GitHub HTTPS URL', () => {
    const url = buildCloneUrl('https://github.com/org/repo', 'mytoken');
    expect(url).toBe('https://x-access-token:mytoken@github.com/org/repo');
  });

  test('injects token into non-GitHub HTTPS URL', () => {
    const url = buildCloneUrl('https://gitlab.com/org/repo', 'mytoken');
    expect(url).toBe('https://x-access-token:mytoken@gitlab.com/org/repo');
  });
});

jest.mock('child_process');
const { execFileSync } = require('child_process');

describe('resolveGitSource', () => {
  afterEach(() => jest.restoreAllMocks());

  test('clones repo to temp directory', () => {
    execFileSync.mockReturnValue(Buffer.from(''));
    const source = { type: 'git', repo: 'https://github.com/org/repo', roots: [{ path: '.' }] };
    const result = resolveGitSource(source, os.tmpdir());
    expect(execFileSync).toHaveBeenCalledWith('git', expect.arrayContaining(['clone', '--depth', '1']), expect.any(Object));
    expect(result.resolvedPath).toContain('clone-repo');
  });

  test('passes --branch when ref is set', () => {
    execFileSync.mockReturnValue(Buffer.from(''));
    const source = { type: 'git', repo: 'https://github.com/org/repo', ref: 'v2', roots: [{ path: '.' }] };
    resolveGitSource(source, os.tmpdir());
    expect(execFileSync).toHaveBeenCalledWith('git', expect.arrayContaining(['--branch', 'v2']), expect.any(Object));
  });

  test('throws with clear message on clone failure', () => {
    const err = new Error('auth failed');
    err.stderr = Buffer.from('Authentication failed');
    execFileSync.mockImplementation(() => { throw err; });
    const source = { type: 'git', repo: 'https://github.com/org/private', roots: [{ path: '.' }] };
    expect(() => resolveGitSource(source, os.tmpdir())).toThrow(/Failed to clone.*GITHUB_TOKEN/);
  });
});
