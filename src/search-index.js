const path = require('path');

function deriveSourceName(source) {
  if (source.type === 'git') {
    return path.basename(source.repo.replace(/\.git$/, ''));
  }
  return path.basename(source.path);
}

function buildSourceUrl(proto) {
  if (proto.source.type !== 'git') return undefined;
  const repo = proto.source.repo.replace(/\.git$/, '');
  const ref = proto.source.ref || 'master';
  const filePath = proto.relativePath.replace(/\\/g, '/');
  return `${repo}/blob/${ref}/${filePath}`;
}

function buildSearchIndex(fileProtos, packageEntries, metadata) {
  const linkToSource = metadata && metadata.link_to_source !== false;
  const index = [];
  for (const proto of fileProtos) {
    const entry = {
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
    };
    if (linkToSource) {
      const url = buildSourceUrl(proto);
      if (url) entry.sourceUrl = url;
    }
    index.push(entry);
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
