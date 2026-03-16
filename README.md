# Proto Diagram Docs

Generate static documentation sites with SVG diagrams from Protocol Buffer definitions.

## Features

- **Static site** — Single HTML file with inlined CSS/JS, no server required
- **Multiple diagram types** — File-level, package-level, and dependency-expanded views
- **Search** — Filter catalog by name, package, messages, services, enums
- **Pan/zoom viewer** — Mouse drag to pan, scroll or buttons to zoom, FIT and 1:1 modes
- **GitHub Pages deployment** — Ready-to-use workflow for automated publishing
- **file:// compatible** — Open `index.html` directly in a browser

## System Dependencies

- **Node.js** >= 18
- **protodot** — Transforms `.proto` → `.dot` (Graphviz)
- **Graphviz** — Transforms `.dot` → `.svg`

### Installing Graphviz

**macOS:**
```bash
brew install graphviz
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get update && sudo apt-get install -y graphviz
```

### Installing protodot

```bash
# Download binary (Linux example)
curl -L https://protodot.seamia.net/binaries/linux -o /usr/local/bin/protodot
chmod +x /usr/local/bin/protodot
protodot -install
```

See [protodot](https://github.com/seamia/protodot) for macOS and other platforms.

## Quick Start

```bash
npm install -g proto-diagram-docs
```

Create `proto-diagrams.yaml` in your project:

```yaml
diagrams:
  file_level: true
  package_level: true
  dependency_expanded: false

sources:
  - type: local
    path: ./protos
    roots:
      - path: .
        label: "My Protos"
        description: "Service definitions"
    exclude: []
```

Generate the site:

```bash
proto-diagram-docs generate
```

Output goes to `dist/` by default. Open `dist/index.html` in a browser.

## Configuration Reference

### diagrams

Enable or disable diagram types. At least one must be `true`.

| Option | Default | Description |
|--------|---------|-------------|
| `file_level` | `true` | One diagram per `.proto` file (elements declared in that file only) |
| `package_level` | `false` | One diagram per proto package (aggregates all files sharing the package) |
| `dependency_expanded` | `false` | One diagram per file showing full graph including imports |

### sources

Required. Array of proto sources. Each source must have at least one root.

#### Git source

```yaml
- type: git
  repo: https://github.com/org/repo
  ref: main
  roots:
    - path: path/to/protos
      label: "Group Name"
      description: "Optional description"
  exclude:
    - "**/*test*"
    - "**/internal/**"
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"git"` |
| `repo` | yes | Git repository URL |
| `ref` | no | Branch or tag (default: `master`) |
| `roots` | yes | Array of root configs (see below) |
| `exclude` | no | Glob patterns to exclude (default: `[]`) |

#### Local source

```yaml
- type: local
  path: ./protos
  roots:
    - path: .
      label: "Internal"
      description: "Internal service definitions"
  exclude: []
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"local"` |
| `path` | yes | Path to proto directory (relative to config file) |
| `roots` | yes | Array of root configs (see below) |
| `exclude` | no | Glob patterns to exclude (default: `[]`) |

#### Root config

| Field | Required | Description |
|-------|----------|-------------|
| `path` | yes | Subpath within the source (e.g. `google/cloud/billing` or `.` for root) |
| `label` | no | Catalog group name (default: directory name) |
| `description` | no | Optional description for the group |

### metadata

Display options for catalog entries.

| Option | Default | Description |
|--------|---------|-------------|
| `show_package` | `true` | Show proto package below file name |
| `show_source` | `true` | Show source repo or path on each entry |
| `link_to_source` | `true` | Add external link to proto file in repo (git sources only) |

## Adding a New Source

1. Add a new entry to `sources` in `proto-diagrams.yaml`.
2. For **git** sources: set `type: git`, `repo`, optional `ref`, and define `roots` with `path` and optional `label`/`description`.
3. For **local** sources: set `type: local`, `path` to your proto directory, and define `roots`.
4. Add `exclude` patterns if needed (e.g. `["**/*test*", "**/internal/**"]`).
5. Run `proto-diagram-docs generate`.

## CI/CD Setup

1. Copy `.github/workflows/proto-diagrams.yml` into your repository.
2. Ensure `proto-diagrams.yaml` exists in the repo root (or adjust the workflow `paths` filter).
3. Add a repo secret `PROTO_REPOS_TOKEN` — a GitHub token with `repo` scope for private repos. The workflow maps it to `GITHUB_TOKEN` for cloning.
4. Enable GitHub Pages: Settings → Pages → Source: GitHub Actions.
5. The workflow runs on schedule (daily 6am UTC), manual dispatch, and when `proto-diagrams.yaml` changes on `main`.

## Development

```bash
git clone https://github.com/room-elephant/proto-diagram-docs
cd proto-diagram-docs
npm install
npm test
```

E2E tests require protodot and Graphviz installed:

```bash
npx playwright install chromium
npm run test:e2e
```

## License

MIT
