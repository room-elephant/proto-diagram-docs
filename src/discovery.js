const { globSync } = require('glob');
const { minimatch } = require('minimatch');
const path = require('path');
const fs = require('fs');

function discoverProtos(source) {
  const results = [];
  for (const root of source.roots) {
    const rootDir = path.join(source.resolvedPath, root.path);
    if (!fs.existsSync(rootDir)) continue;
    const files = globSync('**/*.proto', { cwd: rootDir, absolute: false });
    for (const file of files) {
      const excluded = (source.exclude || []).some(pattern => minimatch(file, pattern, { dot: true }));
      if (excluded) continue;
      const relativePath = path.join(root.path, file);
      results.push({
        filePath: path.join(rootDir, file),
        relativePath,
        fileName: path.basename(file),
        rootPath: root.path,
        label: root.label,
        description: root.description,
        source,
      });
    }
  }
  return results;
}

module.exports = { discoverProtos };
