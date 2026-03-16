const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function resolveLocalSource(source, configDir) {
  const resolvedPath = path.resolve(configDir, source.path);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Error: Local source path ${source.path} does not exist (resolved to ${resolvedPath}).`);
  }
  return { ...source, resolvedPath };
}

function buildCloneUrl(repo, token) {
  if (!token) return repo;
  try {
    const url = new URL(repo);
    url.username = 'x-access-token';
    url.password = token;
    return url.toString();
  } catch {
    return repo;
  }
}

function resolveGitSource(source, tmpDir) {
  const token = process.env.GITHUB_TOKEN || null;
  const cloneUrl = buildCloneUrl(source.repo, token);
  const repoName = path.basename(source.repo.replace(/\.git$/, ''));
  const clonePath = path.join(tmpDir, `clone-${repoName}`);

  const args = ['clone', '--depth', '1'];
  if (source.ref) {
    args.push('--branch', source.ref);
  }
  args.push(cloneUrl, clonePath);

  try {
    execFileSync('git', args, { stdio: 'pipe' });
  } catch (err) {
    const reason = err.stderr ? err.stderr.toString().trim() : err.message;
    throw new Error(`Error: Failed to clone ${source.repo} — ${reason}. Is GITHUB_TOKEN set?`);
  }

  return { ...source, resolvedPath: clonePath };
}

function resolveSources(sources, configDir) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proto-diagram-docs-'));
  const resolved = [];

  for (const source of sources) {
    if (source.type === 'local') {
      resolved.push(resolveLocalSource(source, configDir));
    } else if (source.type === 'git') {
      resolved.push(resolveGitSource(source, tmpDir));
    }
  }

  return { resolved, tmpDir };
}

module.exports = { resolveLocalSource, buildCloneUrl, resolveGitSource, resolveSources };
