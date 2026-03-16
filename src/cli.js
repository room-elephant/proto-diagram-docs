const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const { version } = require('../package.json');
const { checkAllDependencies } = require('./deps');
const { loadConfig, validateConfig } = require('./config');
const { resolveSources } = require('./sources');
const { discoverProtos } = require('./discovery');
const { extractMetadata } = require('./metadata');
const { generateFileId, generatePackageId } = require('./id');
const { buildIncludePaths, generateDiagram, generatePackageDiagram } = require('./generator');
const { buildSearchIndex, deriveSourceName } = require('./search-index');
const { assembleSite } = require('./assembler');
const { formatReport } = require('./reporter');

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
    const depErrors = checkAllDependencies();
    if (depErrors.length > 0) {
      depErrors.forEach(e => console.error(e));
      process.exit(1);
    }

    let config;
    try {
      config = loadConfig(options.config);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }

    const configErrors = validateConfig(config);
    if (configErrors.length > 0) {
      configErrors.forEach(e => console.error(e));
      process.exit(1);
    }

    let resolved, tmpDir;
    try {
      ({ resolved, tmpDir } = resolveSources(config.sources, config._configDir));
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }

    const allProtos = [];
    for (const source of resolved) {
      allProtos.push(...discoverProtos(source));
    }

    if (allProtos.length === 0) {
      console.error('Error: No .proto files found across all sources. Check your roots and exclude patterns.');
      process.exit(1);
    }

    for (const proto of allProtos) {
      proto.metadata = extractMetadata(proto.filePath);
    }

    const includePaths = buildIncludePaths(resolved);
    const svgDir = path.join(tmpDir || require('os').tmpdir(), 'diagrams-out');
    fs.mkdirSync(svgDir, { recursive: true });

    const failures = [];
    let diagramsGenerated = 0;

    for (const proto of allProtos) {
      const sourceIdentity = proto.source.type === 'git'
        ? proto.source.repo
        : `local:${path.resolve(config._configDir, proto.source.path)}`;
      proto.id = generateFileId(sourceIdentity, proto.rootPath, proto.relativePath);
      proto.diagramTypes = [];

      const types = [];
      if (config.diagrams.file_level) types.push('file');
      if (config.diagrams.dependency_expanded) types.push('deps');

      for (const type of types) {
        const result = generateDiagram({
          filePath: proto.filePath,
          type,
          includePaths,
          outputDir: svgDir,
          id: proto.id,
        });
        if (result.success) {
          proto.diagramTypes.push(type);
          diagramsGenerated++;
        } else {
          failures.push({ file: proto.relativePath, type, error: result.error });
        }
      }
    }

    const packageEntries = [];
    if (config.diagrams.package_level) {
      const byPackage = {};
      for (const proto of allProtos) {
        const pkg = proto.metadata.package;
        if (!pkg) continue;
        if (!byPackage[pkg]) byPackage[pkg] = [];
        byPackage[pkg].push(proto);
      }

      for (const [pkg, protos] of Object.entries(byPackage)) {
        const id = generatePackageId(pkg);
        const result = generatePackageDiagram({
          packageName: pkg,
          filePaths: protos.map(p => p.filePath),
          includePaths,
          outputDir: svgDir,
          id,
        });

        const labelCounts = {};
        protos.forEach(p => {
          labelCounts[p.label] = (labelCounts[p.label] || 0) + 1;
        });
        const label = Object.entries(labelCounts)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];

        if (result.success) {
          diagramsGenerated++;
          const allMessages = [...new Set(protos.flatMap(p => p.metadata.messages))];
          const allServices = [...new Set(protos.flatMap(p => p.metadata.services))];
          const allEnums = [...new Set(protos.flatMap(p => p.metadata.enums))];

          packageEntries.push({
            id,
            packageName: pkg,
            label,
            source: deriveSourceName(protos[0].source),
            messages: allMessages,
            services: allServices,
            enums: allEnums,
            fileCount: protos.length,
          });
        } else {
          failures.push({ file: `package:${pkg}`, type: 'pkg', error: result.error });
        }
      }
    }

    const searchIndex = buildSearchIndex(allProtos, packageEntries, config.metadata);

    assembleSite({
      outputDir: options.output,
      svgDir,
      searchIndex,
      version,
    });

    console.log(formatReport({
      sources: resolved.length,
      protosFound: allProtos.length,
      diagramsGenerated,
      diagramsFailed: failures.length,
      failures,
      outputDir: options.output,
    }));

    if (failures.length > 0) {
      process.exit(1);
    }
  });

program.parse();
