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
