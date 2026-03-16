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
