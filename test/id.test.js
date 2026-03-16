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
