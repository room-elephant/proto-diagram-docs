const { execFileSync } = require('child_process');

function checkDependency(command) {
  try {
    execFileSync(command, ['--help'], { stdio: 'pipe' });
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    return true;
  }
}

function checkAllDependencies() {
  const errors = [];

  if (!checkDependency('protodot')) {
    errors.push('Error: protodot is not installed. See https://github.com/seamia/protodot for installation.');
  }

  if (!checkDependency('dot')) {
    errors.push('Error: Graphviz is not installed. See https://graphviz.org/download/ for installation.');
  }

  return errors;
}

module.exports = { checkDependency, checkAllDependencies };
