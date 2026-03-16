# Proto Diagram Docs

Generate static documentation sites with SVG diagrams from Protocol Buffer definitions.

## Features

- **Fully self-contained** — single HTML file with inlined search index, SVG diagrams, CSS, and JS
- **Multiple diagram types** — file-level, dependency-expanded, and package-level views
- **Searchable catalog** — filter by name, package, messages, services, or enums
- **Interactive viewer** — pan by drag, scroll to zoom, auto-fit on load, FIT and 1:1 controls
- **Dark theme** — Kafbat UI-inspired dark interface
- **Works everywhere** — open `index.html` directly from the filesystem (`file://`), serve from GitHub Pages, or any static host

## System Dependencies

| Dependency | Purpose | Install |
|------------|---------|---------|
| **Node.js** >= 18 | CLI runtime | [nodejs.org](https://nodejs.org) |
| **protodot** | `.proto` → `.dot` | See below |
| **Graphviz** | `.dot` → `.svg` | See below |

### Graphviz

```bash
# macOS
brew install graphviz

# Debian / Ubuntu
sudo apt-get update && sudo apt-get install -y graphviz
```

### protodot

```bash
# macOS
curl -L https://protodot.seamia.net/binaries/darwin -o /usr/local/bin/protodot
chmod +x /usr/local/bin/protodot
protodot -install

# Linux
curl -L https://protodot.seamia.net/binaries/linux -o /usr/local/bin/protodot
chmod +x /usr/local/bin/protodot
protodot -install
```

See [protodot](https://github.com/seamia/protodot) for more details.

## Quick Start

```bash
npm install -g proto-diagram-docs
```

Create a `proto-diagrams.yaml` in your project root:

```yaml
diagrams:
  file_level: true
  package_level: true
  dependency_expanded: true

sources:
  - type: git
    repo: https://github.com/open-telemetry/opentelemetry-proto
    ref: main
    roots:
      - path: opentelemetry/proto/trace/v1
        label: "Trace"
      - path: opentelemetry/proto/metrics/v1
        label: "Metrics"
    exclude:
      - "**/test/**"

metadata:
  show_package: true
  show_source: true
  link_to_source: true
```

Generate the site:

```bash
proto-diagram-docs generate --config proto-diagrams.yaml
```

Output goes to `dist/` by default. Open `dist/index.html` in any browser.

Use `--output` to change the destination:

```bash
proto-diagram-docs generate --config proto-diagrams.yaml --output ./site
```

See [`examples/proto-diagrams.yaml`](examples/proto-diagrams.yaml) for a full configuration example using OpenTelemetry protos.

## Configuration Reference

### `diagrams`

Controls which diagram types to generate. At least one must be `true`.

| Option | Default | Description |
|--------|---------|-------------|
| `file_level` | `true` | One diagram per `.proto` file showing only its own types |
| `package_level` | `false` | One diagram per proto package aggregating all files that share it |
| `dependency_expanded` | `false` | One diagram per file showing its types plus all imported types |

### `sources`

Required. Array of proto sources. Each source must have at least one root.

#### Git source

Clones a repository at build time. For private repos, set the `GITHUB_TOKEN` environment variable.

```yaml
- type: git
  repo: https://github.com/org/repo
  ref: main
  roots:
    - path: path/to/protos
      label: "Group Name"
      description: "Optional description"
  exclude:
    - "**/test/**"
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"git"` |
| `repo` | yes | Git repository URL |
| `ref` | no | Branch or tag (default: `master`) |
| `roots` | yes | Array of root configs |
| `exclude` | no | Glob patterns to exclude (default: `[]`) |

#### Local source

References proto files on the local filesystem.

```yaml
- type: local
  path: ./protos
  roots:
    - path: .
      label: "Internal"
  exclude: []
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"local"` |
| `path` | yes | Path to proto directory (relative to config file) |
| `roots` | yes | Array of root configs |
| `exclude` | no | Glob patterns to exclude (default: `[]`) |

#### Root config

| Field | Required | Description |
|-------|----------|-------------|
| `path` | yes | Subpath within the source (use `.` for root) |
| `label` | no | Catalog group name (defaults to directory name) |
| `description` | no | Description for the group |

### `metadata`

Display options for catalog entries.

| Option | Default | Description |
|--------|---------|-------------|
| `show_package` | `true` | Show proto package below file name |
| `show_source` | `true` | Show source name on each entry |
| `link_to_source` | `true` | Link to proto file in repository (git sources only) |

## Adding a New Source

1. Add a new entry to `sources` in your `proto-diagrams.yaml`.
2. For **git** sources: set `type: git`, `repo`, optional `ref`, and `roots`.
3. For **local** sources: set `type: local`, `path`, and `roots`.
4. Add `exclude` patterns to skip test or internal protos.
5. Run `proto-diagram-docs generate`.

## CI/CD with GitHub Actions

A ready-to-use workflow is provided in `.github/workflows/proto-diagrams.yml`.

1. Copy it into your repository's `.github/workflows/` directory.
2. Add a `proto-diagrams.yaml` config to the repo root.
3. For private repos, add a `PROTO_REPOS_TOKEN` secret with `repo` scope.
4. Enable GitHub Pages: **Settings > Pages > Source: GitHub Actions**.

The workflow runs daily (6 AM UTC), on manual dispatch, and when `proto-diagrams.yaml` changes on `main`.

## Development

```bash
git clone https://github.com/room-elephant/proto-diagram-docs
cd proto-diagram-docs
npm install
```

### Running Tests

```bash
# Unit tests (fast, no external deps)
npm test

# Integration tests (requires protodot + Graphviz)
npm run test:integration

# E2E browser tests (requires protodot + Graphviz + Playwright)
npx playwright install chromium
npm run test:e2e

# Everything
npm run test:all
```

### Project Structure

```
bin/                  CLI entry point
src/
  cli.js              Command definitions (Commander.js)
  config.js            YAML config loading and validation
  deps.js              System dependency checks
  discovery.js         Recursive .proto file discovery
  generator.js         protodot + Graphviz diagram generation
  id.js                Deterministic SHA-256 ID generation
  metadata.js          Proto file parsing (package, messages, etc.)
  assembler.js         Static site assembly
  reporter.js          Build summary formatting
  search-index.js      Search index builder
  sources.js           Git clone / local path resolution
  site/
    template.html      SPA template (HTML + CSS + JS)
test/
  fixtures/protos/     Example proto files for testing
  e2e/                 Playwright browser tests
  *.test.js            Jest unit and integration tests
examples/
  proto-diagrams.yaml  Full example configuration
```

## License

MIT
