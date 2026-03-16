const { generateDiagram, buildIncludePaths, generatePackageDiagram } = require('../src/generator');
const path = require('path');
const fs = require('fs');
const os = require('os');

const fixturesDir = path.resolve(__dirname, '../fixtures/protos');

describe('buildIncludePaths', () => {
  test('joins source paths with semicolons', () => {
    const sources = [{ resolvedPath: '/a/b' }, { resolvedPath: '/c/d' }];
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
