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
