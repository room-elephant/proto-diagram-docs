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
    const localProtos = [{ ...protos[0], source: { type: 'local', path: './my-protos' } }];
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
