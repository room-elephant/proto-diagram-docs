const crypto = require('crypto');

function generateFileId(sourceIdentity, rootPath, relativePath) {
  const input = `${sourceIdentity}:${rootPath}:${relativePath}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
}

function generatePackageId(packageName) {
  const input = `pkg:${packageName}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
}

module.exports = { generateFileId, generatePackageId };
