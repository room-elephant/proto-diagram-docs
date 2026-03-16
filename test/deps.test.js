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
