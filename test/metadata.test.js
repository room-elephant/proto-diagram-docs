const { extractMetadata } = require('../src/metadata');
const path = require('path');

const fixturesDir = path.resolve(__dirname, 'fixtures/protos');

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
