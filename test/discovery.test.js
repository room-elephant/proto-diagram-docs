const { discoverProtos } = require('../src/discovery');
const path = require('path');

const fixturesDir = path.resolve(__dirname, '../fixtures/protos');

describe('discoverProtos', () => {
  test('discovers all proto files recursively', () => {
    const source = { type: 'local', resolvedPath: fixturesDir, roots: [{ path: '.', label: 'All' }], exclude: [] };
    const results = discoverProtos(source);
    expect(results.length).toBeGreaterThanOrEqual(5);
    expect(results.every(r => r.filePath.endsWith('.proto'))).toBe(true);
  });

  test('scopes discovery to specific root', () => {
    const source = { type: 'local', resolvedPath: fixturesDir, roots: [{ path: 'billing', label: 'Billing' }], exclude: [] };
    const results = discoverProtos(source);
    expect(results.length).toBe(3);
    expect(results.every(r => r.relativePath.startsWith('billing/'))).toBe(true);
  });

  test('applies exclusion patterns', () => {
    const source = { type: 'local', resolvedPath: fixturesDir, roots: [{ path: '.', label: 'All' }], exclude: ['**/account*'] };
    const results = discoverProtos(source);
    expect(results.every(r => !r.filePath.includes('account'))).toBe(true);
  });

  test('attaches label and root to each result', () => {
    const source = { type: 'local', resolvedPath: fixturesDir, roots: [{ path: 'billing', label: 'Billing', description: 'Billing protos' }], exclude: [] };
    const results = discoverProtos(source);
    expect(results[0].label).toBe('Billing');
    expect(results[0].rootPath).toBe('billing');
  });

  test('returns empty array when root directory does not exist', () => {
    const source = { type: 'local', resolvedPath: fixturesDir, roots: [{ path: 'nonexistent', label: 'Missing' }], exclude: [] };
    const results = discoverProtos(source);
    expect(results).toEqual([]);
  });
});
