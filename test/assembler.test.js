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
    assembleSite({ outputDir, svgDir, searchIndex: [{ id: 'abc', name: 'test.proto' }], version: '1.0.0' });
    expect(fs.existsSync(path.join(outputDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'search-index.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'diagrams'))).toBe(true);
  });

  test('injects version into index.html', () => {
    assembleSite({ outputDir, svgDir, searchIndex: [], version: '2.5.0' });
    const html = fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8');
    expect(html).toContain('2.5.0');
  });

  test('writes search index as JSON file', () => {
    const index = [{ id: 'abc', name: 'test.proto' }];
    assembleSite({ outputDir, svgDir, searchIndex: index, version: '1.0.0' });
    const written = JSON.parse(fs.readFileSync(path.join(outputDir, 'search-index.json'), 'utf8'));
    expect(written).toEqual(index);
  });

  test('inlines search index into HTML', () => {
    const index = [{ id: 'abc', name: 'test.proto' }];
    assembleSite({ outputDir, svgDir, searchIndex: index, version: '1.0.0' });
    const html = fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8');
    expect(html).toContain('"id":"abc"');
  });

  test('inlines SVG data into HTML', () => {
    assembleSite({ outputDir, svgDir, searchIndex: [], version: '1.0.0' });
    const html = fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8');
    expect(html).toContain('<svg>test<\\/svg>');
  });

  test('copies SVG files to diagrams directory', () => {
    assembleSite({ outputDir, svgDir, searchIndex: [], version: '1.0.0' });
    expect(fs.existsSync(path.join(outputDir, 'diagrams', 'abc-file.svg'))).toBe(true);
  });
});
