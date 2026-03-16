const fs = require('fs');

function extractMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const packageMatch = content.match(/^\s*package\s+([\w.]+)\s*;/m);
  const pkg = packageMatch ? packageMatch[1] : '';
  const imports = [];
  const importRegex = /^\s*import\s+"([^"]+)"\s*;/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) { imports.push(match[1]); }
  const messages = [];
  const messageRegex = /^\s*message\s+(\w+)\s*\{/gm;
  while ((match = messageRegex.exec(content)) !== null) { messages.push(match[1]); }
  const services = [];
  const serviceRegex = /^\s*service\s+(\w+)\s*\{/gm;
  while ((match = serviceRegex.exec(content)) !== null) { services.push(match[1]); }
  const enums = [];
  const enumRegex = /^\s*enum\s+(\w+)\s*\{/gm;
  while ((match = enumRegex.exec(content)) !== null) { enums.push(match[1]); }
  return { package: pkg, imports, messages, services, enums };
}

module.exports = { extractMetadata };
