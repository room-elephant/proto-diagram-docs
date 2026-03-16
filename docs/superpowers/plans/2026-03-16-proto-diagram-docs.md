# Proto Diagram Docs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js CLI (`proto-diagram-docs`) that generates a fully static documentation site with SVG diagrams from Protocol Buffer definitions.

**Architecture:** Pipeline CLI — reads YAML config, clones git repos / resolves local paths, discovers `.proto` files, runs `protodot` → `.dot` then `dot` → `.svg`, builds a JSON search index, assembles a self-contained SPA (`index.html` + SVGs) into `dist/`. The site uses hash-based routing and works on file://, GitHub Pages, or any static host.

**Tech Stack:** Node.js >= 18, Commander.js (CLI), js-yaml (config), glob/minimatch (file discovery), crypto (SHA-256 stable IDs), Jest (unit/integration tests), Playwright (site E2E tests)

**Spec:** `docs/superpowers/specs/2026-03-16-proto-diagram-docs-design.md`

---

## File Structure

```
├── package.json
├── bin/
│   └── proto-diagram-docs.js          # CLI entry point (hashbang + require)
├── src/
│   ├── cli.js                         # Commander setup, generate command
│   ├── deps.js                        # System dependency checker (protodot, dot)
│   ├── config.js                      # YAML config loading and validation
│   ├── sources.js                     # Git clone + local path resolution
│   ├── discovery.js                   # Recursive .proto file finder with exclusions
│   ├── metadata.js                    # Lightweight proto file parser (regex)
│   ├── id.js                          # Stable SHA-256 ID generation
│   ├── generator.js                   # protodot + dot execution per file
│   ├── search-index.js                # Search index JSON builder
│   ├── assembler.js                   # Site assembly (template + SVGs + index)
│   ├── reporter.js                    # Final report formatter
│   └── site/
│       └── template.html              # Self-contained SPA template
├── test/
│   ├── deps.test.js
│   ├── config.test.js
│   ├── sources.test.js
│   ├── discovery.test.js
│   ├── metadata.test.js
│   ├── id.test.js
│   ├── search-index.test.js
│   ├── generator.test.js              # Requires protodot + graphviz
│   ├── assembler.test.js
│   ├── integration.test.js            # End-to-end pipeline test
│   └── e2e/
│       └── site.test.js               # Playwright browser tests
├── fixtures/
│   └── protos/
│       ├── billing/
│       │   ├── billing.proto
│       │   ├── invoice.proto
│       │   └── account.proto
│       ├── common/
│       │   └── money.proto
│       └── notifications/
│           └── notification.proto
├── proto-diagrams.example.yaml
├── .github/
│   └── workflows/
│       └── proto-diagrams.yml
└── README.md
```

---

## Chunk 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `bin/proto-diagram-docs.js`
- Create: `src/cli.js`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "proto-diagram-docs",
  "version": "0.1.0",
  "description": "Generate static documentation sites with SVG diagrams from Protocol Buffer definitions",
  "main": "src/cli.js",
  "bin": {
    "proto-diagram-docs": "bin/proto-diagram-docs.js"
  },
  "scripts": {
    "test": "jest --testPathIgnorePatterns=e2e",
    "test:e2e": "playwright test",
    "test:all": "jest"
  },
  "keywords": ["protobuf", "documentation", "graphviz", "diagrams", "protodot"],
  "license": "MIT",
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "js-yaml": "^4.1.0",
    "glob": "^10.0.0",
    "minimatch": "^9.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

- [ ] **Step 2: Create bin entry point**

Create `bin/proto-diagram-docs.js`:

```javascript
#!/usr/bin/env node
require('../src/cli.js');
```

- [ ] **Step 3: Create CLI skeleton**

Create `src/cli.js`:

```javascript
const { Command } = require('commander');
const { version } = require('../package.json');

const program = new Command();

program
  .name('proto-diagram-docs')
  .description('Generate static documentation sites with SVG diagrams from Protocol Buffer definitions')
  .version(version);

program
  .command('generate')
  .description('Generate the static documentation site')
  .option('-c, --config <path>', 'Path to config file', 'proto-diagrams.yaml')
  .option('-o, --output <path>', 'Output directory', 'dist')
  .action(async (options) => {
    console.log('proto-diagram-docs: generate not yet implemented');
    process.exit(1);
  });

program.parse();
```

- [ ] **Step 4: Update .gitignore**

Add to `.gitignore` (the file already exists from project setup with `node_modules/`, `dist/`, `.superpowers/`; add these if missing):

```
node_modules/
dist/
.superpowers/
*.tgz
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated

- [ ] **Step 6: Verify CLI runs**

Run: `node bin/proto-diagram-docs.js --version`
Expected: `0.1.0`

Run: `node bin/proto-diagram-docs.js generate --help`
Expected: Shows help with --config and --output options

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json bin/ src/cli.js .gitignore
git commit -m "feat: scaffold project with CLI entry point"
```

---

### Task 2: Example Proto Fixtures

**Files:**
- Create: `fixtures/protos/common/money.proto`
- Create: `fixtures/protos/billing/billing.proto`
- Create: `fixtures/protos/billing/invoice.proto`
- Create: `fixtures/protos/billing/account.proto`
- Create: `fixtures/protos/notifications/notification.proto`

- [ ] **Step 1: Create shared type**

Create `fixtures/protos/common/money.proto`:

```proto
syntax = "proto3";

package common;

message Money {
  string currency_code = 1;
  int64 units = 2;
  int32 nanos = 3;
}
```

- [ ] **Step 2: Create billing protos**

Create `fixtures/protos/billing/billing.proto`:

```proto
syntax = "proto3";

package billing.v1;

import "common/money.proto";

enum AccountStatus {
  ACCOUNT_STATUS_UNSPECIFIED = 0;
  ACTIVE = 1;
  SUSPENDED = 2;
  CLOSED = 3;
}

message BillingAccount {
  string name = 1;
  string display_name = 2;
  AccountStatus status = 3;
}

service BillingService {
  rpc GetAccount(GetAccountRequest) returns (BillingAccount);
  rpc ListAccounts(ListAccountsRequest) returns (ListAccountsResponse);
}

message GetAccountRequest {
  string name = 1;
}

message ListAccountsRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListAccountsResponse {
  repeated BillingAccount accounts = 1;
  string next_page_token = 2;
}
```

Create `fixtures/protos/billing/invoice.proto`:

```proto
syntax = "proto3";

package billing.v1;

import "common/money.proto";

message Invoice {
  string name = 1;
  string billing_account = 2;
  Money total_amount = 3;
  repeated LineItem line_items = 4;
}

message LineItem {
  string description = 1;
  Money amount = 2;
  int32 quantity = 3;
}
```

Create `fixtures/protos/billing/account.proto`:

```proto
syntax = "proto3";

package billing.v1;

message PaymentMethod {
  string id = 1;
  string type = 2;
  string last_four = 3;
  bool is_default = 4;
}

message BillingProfile {
  string name = 1;
  string email = 2;
  repeated PaymentMethod payment_methods = 3;
}
```

- [ ] **Step 3: Create notification proto**

Create `fixtures/protos/notifications/notification.proto`:

```proto
syntax = "proto3";

package notifications.v1;

import "billing/invoice.proto";

enum NotificationType {
  NOTIFICATION_TYPE_UNSPECIFIED = 0;
  INVOICE_READY = 1;
  PAYMENT_DUE = 2;
  ACCOUNT_ALERT = 3;
}

message Notification {
  string id = 1;
  NotificationType type = 2;
  string message = 3;
  billing.v1.Invoice related_invoice = 4;
}

service NotificationService {
  rpc SendNotification(SendNotificationRequest) returns (SendNotificationResponse);
}

message SendNotificationRequest {
  Notification notification = 1;
  repeated string recipients = 2;
}

message SendNotificationResponse {
  string notification_id = 1;
  bool success = 2;
}
```

- [ ] **Step 4: Commit**

```bash
git add fixtures/
git commit -m "feat: add example proto fixtures for testing"
```

---

### Task 3: Dependency Checker

**Files:**
- Create: `src/deps.js`
- Create: `test/deps.test.js`

- [ ] **Step 1: Write tests**

Create `test/deps.test.js`:

```javascript
const { checkDependency, checkAllDependencies } = require('../src/deps');
const { execFileSync } = require('child_process');

jest.mock('child_process');

describe('checkDependency', () => {
  afterEach(() => jest.restoreAllMocks());

  test('returns true when command exists on PATH', () => {
    execFileSync.mockReturnValue(Buffer.from(''));
    expect(checkDependency('dot')).toBe(true);
  });

  test('returns false when command is not found', () => {
    execFileSync.mockImplementation(() => {
      const err = new Error('not found');
      err.code = 'ENOENT';
      throw err;
    });
    expect(checkDependency('nonexistent')).toBe(false);
  });
});

describe('checkAllDependencies', () => {
  afterEach(() => jest.restoreAllMocks());

  test('returns no errors when both tools are available', () => {
    execFileSync.mockReturnValue(Buffer.from(''));
    const errors = checkAllDependencies();
    expect(errors).toEqual([]);
  });

  test('returns error for missing protodot', () => {
    execFileSync.mockImplementation((cmd) => {
      if (cmd === 'protodot') {
        const err = new Error('not found');
        err.code = 'ENOENT';
        throw err;
      }
      return Buffer.from('');
    });
    const errors = checkAllDependencies();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('protodot');
    expect(errors[0]).toContain('https://github.com/seamia/protodot');
  });

  test('returns error for missing graphviz', () => {
    execFileSync.mockImplementation((cmd) => {
      if (cmd === 'dot') {
        const err = new Error('not found');
        err.code = 'ENOENT';
        throw err;
      }
      return Buffer.from('');
    });
    const errors = checkAllDependencies();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Graphviz');
    expect(errors[0]).toContain('https://graphviz.org/download/');
  });

  test('returns both errors when both are missing', () => {
    execFileSync.mockImplementation(() => {
      const err = new Error('not found');
      err.code = 'ENOENT';
      throw err;
    });
    const errors = checkAllDependencies();
    expect(errors).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/deps.test.js`
Expected: FAIL — `Cannot find module '../src/deps'`

- [ ] **Step 3: Implement dependency checker**

Create `src/deps.js`:

```javascript
const { execFileSync } = require('child_process');

function checkDependency(command) {
  try {
    execFileSync(command, ['--help'], { stdio: 'pipe' });
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    return true;
  }
}

function checkAllDependencies() {
  const errors = [];

  if (!checkDependency('protodot')) {
    errors.push('Error: protodot is not installed. See https://github.com/seamia/protodot for installation.');
  }

  if (!checkDependency('dot')) {
    errors.push('Error: Graphviz is not installed. See https://graphviz.org/download/ for installation.');
  }

  return errors;
}

module.exports = { checkDependency, checkAllDependencies };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/deps.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/deps.js test/deps.test.js
git commit -m "feat: add system dependency checker for protodot and graphviz"
```

---

### Task 4: Config Loader and Validator

**Files:**
- Create: `src/config.js`
- Create: `test/config.test.js`

- [ ] **Step 1: Write tests**

Create `test/config.test.js`:

```javascript
const { loadConfig, validateConfig } = require('../src/config');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('validateConfig', () => {
  test('accepts valid config with git source', () => {
    const config = {
      diagrams: { file_level: true },
      sources: [{
        type: 'git',
        repo: 'https://github.com/org/repo',
        roots: [{ path: 'protos' }]
      }]
    };
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  test('accepts valid config with local source', () => {
    const config = {
      diagrams: { file_level: true },
      sources: [{
        type: 'local',
        path: '/tmp',
        roots: [{ path: '.' }]
      }]
    };
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  test('rejects config with no sources', () => {
    const config = { diagrams: { file_level: true }, sources: [] };
    const errors = validateConfig(config);
    expect(errors.some(e => e.includes('sources'))).toBe(true);
  });

  test('rejects config with missing sources key', () => {
    const config = { diagrams: { file_level: true } };
    const errors = validateConfig(config);
    expect(errors.some(e => e.includes('sources'))).toBe(true);
  });

  test('rejects source with no roots', () => {
    const config = {
      diagrams: { file_level: true },
      sources: [{ type: 'git', repo: 'https://github.com/org/repo', roots: [] }]
    };
    const errors = validateConfig(config);
    expect(errors.some(e => e.includes('roots'))).toBe(true);
  });

  test('rejects config with no diagram types enabled', () => {
    const config = {
      diagrams: { file_level: false, package_level: false, dependency_expanded: false },
      sources: [{ type: 'git', repo: 'https://github.com/org/repo', roots: [{ path: '.' }] }]
    };
    const errors = validateConfig(config);
    expect(errors.some(e => e.includes('diagram'))).toBe(true);
  });

  test('defaults diagram types when diagrams key is missing', () => {
    const config = {
      sources: [{ type: 'git', repo: 'https://github.com/org/repo', roots: [{ path: '.' }] }]
    };
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });

  test('rejects git source with no repo', () => {
    const config = {
      diagrams: { file_level: true },
      sources: [{ type: 'git', roots: [{ path: '.' }] }]
    };
    const errors = validateConfig(config);
    expect(errors.some(e => e.includes('repo'))).toBe(true);
  });

  test('rejects local source with no path', () => {
    const config = {
      diagrams: { file_level: true },
      sources: [{ type: 'local', roots: [{ path: '.' }] }]
    };
    const errors = validateConfig(config);
    expect(errors.some(e => e.includes('path'))).toBe(true);
  });

  test('rejects unknown source type', () => {
    const config = {
      diagrams: { file_level: true },
      sources: [{ type: 'ftp', roots: [{ path: '.' }] }]
    };
    const errors = validateConfig(config);
    expect(errors.some(e => e.includes('type'))).toBe(true);
  });

  test('defaults root label to directory name', () => {
    const config = {
      diagrams: { file_level: true },
      sources: [{
        type: 'git',
        repo: 'https://github.com/org/repo',
        roots: [{ path: 'my/protos' }]
      }]
    };
    validateConfig(config);
    expect(config.sources[0].roots[0].label).toBe('protos');
  });
});

describe('loadConfig', () => {
  test('loads and parses valid YAML file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'proto-diagrams.yaml');
    fs.writeFileSync(configPath, `
diagrams:
  file_level: true
sources:
  - type: local
    path: ./protos
    roots:
      - path: .
        label: Test
`);
    const config = loadConfig(configPath);
    expect(config.diagrams.file_level).toBe(true);
    expect(config.sources[0].type).toBe('local');
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('throws on missing config file', () => {
    expect(() => loadConfig('/nonexistent/path.yaml')).toThrow(/not found/i);
  });

  test('throws on invalid YAML', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'bad.yaml');
    fs.writeFileSync(configPath, '{{{{not yaml');
    expect(() => loadConfig(configPath)).toThrow();
    fs.rmSync(tmpDir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/config.test.js`
Expected: FAIL — `Cannot find module '../src/config'`

- [ ] **Step 3: Implement config loader/validator**

Create `src/config.js`:

```javascript
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Error: Config file not found at ${configPath}. Use --config to specify a path.`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);

  if (!config || typeof config !== 'object') {
    throw new Error(`Error: Config file at ${configPath} is empty or invalid.`);
  }

  config._configDir = path.dirname(path.resolve(configPath));
  return config;
}

function validateConfig(config) {
  const errors = [];

  if (!config.diagrams) {
    config.diagrams = { file_level: true, package_level: false, dependency_expanded: false };
  }

  const { file_level, package_level, dependency_expanded } = config.diagrams;
  if (!file_level && !package_level && !dependency_expanded) {
    errors.push('Error: Invalid config — at least one diagram type must be enabled.');
  }

  if (!config.sources || !Array.isArray(config.sources) || config.sources.length === 0) {
    errors.push('Error: Invalid config — sources is required and must contain at least one source.');
    return errors;
  }

  config.sources.forEach((source, i) => {
    const prefix = `sources[${i}]`;

    if (!['git', 'local'].includes(source.type)) {
      errors.push(`Error: Invalid config — ${prefix}.type must be "git" or "local", got "${source.type}".`);
      return;
    }

    if (source.type === 'git' && !source.repo) {
      errors.push(`Error: Invalid config — ${prefix}.repo is required for git sources.`);
    }

    if (source.type === 'local' && !source.path) {
      errors.push(`Error: Invalid config — ${prefix}.path is required for local sources.`);
    }

    if (!source.roots || !Array.isArray(source.roots) || source.roots.length === 0) {
      errors.push(`Error: Invalid config — ${prefix}.roots is required and must contain at least one root.`);
      return;
    }

    source.roots.forEach((root, j) => {
      if (!root.label) {
        root.label = path.basename(root.path) || root.path;
      }
    });

    if (!source.exclude) {
      source.exclude = [];
    }
  });

  if (!config.metadata) {
    config.metadata = { show_package: true, show_source: true, link_to_source: true };
  }

  return errors;
}

module.exports = { loadConfig, validateConfig };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/config.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js test/config.test.js
git commit -m "feat: add config loader and validator"
```

---

## Chunk 2: Data Pipeline

### Task 5: Source Resolver

**Files:**
- Create: `src/sources.js`
- Create: `test/sources.test.js`

- [ ] **Step 1: Write tests**

Create `test/sources.test.js`:

```javascript
const { resolveLocalSource, buildCloneUrl, resolveGitSource } = require('../src/sources');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('resolveLocalSource', () => {
  test('resolves existing local path relative to config dir', () => {
    const configDir = path.resolve(__dirname, '..');
    const source = { type: 'local', path: './fixtures/protos', roots: [{ path: '.' }] };
    const result = resolveLocalSource(source, configDir);
    expect(result.resolvedPath).toBe(path.join(configDir, 'fixtures/protos'));
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/sources.test.js`
Expected: FAIL — `Cannot find module '../src/sources'`

- [ ] **Step 3: Implement source resolver**

Create `src/sources.js`:

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/sources.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/sources.js test/sources.test.js
git commit -m "feat: add source resolver for git and local sources"
```

---

### Task 6: Proto File Discovery

**Files:**
- Create: `src/discovery.js`
- Create: `test/discovery.test.js`

- [ ] **Step 1: Write tests**

Create `test/discovery.test.js`:

```javascript
const { discoverProtos } = require('../src/discovery');
const path = require('path');

const fixturesDir = path.resolve(__dirname, '../fixtures/protos');

describe('discoverProtos', () => {
  test('discovers all proto files recursively', () => {
    const source = {
      type: 'local',
      resolvedPath: fixturesDir,
      roots: [{ path: '.', label: 'All' }],
      exclude: []
    };
    const results = discoverProtos(source);
    expect(results.length).toBeGreaterThanOrEqual(5);
    expect(results.every(r => r.filePath.endsWith('.proto'))).toBe(true);
  });

  test('scopes discovery to specific root', () => {
    const source = {
      type: 'local',
      resolvedPath: fixturesDir,
      roots: [{ path: 'billing', label: 'Billing' }],
      exclude: []
    };
    const results = discoverProtos(source);
    expect(results.length).toBe(3);
    expect(results.every(r => r.relativePath.startsWith('billing/'))).toBe(true);
  });

  test('applies exclusion patterns', () => {
    const source = {
      type: 'local',
      resolvedPath: fixturesDir,
      roots: [{ path: '.', label: 'All' }],
      exclude: ['**/account*']
    };
    const results = discoverProtos(source);
    expect(results.every(r => !r.filePath.includes('account'))).toBe(true);
  });

  test('attaches label and root to each result', () => {
    const source = {
      type: 'local',
      resolvedPath: fixturesDir,
      roots: [{ path: 'billing', label: 'Billing', description: 'Billing protos' }],
      exclude: []
    };
    const results = discoverProtos(source);
    expect(results[0].label).toBe('Billing');
    expect(results[0].rootPath).toBe('billing');
  });

  test('returns empty array when root directory does not exist', () => {
    const source = {
      type: 'local',
      resolvedPath: fixturesDir,
      roots: [{ path: 'nonexistent', label: 'Missing' }],
      exclude: []
    };
    const results = discoverProtos(source);
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/discovery.test.js`
Expected: FAIL — `Cannot find module '../src/discovery'`

- [ ] **Step 3: Implement discovery**

Create `src/discovery.js`:

```javascript
const { globSync } = require('glob');
const { minimatch } = require('minimatch');
const path = require('path');
const fs = require('fs');

function discoverProtos(source) {
  const results = [];

  for (const root of source.roots) {
    const rootDir = path.join(source.resolvedPath, root.path);

    if (!fs.existsSync(rootDir)) {
      continue;
    }

    const files = globSync('**/*.proto', { cwd: rootDir, absolute: false });

    for (const file of files) {
      const excluded = (source.exclude || []).some(pattern =>
        minimatch(file, pattern, { dot: true })
      );
      if (excluded) continue;

      const relativePath = path.join(root.path, file);

      results.push({
        filePath: path.join(rootDir, file),
        relativePath,
        fileName: path.basename(file),
        rootPath: root.path,
        label: root.label,
        description: root.description,
        source,
      });
    }
  }

  return results;
}

module.exports = { discoverProtos };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/discovery.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/discovery.js test/discovery.test.js
git commit -m "feat: add proto file discovery with exclusion filters"
```

---

### Task 7: Metadata Extractor

**Files:**
- Create: `src/metadata.js`
- Create: `test/metadata.test.js`

- [ ] **Step 1: Write tests**

Create `test/metadata.test.js`:

```javascript
const { extractMetadata } = require('../src/metadata');
const path = require('path');

const fixturesDir = path.resolve(__dirname, '../fixtures/protos');

describe('extractMetadata', () => {
  test('extracts package declaration', () => {
    const meta = extractMetadata(path.join(fixturesDir, 'billing/billing.proto'));
    expect(meta.package).toBe('billing.v1');
  });

  test('extracts imports', () => {
    const meta = extractMetadata(path.join(fixturesDir, 'billing/billing.proto'));
    expect(meta.imports).toContain('common/money.proto');
  });

  test('extracts message names', () => {
    const meta = extractMetadata(path.join(fixturesDir, 'billing/billing.proto'));
    expect(meta.messages).toContain('BillingAccount');
    expect(meta.messages).toContain('GetAccountRequest');
  });

  test('extracts service names', () => {
    const meta = extractMetadata(path.join(fixturesDir, 'billing/billing.proto'));
    expect(meta.services).toContain('BillingService');
  });

  test('extracts enum names', () => {
    const meta = extractMetadata(path.join(fixturesDir, 'billing/billing.proto'));
    expect(meta.enums).toContain('AccountStatus');
  });

  test('handles proto with no package', () => {
    const fs = require('fs');
    const os = require('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
    const file = path.join(tmpDir, 'nopackage.proto');
    fs.writeFileSync(file, 'syntax = "proto3";\nmessage Foo { string bar = 1; }');
    const meta = extractMetadata(file);
    expect(meta.package).toBe('');
    expect(meta.messages).toContain('Foo');
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('handles proto with no services', () => {
    const meta = extractMetadata(path.join(fixturesDir, 'billing/account.proto'));
    expect(meta.services).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/metadata.test.js`
Expected: FAIL — `Cannot find module '../src/metadata'`

- [ ] **Step 3: Implement metadata extractor**

Create `src/metadata.js`:

```javascript
const fs = require('fs');

function extractMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const packageMatch = content.match(/^\s*package\s+([\w.]+)\s*;/m);
  const pkg = packageMatch ? packageMatch[1] : '';

  const imports = [];
  const importRegex = /^\s*import\s+"([^"]+)"\s*;/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  const messages = [];
  const messageRegex = /^\s*message\s+(\w+)\s*\{/gm;
  while ((match = messageRegex.exec(content)) !== null) {
    messages.push(match[1]);
  }

  const services = [];
  const serviceRegex = /^\s*service\s+(\w+)\s*\{/gm;
  while ((match = serviceRegex.exec(content)) !== null) {
    services.push(match[1]);
  }

  const enums = [];
  const enumRegex = /^\s*enum\s+(\w+)\s*\{/gm;
  while ((match = enumRegex.exec(content)) !== null) {
    enums.push(match[1]);
  }

  return { package: pkg, imports, messages, services, enums };
}

module.exports = { extractMetadata };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/metadata.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/metadata.js test/metadata.test.js
git commit -m "feat: add proto metadata extractor"
```

---

### Task 8: Stable ID Generator

**Files:**
- Create: `src/id.js`
- Create: `test/id.test.js`

- [ ] **Step 1: Write tests**

Create `test/id.test.js`:

```javascript
const { generateFileId, generatePackageId } = require('../src/id');

describe('generateFileId', () => {
  test('produces 8 character hex string', () => {
    const id = generateFileId('https://github.com/org/repo', 'protos', 'billing.proto');
    expect(id).toMatch(/^[a-f0-9]{8}$/);
  });

  test('is deterministic', () => {
    const a = generateFileId('https://github.com/org/repo', 'protos', 'billing.proto');
    const b = generateFileId('https://github.com/org/repo', 'protos', 'billing.proto');
    expect(a).toBe(b);
  });

  test('different inputs produce different IDs', () => {
    const a = generateFileId('https://github.com/org/repo', 'protos', 'billing.proto');
    const b = generateFileId('https://github.com/org/repo', 'protos', 'invoice.proto');
    expect(a).not.toBe(b);
  });

  test('uses "local:" prefix for local sources', () => {
    const local = generateFileId('local:/repo/protos', 'billing', 'billing.proto');
    const git = generateFileId('https://github.com/org/repo', 'billing', 'billing.proto');
    expect(local).not.toBe(git);
  });
});

describe('generatePackageId', () => {
  test('produces 8 character hex string', () => {
    const id = generatePackageId('billing.v1');
    expect(id).toMatch(/^[a-f0-9]{8}$/);
  });

  test('is deterministic', () => {
    const a = generatePackageId('billing.v1');
    const b = generatePackageId('billing.v1');
    expect(a).toBe(b);
  });

  test('different packages produce different IDs', () => {
    const a = generatePackageId('billing.v1');
    const b = generatePackageId('notifications.v1');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/id.test.js`
Expected: FAIL — `Cannot find module '../src/id'`

- [ ] **Step 3: Implement ID generator**

Create `src/id.js`:

```javascript
const crypto = require('crypto');

function generateFileId(sourceIdentity, rootPath, relativePath) {
  const input = `${sourceIdentity}:${rootPath}:${relativePath}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
}

function generatePackageId(packageName) {
  const input = `pkg:${packageName}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
}

module.exports = { generateFileId, generatePackageId };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/id.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/id.js test/id.test.js
git commit -m "feat: add stable SHA-256 ID generator"
```

---

## Chunk 3: Generation and Site

### Task 9: Diagram Generator

**Files:**
- Create: `src/generator.js`
- Create: `test/generator.test.js`

- [ ] **Step 1: Write tests**

Create `test/generator.test.js`:

```javascript
const { generateDiagram, buildIncludePaths, generatePackageDiagram } = require('../src/generator');
const path = require('path');
const fs = require('fs');
const os = require('os');

const fixturesDir = path.resolve(__dirname, '../fixtures/protos');

describe('buildIncludePaths', () => {
  test('joins source paths with semicolons', () => {
    const sources = [
      { resolvedPath: '/a/b' },
      { resolvedPath: '/c/d' }
    ];
    expect(buildIncludePaths(sources)).toBe('/a/b;/c/d');
  });
});

describe('generateDiagram (requires protodot + graphviz)', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-test-'));

  afterAll(() => fs.rmSync(outputDir, { recursive: true, force: true }));

  test('generates file-level SVG from real proto', () => {
    const result = generateDiagram({
      filePath: path.join(fixturesDir, 'billing/billing.proto'),
      type: 'file',
      includePaths: fixturesDir,
      outputDir,
      id: 'test-file-01'
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.svgPath)).toBe(true);
    const svg = fs.readFileSync(result.svgPath, 'utf8');
    expect(svg).toContain('<svg');
  });

  test('generates dependency-expanded SVG from real proto', () => {
    const result = generateDiagram({
      filePath: path.join(fixturesDir, 'billing/billing.proto'),
      type: 'deps',
      includePaths: fixturesDir,
      outputDir,
      id: 'test-deps-01'
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.svgPath)).toBe(true);
  });

  test('returns failure info for invalid proto', () => {
    const tmpFile = path.join(outputDir, 'bad.proto');
    fs.writeFileSync(tmpFile, 'this is not valid proto');
    const result = generateDiagram({
      filePath: tmpFile,
      type: 'file',
      includePaths: fixturesDir,
      outputDir,
      id: 'test-bad-01'
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('generatePackageDiagram (requires protodot + graphviz)', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-pkg-test-'));

  afterAll(() => fs.rmSync(outputDir, { recursive: true, force: true }));

  test('generates package-level SVG from multiple proto files', () => {
    const files = [
      path.join(fixturesDir, 'billing/billing.proto'),
      path.join(fixturesDir, 'billing/invoice.proto'),
      path.join(fixturesDir, 'billing/account.proto'),
    ];
    const result = generatePackageDiagram({
      packageName: 'billing.v1',
      filePaths: files,
      includePaths: fixturesDir,
      outputDir,
      id: 'test-pkg-01'
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.svgPath)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/generator.test.js`
Expected: FAIL — `Cannot find module '../src/generator'`

- [ ] **Step 3: Implement generator**

Create `src/generator.js`:

```javascript
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function buildIncludePaths(resolvedSources) {
  return resolvedSources.map(s => s.resolvedPath).join(';');
}

function generateDiagram({ filePath, type, includePaths, outputDir, id }) {
  const outputName = `${id}-${type}`;
  const dotOutput = path.join(outputDir, outputName);
  const svgPath = path.join(outputDir, `${outputName}.svg`);

  try {
    const protodotArgs = ['-src', filePath, '-inc', includePaths, '-output', dotOutput];
    if (type === 'file') {
      protodotArgs.push('-select', '*');
    }

    execFileSync('protodot', protodotArgs, { stdio: 'pipe' });

    const dotFile = `${dotOutput}.dot`;
    if (!fs.existsSync(dotFile)) {
      return { success: false, error: 'protodot did not produce a .dot file', svgPath: null };
    }

    execFileSync('dot', ['-Tsvg', dotFile, '-o', svgPath], { stdio: 'pipe' });

    return { success: true, svgPath, error: null };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    return { success: false, error: stderr, svgPath: null };
  }
}

function generatePackageDiagram({ packageName, filePaths, includePaths, outputDir, id }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proto-pkg-'));
  const syntheticPath = path.join(tmpDir, `pkg-${packageName.replace(/\./g, '_')}.proto`);

  const sortedPaths = [...filePaths].sort();
  const imports = sortedPaths.map(fp => {
    const incDirs = includePaths.split(';');
    for (const dir of incDirs) {
      const rel = path.relative(dir, fp).replace(/\\/g, '/');
      if (!rel.startsWith('..')) {
        return `import "${rel}";`;
      }
    }
    return `import "${fp}";`;
  });

  const content = `syntax = "proto3";\n${imports.join('\n')}\n`;
  fs.writeFileSync(syntheticPath, content);

  const result = generateDiagram({
    filePath: syntheticPath,
    type: 'pkg',
    includePaths,
    outputDir,
    id
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
  return result;
}

module.exports = { buildIncludePaths, generateDiagram, generatePackageDiagram };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/generator.test.js`
Expected: All tests PASS (requires protodot and graphviz installed)

- [ ] **Step 5: Commit**

```bash
git add src/generator.js test/generator.test.js
git commit -m "feat: add diagram generator using protodot and graphviz"
```

---

### Task 10: Search Index Builder

**Files:**
- Create: `src/search-index.js`
- Create: `test/search-index.test.js`

- [ ] **Step 1: Write tests**

Create `test/search-index.test.js`:

```javascript
const { buildSearchIndex } = require('../src/search-index');

describe('buildSearchIndex', () => {
  const protos = [
    {
      id: 'abc12345',
      fileName: 'billing.proto',
      relativePath: 'billing/billing.proto',
      rootPath: 'billing',
      label: 'Billing',
      source: { type: 'git', repo: 'https://github.com/org/repo' },
      metadata: {
        package: 'billing.v1',
        messages: ['BillingAccount'],
        services: ['BillingService'],
        enums: ['AccountStatus'],
        imports: ['common/money.proto'],
      },
      diagramTypes: ['file', 'deps'],
    },
  ];

  test('produces array of entries', () => {
    const index = buildSearchIndex(protos, []);
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBe(1);
  });

  test('file entries have correct shape', () => {
    const index = buildSearchIndex(protos, []);
    const entry = index[0];
    expect(entry.id).toBe('abc12345');
    expect(entry.type).toBe('file');
    expect(entry.name).toBe('billing.proto');
    expect(entry.package).toBe('billing.v1');
    expect(entry.label).toBe('Billing');
    expect(entry.source).toBe('repo');
    expect(entry.messages).toEqual(['BillingAccount']);
    expect(entry.services).toEqual(['BillingService']);
    expect(entry.enums).toEqual(['AccountStatus']);
    expect(entry.diagramTypes).toEqual(['file', 'deps']);
    expect(entry.path).toBe('billing/billing.proto');
  });

  test('derives source name from git repo URL', () => {
    const index = buildSearchIndex(protos, []);
    expect(index[0].source).toBe('repo');
  });

  test('derives source name from local path', () => {
    const localProtos = [{
      ...protos[0],
      source: { type: 'local', path: './my-protos' }
    }];
    const index = buildSearchIndex(localProtos, []);
    expect(index[0].source).toBe('my-protos');
  });

  test('includes package-level entries', () => {
    const packages = [{
      id: 'pkg12345',
      packageName: 'billing.v1',
      label: 'Billing',
      source: 'repo',
      messages: ['BillingAccount', 'Invoice'],
      services: ['BillingService'],
      enums: ['AccountStatus'],
      fileCount: 3,
    }];
    const index = buildSearchIndex([], packages);
    const pkgEntry = index.find(e => e.type === 'package');
    expect(pkgEntry).toBeDefined();
    expect(pkgEntry.id).toBe('pkg12345');
    expect(pkgEntry.name).toBe('billing.v1');
    expect(pkgEntry.diagramTypes).toEqual(['pkg']);
    expect(pkgEntry.fileCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/search-index.test.js`
Expected: FAIL — `Cannot find module '../src/search-index'`

- [ ] **Step 3: Implement search index builder**

Create `src/search-index.js`:

```javascript
const path = require('path');

function deriveSourceName(source) {
  if (source.type === 'git') {
    return path.basename(source.repo.replace(/\.git$/, ''));
  }
  return path.basename(source.path);
}

function buildSearchIndex(fileProtos, packageEntries) {
  const index = [];

  for (const proto of fileProtos) {
    index.push({
      id: proto.id,
      type: 'file',
      name: proto.fileName,
      package: proto.metadata.package,
      label: proto.label,
      source: deriveSourceName(proto.source),
      messages: proto.metadata.messages,
      services: proto.metadata.services,
      enums: proto.metadata.enums,
      diagramTypes: proto.diagramTypes,
      path: proto.relativePath,
    });
  }

  for (const pkg of packageEntries) {
    index.push({
      id: pkg.id,
      type: 'package',
      name: pkg.packageName,
      package: pkg.packageName,
      label: pkg.label,
      source: pkg.source,
      messages: pkg.messages,
      services: pkg.services,
      enums: pkg.enums,
      diagramTypes: ['pkg'],
      fileCount: pkg.fileCount,
    });
  }

  return index;
}

module.exports = { buildSearchIndex, deriveSourceName };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/search-index.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/search-index.js test/search-index.test.js
git commit -m "feat: add search index builder"
```

---

### Task 11: Site Shell Template

**Files:**
- Create: `src/site/template.html`

This is the self-contained SPA. All CSS and JS are inlined. Placeholders `{{VERSION}}` and `{{GITHUB_URL}}` are replaced at assembly time.

- [ ] **Step 1: Create the site shell template**

Create `src/site/template.html` — this is a large file containing the full SPA with:

- Kafbat-inspired dark theme CSS (all colors from spec)
- Header with hamburger, title, version, GitHub link
- Left catalog pane with search, collapsible groups, proto entries
- Right viewer pane with toolbar, diagram type switcher, zoom controls
- SVG viewer with pan (drag) and zoom (scroll wheel) via CSS transforms
- Hash-based router that parses `#/id/type` and loads SVGs
- Client-side search filtering against `search-index.json`
- `fetch()` for loading search index and SVGs, with `XMLHttpRequest` fallback for file:// protocol

The template loads `search-index.json` relative to itself, and SVGs from `diagrams/` subdirectory.

The file should be approximately 400-600 lines of HTML with inline `<style>` and `<script>` blocks. Key implementation details:

**Router:**
```javascript
function parseHash() {
  const hash = location.hash.slice(2); // remove #/
  const parts = hash.split('/');
  return { id: parts[0] || null, type: parts[1] || null };
}
window.addEventListener('hashchange', () => loadDiagramFromHash());
```

**SVG Viewer (pan/zoom):**
```javascript
let scale = 1, translateX = 0, translateY = 0;
// mousedown → track drag start
// mousemove → update translateX/Y
// wheel → adjust scale (clamp 0.1–10)
// Apply: svgContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
```

**Search:**
```javascript
function filterEntries(query) {
  const q = query.toLowerCase();
  return searchIndex.filter(entry =>
    entry.name.toLowerCase().includes(q) ||
    entry.package.toLowerCase().includes(q) ||
    entry.label.toLowerCase().includes(q) ||
    entry.messages.some(m => m.toLowerCase().includes(q)) ||
    entry.services.some(s => s.toLowerCase().includes(q)) ||
    entry.enums.some(e => e.toLowerCase().includes(q)) ||
    (entry.path || '').toLowerCase().includes(q)
  );
}
```

**Loading SVGs (file:// compatible):**
```javascript
function loadSvg(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = () => xhr.status === 200 || xhr.status === 0
      ? resolve(xhr.responseText)
      : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send();
  });
}
```

- [ ] **Step 2: Write the complete template**

Write the full `src/site/template.html` with all CSS, HTML structure, and JS inlined. The CSS must use exactly the color values from the spec's Kafbat-inspired theme. The HTML structure must match the approved mockup layout.

**Required CSS classes for E2E test compatibility:**
- `.hamburger` — the hamburger menu button
- `.catalog` — the left catalog pane container
- `.search-input` — the search text input
- `.proto-entry` — each proto item in the catalog
- `.viewer` — the SVG viewer container
- `.zoom-in`, `.zoom-out`, `.zoom-fit`, `.zoom-reset` — zoom control buttons

**Template placeholders** (replaced by assembler):
- `{{VERSION}}` — CLI version from `package.json`
- `{{GITHUB_URL}}` — hardcoded to `https://github.com/room-elephant/proto-diagram-docs`

**Metadata rendering:** The template reads `search-index.json` at runtime. Each entry's `package`, `source`, and `path` fields are used to render metadata in catalog entries. The `link_to_source` behavior is handled by the search index: if a `sourceUrl` field is present on an entry, the template renders a `↗ source` link. The assembler adds `sourceUrl` to git-source entries using `<repo>/blob/<ref>/<path>`.

- [ ] **Step 3: Commit**

```bash
git add src/site/template.html
git commit -m "feat: add self-contained SPA site shell template"
```

---

### Task 12: Site Assembler

**Files:**
- Create: `src/assembler.js`
- Create: `test/assembler.test.js`

- [ ] **Step 1: Write tests**

Create `test/assembler.test.js`:

```javascript
const { assembleSite } = require('../src/assembler');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('assembleSite', () => {
  let outputDir, svgDir;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-test-'));
    svgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svgs-'));
    fs.writeFileSync(path.join(svgDir, 'abc-file.svg'), '<svg>test</svg>');
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
    fs.rmSync(svgDir, { recursive: true, force: true });
  });

  test('creates output directory structure', () => {
    assembleSite({
      outputDir,
      svgDir,
      searchIndex: [{ id: 'abc', name: 'test.proto' }],
      version: '1.0.0',
    });
    expect(fs.existsSync(path.join(outputDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'search-index.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'diagrams'))).toBe(true);
  });

  test('injects version into index.html', () => {
    assembleSite({
      outputDir,
      svgDir,
      searchIndex: [],
      version: '2.5.0',
    });
    const html = fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8');
    expect(html).toContain('2.5.0');
  });

  test('writes search index as JSON', () => {
    const index = [{ id: 'abc', name: 'test.proto' }];
    assembleSite({ outputDir, svgDir, searchIndex: index, version: '1.0.0' });
    const written = JSON.parse(fs.readFileSync(path.join(outputDir, 'search-index.json'), 'utf8'));
    expect(written).toEqual(index);
  });

  test('copies SVG files to diagrams directory', () => {
    assembleSite({ outputDir, svgDir, searchIndex: [], version: '1.0.0' });
    expect(fs.existsSync(path.join(outputDir, 'diagrams', 'abc-file.svg'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/assembler.test.js`
Expected: FAIL — `Cannot find module '../src/assembler'`

- [ ] **Step 3: Implement assembler**

Create `src/assembler.js`:

```javascript
const fs = require('fs');
const path = require('path');

function assembleSite({ outputDir, svgDir, searchIndex, version }) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'diagrams'), { recursive: true });

  const templatePath = path.join(__dirname, 'site', 'template.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace(/\{\{VERSION\}\}/g, version);
  html = html.replace(/\{\{GITHUB_URL\}\}/g, 'https://github.com/room-elephant/proto-diagram-docs');
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);

  fs.writeFileSync(
    path.join(outputDir, 'search-index.json'),
    JSON.stringify(searchIndex, null, 2)
  );

  if (fs.existsSync(svgDir)) {
    const svgFiles = fs.readdirSync(svgDir).filter(f => f.endsWith('.svg'));
    for (const file of svgFiles) {
      fs.copyFileSync(
        path.join(svgDir, file),
        path.join(outputDir, 'diagrams', file)
      );
    }
  }
}

module.exports = { assembleSite };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest test/assembler.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/assembler.js test/assembler.test.js
git commit -m "feat: add site assembler"
```

---

### Task 13: Reporter

**Files:**
- Create: `src/reporter.js`

- [ ] **Step 1: Implement reporter**

Create `src/reporter.js`:

```javascript
function formatReport({ sources, protosFound, diagramsGenerated, diagramsFailed, failures, outputDir }) {
  const lines = [
    '',
    'Proto Diagram Docs — Generation Complete',
    `  Sources:    ${sources} resolved`,
    `  Protos:     ${protosFound} discovered`,
    `  Diagrams:   ${diagramsGenerated} generated, ${diagramsFailed} failed`,
    `  Output:     ${outputDir}/`,
  ];

  if (failures.length > 0) {
    lines.push('');
    lines.push('  Failed:');
    for (const f of failures) {
      lines.push(`    ✗ ${f.file} (${f.type}) — ${f.error}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

module.exports = { formatReport };
```

- [ ] **Step 2: Commit**

```bash
git add src/reporter.js
git commit -m "feat: add generation report formatter"
```

---

## Chunk 4: Integration and Delivery

### Task 14: Wire CLI Generate Command

**Files:**
- Modify: `src/cli.js`

- [ ] **Step 1: Implement the full generate pipeline**

Replace the placeholder `generate` action in `src/cli.js` with the full pipeline wiring:

```javascript
const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const { version } = require('../package.json');
const { checkAllDependencies } = require('./deps');
const { loadConfig, validateConfig } = require('./config');
const { resolveSources } = require('./sources');
const { discoverProtos } = require('./discovery');
const { extractMetadata } = require('./metadata');
const { generateFileId, generatePackageId } = require('./id');
const { buildIncludePaths, generateDiagram, generatePackageDiagram } = require('./generator');
const { buildSearchIndex } = require('./search-index');
const { assembleSite } = require('./assembler');
const { formatReport } = require('./reporter');

const program = new Command();

program
  .name('proto-diagram-docs')
  .description('Generate static documentation sites with SVG diagrams from Protocol Buffer definitions')
  .version(version);

program
  .command('generate')
  .description('Generate the static documentation site')
  .option('-c, --config <path>', 'Path to config file', 'proto-diagrams.yaml')
  .option('-o, --output <path>', 'Output directory', 'dist')
  .action(async (options) => {
    // Step 1: Check dependencies
    const depErrors = checkAllDependencies();
    if (depErrors.length > 0) {
      depErrors.forEach(e => console.error(e));
      process.exit(1);
    }

    // Step 2: Load and validate config
    let config;
    try {
      config = loadConfig(options.config);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }

    const configErrors = validateConfig(config);
    if (configErrors.length > 0) {
      configErrors.forEach(e => console.error(e));
      process.exit(1);
    }

    // Step 3: Resolve sources
    let resolved, tmpDir;
    try {
      ({ resolved, tmpDir } = resolveSources(config.sources, config._configDir));
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }

    // Step 4: Discover protos
    const allProtos = [];
    for (const source of resolved) {
      allProtos.push(...discoverProtos(source));
    }

    if (allProtos.length === 0) {
      console.error('Error: No .proto files found across all sources. Check your roots and exclude patterns.');
      process.exit(1);
    }

    // Step 5: Extract metadata
    for (const proto of allProtos) {
      proto.metadata = extractMetadata(proto.filePath);
    }

    // Step 6: Generate IDs and diagrams
    const includePaths = buildIncludePaths(resolved);
    const svgDir = path.join(tmpDir || require('os').tmpdir(), 'diagrams-out');
    fs.mkdirSync(svgDir, { recursive: true });

    const failures = [];
    let diagramsGenerated = 0;

    for (const proto of allProtos) {
      const sourceIdentity = proto.source.type === 'git'
        ? proto.source.repo
        : `local:${path.resolve(config._configDir, proto.source.path)}`;
      proto.id = generateFileId(sourceIdentity, proto.rootPath, proto.relativePath);
      proto.diagramTypes = [];

      const types = [];
      if (config.diagrams.file_level) types.push('file');
      if (config.diagrams.dependency_expanded) types.push('deps');

      for (const type of types) {
        const result = generateDiagram({
          filePath: proto.filePath,
          type,
          includePaths,
          outputDir: svgDir,
          id: proto.id,
        });
        if (result.success) {
          proto.diagramTypes.push(type);
          diagramsGenerated++;
        } else {
          failures.push({ file: proto.relativePath, type, error: result.error });
        }
      }
    }

    // Package-level diagrams
    const packageEntries = [];
    if (config.diagrams.package_level) {
      const byPackage = {};
      for (const proto of allProtos) {
        const pkg = proto.metadata.package;
        if (!pkg) continue;
        if (!byPackage[pkg]) byPackage[pkg] = [];
        byPackage[pkg].push(proto);
      }

      for (const [pkg, protos] of Object.entries(byPackage)) {
        const id = generatePackageId(pkg);
        const result = generatePackageDiagram({
          packageName: pkg,
          filePaths: protos.map(p => p.filePath),
          includePaths,
          outputDir: svgDir,
          id,
        });

        // Determine label: root with most files for this package
        const labelCounts = {};
        protos.forEach(p => {
          labelCounts[p.label] = (labelCounts[p.label] || 0) + 1;
        });
        const label = Object.entries(labelCounts)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];

        if (result.success) {
          diagramsGenerated++;
          const allMessages = [...new Set(protos.flatMap(p => p.metadata.messages))];
          const allServices = [...new Set(protos.flatMap(p => p.metadata.services))];
          const allEnums = [...new Set(protos.flatMap(p => p.metadata.enums))];

          packageEntries.push({
            id,
            packageName: pkg,
            label,
            source: require('./search-index').deriveSourceName(protos[0].source),
            messages: allMessages,
            services: allServices,
            enums: allEnums,
            fileCount: protos.length,
          });
        } else {
          failures.push({ file: `package:${pkg}`, type: 'pkg', error: result.error });
        }
      }
    }

    // Step 7: Build search index
    const searchIndex = buildSearchIndex(allProtos, packageEntries);

    // Step 8: Assemble site
    assembleSite({
      outputDir: options.output,
      svgDir,
      searchIndex,
      version,
    });

    // Step 9: Report
    console.log(formatReport({
      sources: resolved.length,
      protosFound: allProtos.length,
      diagramsGenerated,
      diagramsFailed: failures.length,
      failures,
      outputDir: options.output,
    }));

    if (failures.length > 0) {
      process.exit(1);
    }
  });

program.parse();
```

- [ ] **Step 2: Commit**

```bash
git add src/cli.js
git commit -m "feat: wire full generation pipeline into CLI"
```

---

### Task 15: Example Config

**Files:**
- Create: `proto-diagrams.example.yaml`

- [ ] **Step 1: Create working example config**

Create `proto-diagrams.example.yaml`:

```yaml
diagrams:
  file_level: true
  package_level: true
  dependency_expanded: true

sources:
  - type: local
    path: ./fixtures/protos
    roots:
      - path: billing
        label: "Billing"
        description: "Billing and payment services"
      - path: notifications
        label: "Notifications"
        description: "Notification delivery"
      - path: common
        label: "Common"
        description: "Shared types"
    exclude: []

metadata:
  show_package: true
  show_source: true
  link_to_source: false
```

- [ ] **Step 2: Verify end-to-end**

Run: `node bin/proto-diagram-docs.js generate --config proto-diagrams.example.yaml --output dist-example`
Expected: Generation completes successfully, `dist-example/` contains `index.html`, `search-index.json`, and `diagrams/` with SVG files.

Run: `ls dist-example/diagrams/ | head -10`
Expected: Multiple `.svg` files listed.

Run: `cat dist-example/search-index.json | head -20`
Expected: Valid JSON array with entries.

- [ ] **Step 3: Open the generated site in a browser**

Open `dist-example/index.html` in a browser. Verify:
- Header shows "Proto Diagram Docs" with version
- Catalog pane shows Billing, Notifications, Common groups
- Clicking a proto loads its diagram in the viewer
- Search filters the catalog
- Pan/zoom work in the viewer
- Hash URL changes when selecting a diagram

- [ ] **Step 4: Commit**

```bash
git add proto-diagrams.example.yaml
git commit -m "feat: add working example config"
```

---

### Task 16: Integration Tests

**Files:**
- Create: `test/integration.test.js`

- [ ] **Step 1: Write integration test**

Create `test/integration.test.js`:

```javascript
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLI = path.resolve(__dirname, '../bin/proto-diagram-docs.js');
const EXAMPLE_CONFIG = path.resolve(__dirname, '../proto-diagrams.example.yaml');

describe('End-to-end generation', () => {
  const outputDir = path.join(os.tmpdir(), 'proto-diagram-docs-integration-test');

  beforeAll(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
    execFileSync('node', [CLI, 'generate', '--config', EXAMPLE_CONFIG, '--output', outputDir], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });
  });

  afterAll(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('produces index.html', () => {
    expect(fs.existsSync(path.join(outputDir, 'index.html'))).toBe(true);
  });

  test('produces search-index.json', () => {
    const indexPath = path.join(outputDir, 'search-index.json');
    expect(fs.existsSync(indexPath)).toBe(true);
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBeGreaterThan(0);
  });

  test('produces SVG diagram files', () => {
    const diagramsDir = path.join(outputDir, 'diagrams');
    expect(fs.existsSync(diagramsDir)).toBe(true);
    const files = fs.readdirSync(diagramsDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.endsWith('.svg'))).toBe(true);
  });

  test('search index entries have required fields', () => {
    const index = JSON.parse(fs.readFileSync(path.join(outputDir, 'search-index.json'), 'utf8'));
    for (const entry of index) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('diagramTypes');
    }
  });

  test('includes file-level and package-level entries', () => {
    const index = JSON.parse(fs.readFileSync(path.join(outputDir, 'search-index.json'), 'utf8'));
    expect(index.some(e => e.type === 'file')).toBe(true);
    expect(index.some(e => e.type === 'package')).toBe(true);
  });

  test('SVG files are valid SVG', () => {
    const diagramsDir = path.join(outputDir, 'diagrams');
    const files = fs.readdirSync(diagramsDir);
    for (const file of files) {
      const content = fs.readFileSync(path.join(diagramsDir, file), 'utf8');
      expect(content).toContain('<svg');
    }
  });

  test('stable IDs are deterministic across runs', () => {
    const outputDir2 = path.join(os.tmpdir(), 'proto-diagram-docs-integration-test-2');
    fs.rmSync(outputDir2, { recursive: true, force: true });
    execFileSync('node', [CLI, 'generate', '--config', EXAMPLE_CONFIG, '--output', outputDir2], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });
    const index1 = JSON.parse(fs.readFileSync(path.join(outputDir, 'search-index.json'), 'utf8'));
    const index2 = JSON.parse(fs.readFileSync(path.join(outputDir2, 'search-index.json'), 'utf8'));
    const ids1 = index1.map(e => e.id).sort();
    const ids2 = index2.map(e => e.id).sort();
    expect(ids1).toEqual(ids2);
    fs.rmSync(outputDir2, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `npx jest test/integration.test.js --testTimeout=60000`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add test/integration.test.js
git commit -m "test: add end-to-end integration tests"
```

---

### Task 17: Site E2E Tests (Playwright)

**Files:**
- Create: `test/e2e/site.test.js`
- Create: `playwright.config.js`

- [ ] **Step 1: Create Playwright config**

Create `playwright.config.js`:

```javascript
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  use: {
    headless: true,
  },
});
```

- [ ] **Step 2: Write E2E tests**

Create `test/e2e/site.test.js`:

```javascript
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CLI = path.resolve(__dirname, '../../bin/proto-diagram-docs.js');
const CONFIG = path.resolve(__dirname, '../../proto-diagrams.example.yaml');
const OUTPUT = path.resolve(__dirname, '../../dist-e2e-test');

test.beforeAll(() => {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  execFileSync('node', [CLI, 'generate', '--config', CONFIG, '--output', OUTPUT], {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'pipe',
  });
});

test.afterAll(() => {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
});

const siteUrl = () => `file://${path.join(OUTPUT, 'index.html')}`;

test('loads the site and shows catalog', async ({ page }) => {
  await page.goto(siteUrl());
  await expect(page.locator('text=Proto Diagram Docs')).toBeVisible();
});

test('catalog shows groups', async ({ page }) => {
  await page.goto(siteUrl());
  await expect(page.locator('text=Billing')).toBeVisible();
  await expect(page.locator('text=Notifications')).toBeVisible();
});

test('clicking a proto loads a diagram', async ({ page }) => {
  await page.goto(siteUrl());
  await page.locator('.proto-entry').first().click();
  await expect(page.locator('.viewer svg, .viewer img')).toBeVisible({ timeout: 5000 });
});

test('deep link navigates to correct diagram', async ({ page }) => {
  const index = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'search-index.json'), 'utf8'));
  const firstFile = index.find(e => e.type === 'file');
  const type = firstFile.diagramTypes[0];
  await page.goto(`${siteUrl()}#/${firstFile.id}/${type}`);
  await expect(page.locator('.viewer svg, .viewer img')).toBeVisible({ timeout: 5000 });
});

test('search filters catalog entries', async ({ page }) => {
  await page.goto(siteUrl());
  await page.fill('.search-input', 'billing');
  const visibleEntries = await page.locator('.proto-entry:visible').count();
  expect(visibleEntries).toBeGreaterThan(0);
});

test('zoom controls work', async ({ page }) => {
  await page.goto(siteUrl());
  await page.locator('.proto-entry').first().click();
  await expect(page.locator('.viewer svg, .viewer img')).toBeVisible({ timeout: 5000 });
  await page.locator('.zoom-in').click();
  await page.locator('.zoom-out').click();
  await page.locator('.zoom-fit').click();
  await page.locator('.zoom-reset').click();
});

test('hamburger toggles catalog visibility', async ({ page }) => {
  await page.goto(siteUrl());
  const catalog = page.locator('.catalog');
  await expect(catalog).toBeVisible();
  await page.locator('.hamburger').click();
  await expect(catalog).not.toBeVisible();
  await page.locator('.hamburger').click();
  await expect(catalog).toBeVisible();
});
```

- [ ] **Step 3: Install Playwright browsers**

Run: `npx playwright install chromium`

- [ ] **Step 4: Run E2E tests**

Run: `npx playwright test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add playwright.config.js test/e2e/
git commit -m "test: add Playwright E2E tests for site interactions"
```

---

### Task 18: CI/CD Workflow and Documentation

**Files:**
- Create: `.github/workflows/proto-diagrams.yml`
- Create: `README.md`

- [ ] **Step 1: Create GitHub Actions workflow**

Create `.github/workflows/proto-diagrams.yml`:

```yaml
name: Proto Diagrams
on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'proto-diagrams.yaml'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Graphviz
        run: sudo apt-get update && sudo apt-get install -y graphviz

      - name: Install protodot
        run: |
          curl -L https://protodot.seamia.net/binaries/linux -o /usr/local/bin/protodot
          chmod +x /usr/local/bin/protodot
          protodot -install

      - name: Install proto-diagram-docs
        run: npm install -g proto-diagram-docs

      - name: Generate site
        env:
          GITHUB_TOKEN: ${{ secrets.PROTO_REPOS_TOKEN }}
        run: proto-diagram-docs generate

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Create CI test workflow for this repo**

Create `.github/workflows/ci.yml` — this runs tests for the CLI repo itself (separate from the adopter workflow above):

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Graphviz
        run: sudo apt-get update && sudo apt-get install -y graphviz
      - name: Install protodot
        run: |
          curl -L https://protodot.seamia.net/binaries/linux -o /usr/local/bin/protodot
          chmod +x /usr/local/bin/protodot
          protodot -install
      - run: npm ci
      - run: npm test
      - run: npx playwright install chromium
      - run: npx playwright test
```

- [ ] **Step 3: Create README**

Create `README.md` with:

1. Project title and one-line description
2. Features list
3. Quick start (install, create config, run)
4. System dependencies (Node.js >= 18, protodot, Graphviz) with install instructions per OS
5. Configuration reference (full YAML schema with all options documented)
6. How to add a new source repository
7. CI/CD setup (copy workflow, set secrets)
8. Development (clone, npm install, npm test)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/proto-diagrams.yml .github/workflows/ci.yml README.md
git commit -m "docs: add CI workflows and README"
```

---

### Task 19: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npx jest --testPathIgnorePatterns=e2e`
Expected: All tests PASS

- [ ] **Step 2: Run integration tests**

Run: `npx jest test/integration.test.js --testTimeout=60000`
Expected: All tests PASS

- [ ] **Step 3: Run E2E tests**

Run: `npx playwright test`
Expected: All tests PASS

- [ ] **Step 4: Generate the example site and manually verify**

Run: `node bin/proto-diagram-docs.js generate --config proto-diagrams.example.yaml`
Open `dist/index.html` in a browser. Walk through:
- [ ] Header shows correct tool name, version, GitHub link
- [ ] Catalog shows Billing, Notifications, Common groups
- [ ] Clicking a proto loads its SVG diagram
- [ ] Diagram type tabs switch between file-level, deps, pkg
- [ ] Pan by dragging, zoom by scrolling
- [ ] FIT and 1:1 controls work
- [ ] Search filters the catalog
- [ ] Deep link via hash URL works (copy URL, open in new tab)
- [ ] Hamburger collapses/expands catalog

- [ ] **Step 5: Clean up and final commit**

```bash
rm -rf dist-example dist-e2e-test
git add -A
git commit -m "chore: final cleanup"
```
