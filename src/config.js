const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Error: Config file not found at ${configPath}. Use --config to specify a path.`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);

  if (!config || typeof config !== 'object') {
    throw new Error(`Error: Config file at ${configPath} is empty or invalid.`);
  }

  config._configDir = path.dirname(path.resolve(configPath));
  return config;
}

function validateConfig(config) {
  const errors = [];

  if (!config.diagrams) {
    config.diagrams = { file_level: true, package_level: false, dependency_expanded: false };
  }

  const { file_level, package_level, dependency_expanded } = config.diagrams;
  if (!file_level && !package_level && !dependency_expanded) {
    errors.push('Error: Invalid config — at least one diagram type must be enabled.');
  }

  if (!config.sources || !Array.isArray(config.sources) || config.sources.length === 0) {
    errors.push('Error: Invalid config — sources is required and must contain at least one source.');
    return errors;
  }

  config.sources.forEach((source, i) => {
    const prefix = `sources[${i}]`;

    if (!['git', 'local'].includes(source.type)) {
      errors.push(`Error: Invalid config — ${prefix}.type must be "git" or "local", got "${source.type}".`);
      return;
    }

    if (source.type === 'git' && !source.repo) {
      errors.push(`Error: Invalid config — ${prefix}.repo is required for git sources.`);
    }

    if (source.type === 'local' && !source.path) {
      errors.push(`Error: Invalid config — ${prefix}.path is required for local sources.`);
    }

    if (!source.roots || !Array.isArray(source.roots) || source.roots.length === 0) {
      errors.push(`Error: Invalid config — ${prefix}.roots is required and must contain at least one root.`);
      return;
    }

    source.roots.forEach((root, j) => {
      if (!root.label) {
        root.label = path.basename(root.path) || root.path;
      }
    });

    if (!source.exclude) {
      source.exclude = [];
    }
  });

  if (!config.metadata) {
    config.metadata = { show_package: true, show_source: true, link_to_source: true };
  }

  return errors;
}

module.exports = { loadConfig, validateConfig };
