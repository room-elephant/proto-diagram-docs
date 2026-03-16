const fs = require('fs');
const path = require('path');

function safeInlineJson(data) {
  return JSON.stringify(data).replace(/<\//g, '<\\/');
}

function assembleSite({ outputDir, svgDir, searchIndex, version }) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'diagrams'), { recursive: true });

  const templatePath = path.join(__dirname, 'site', 'template.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace(/\{\{VERSION\}\}/g, version);
  html = html.replace(/\{\{GITHUB_URL\}\}/g, 'https://github.com/room-elephant/proto-diagram-docs');

  const indexJson = safeInlineJson(searchIndex);
  html = html.replace(/\/\*SEARCH_INDEX_START\*\/\[\]\/\*SEARCH_INDEX_END\*\//, indexJson);

  const svgMap = {};
  if (fs.existsSync(svgDir)) {
    const svgFiles = fs.readdirSync(svgDir).filter(f => f.endsWith('.svg') && !f.endsWith('.dot.svg'));
    for (const file of svgFiles) {
      fs.copyFileSync(path.join(svgDir, file), path.join(outputDir, 'diagrams', file));
      svgMap[file] = fs.readFileSync(path.join(svgDir, file), 'utf8');
    }
  }

  html = html.replace(/\/\*SVG_DATA_START\*\/\{\}\/\*SVG_DATA_END\*\//, safeInlineJson(svgMap));

  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  fs.writeFileSync(path.join(outputDir, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
}

module.exports = { assembleSite };
