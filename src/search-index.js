const path = require('path');

function deriveSourceName(source) {
  if (source.type === 'git') {
    return path.basename(source.repo.replace(/\.git$/, ''));
  }
  return path.basename(source.path);
}

function buildSearchIndex(fileProtos, packageEntries) {
  const index = [];
  for (const proto of fileProtos) {
    index.push({
      id: proto.id,
      type: 'file',
      name: proto.fileName,
      package: proto.metadata.package,
      label: proto.label,
      source: deriveSourceName(proto.source),
      messages: proto.metadata.messages,
      services: proto.metadata.services,
      enums: proto.metadata.enums,
      diagramTypes: proto.diagramTypes,
      path: proto.relativePath,
    });
  }
  for (const pkg of packageEntries) {
    index.push({
      id: pkg.id,
      type: 'package',
      name: pkg.packageName,
      package: pkg.packageName,
      label: pkg.label,
      source: pkg.source,
      messages: pkg.messages,
      services: pkg.services,
      enums: pkg.enums,
      diagramTypes: ['pkg'],
      fileCount: pkg.fileCount,
    });
  }
  return index;
}

module.exports = { buildSearchIndex, deriveSourceName };
