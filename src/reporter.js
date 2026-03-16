function formatReport({ sources, protosFound, diagramsGenerated, diagramsFailed, failures, outputDir }) {
  const lines = [
    '',
    'Proto Diagram Docs — Generation Complete',
    `  Sources:    ${sources} resolved`,
    `  Protos:     ${protosFound} discovered`,
    `  Diagrams:   ${diagramsGenerated} generated, ${diagramsFailed} failed`,
    `  Output:     ${outputDir}/`,
  ];
  if (failures.length > 0) {
    lines.push('');
    lines.push('  Failed:');
    for (const f of failures) {
      lines.push(`    ✗ ${f.file} (${f.type}) — ${f.error}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = { formatReport };
