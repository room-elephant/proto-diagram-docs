const { Command } = require('commander');
const { version } = require('../package.json');

const program = new Command();

program
  .name('proto-diagram-docs')
  .description('Generate static documentation sites with SVG diagrams from Protocol Buffer definitions')
  .version(version);

program
  .command('generate')
  .description('Generate the static documentation site')
  .option('-c, --config <path>', 'Path to config file', 'proto-diagrams.yaml')
  .option('-o, --output <path>', 'Output directory', 'dist')
  .action(async (options) => {
    console.log('proto-diagram-docs: generate not yet implemented');
    process.exit(1);
  });

program.parse();
