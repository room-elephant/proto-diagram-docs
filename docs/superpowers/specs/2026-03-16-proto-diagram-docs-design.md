# Proto Diagram Docs — Design Spec

A reusable CLI that generates a fully static documentation site visualizing Protocol Buffer definitions as SVG diagrams. Teams install it via `npm install -g proto-diagram-docs`, maintain a YAML config in their repo, and run the CLI to produce a self-contained site suitable for GitHub Pages, any static host, or direct file:// browsing.

## Architecture Overview

Single-Page Application generator: the CLI reads a YAML config, clones repos / resolves local paths, discovers `.proto` files, runs [protodot](https://github.com/seamia/protodot) to produce `.dot` files, runs [Graphviz](https://gitlab.com/graphviz/graphviz) `dot` to produce `.svg` files, builds a JSON search index, and assembles a `dist/` folder containing a single `index.html` (all CSS/JS inlined) plus SVG assets.

**Key tools:**
- `protodot` — transforms `.proto` → `.dot` (Graphviz graph description)
- `dot` (Graphviz) — transforms `.dot` → `.svg`

Both are external system dependencies, not bundled.

## CLI

**Package:** `proto-diagram-docs`
**Runtime:** Node.js >= 18
**Install:** `npm install -g proto-diagram-docs`
**CLI framework:** Commander.js

### Command

```
proto-diagram-docs generate [--config proto-diagrams.yaml] [--output dist]
```

- `--config` defaults to `proto-diagrams.yaml` in the current directory
- `--output` defaults to `dist/`

### Pipeline

1. **Check system dependencies** — verify `protodot` and `dot` are on PATH. Fail immediately with a clear message naming the missing tool and linking to install instructions.
2. **Load and validate config** — parse YAML, validate against a JSON schema. Fail with specific field-level errors.
3. **Resolve sources** — for git sources, shallow-clone to a temp directory using `GITHUB_TOKEN` env var if set. For local sources, verify paths exist.
4. **Discover proto files** — recursively find `.proto` files under each source's configured roots, applying exclusion globs.
5. **Extract metadata** — lightweight regex parse of each `.proto` file to extract `package`, `import` statements, and top-level `message`, `enum`, `service` names.
6. **Generate diagrams** — for each proto file, for each enabled diagram type, run protodot then dot. Collect per-file success/failure results.
7. **Build search index** — write `search-index.json` from metadata and generation results.
8. **Assemble site** — copy site shell assets, generated SVGs, and search index into the output directory.
9. **Report** — print summary of what was generated and any per-file failures.

## Configuration

Source of truth is a YAML file (`proto-diagrams.yaml`).

```yaml
diagrams:
  file_level: true          # protodot -select * (elements declared in this file only)
  package_level: true       # aggregate all files sharing the same proto package
  dependency_expanded: false # protodot with no -select (full graph including all imports)

sources:
  - type: git
    repo: https://github.com/googleapis/googleapis
    ref: master
    roots:
      - path: google/cloud/billing
        label: "Billing"
        description: "Billing and payment protos"
      - path: google/cloud/storage
        label: "Storage"
        description: "Object storage protos"
    exclude:
      - "**/*test*"
      - "**/internal/**"

  - type: local
    path: ./protos
    roots:
      - path: .
        label: "Internal"
        description: "Internal service definitions"
    exclude: []

metadata:
  show_package: true
  show_source: true
  link_to_source: true
```

### Schema rules

- `sources` — required, at least one
- `sources[].roots` — required, at least one per source
- `diagrams` — at least one type must be enabled
- Git repos must be valid URLs
- Local paths must exist on disk
- `GITHUB_TOKEN` env var used for all git sources (single global token)
- Labels on roots define catalog groups; defaults to directory name if omitted

### Metadata options

- `show_package` — when true, the proto's `package` declaration is displayed below the file name in each catalog entry (e.g., `google.cloud.billing.v1`). Default: `true`.
- `show_source` — when true, the source repository name or local path is shown as secondary text on each catalog entry. Default: `true`.
- `link_to_source` — when true, each catalog entry includes an external link icon (`↗ source`) pointing to the proto file in its source repository. For git sources, the link is constructed as `<repo>/blob/<ref>/<path-to-file>`. Not applicable to local sources. Default: `true`.

## Diagram Types

### Include path resolution

protodot uses `-inc` to resolve `import` statements in proto files. The include paths are constructed as a semicolon-separated list of all source root directories:
- For git sources: the clone directory root (e.g., `<tmpdir>/clone-googleapis`)
- For local sources: the resolved absolute path

All source roots are included in every protodot invocation so cross-source imports can resolve.

### File-level

One diagram per `.proto` file showing only elements declared in that file.

```bash
protodot -src <file.proto> -select '*' -inc <all-source-roots-semicolon-separated> -output <name>
dot -Tsvg <name>.dot -o <name>.svg
```

### Dependency-expanded

One diagram per `.proto` file showing the full graph including all imported types.

```bash
protodot -src <file.proto> -inc <all-source-roots-semicolon-separated> -output <name>
dot -Tsvg <name>.dot -o <name>.svg
```

### Package-level

One diagram per unique proto package, aggregating all files that share the same `package` declaration.

**Mechanics:** During metadata extraction (pipeline step 5), proto files are grouped by their `package` declaration. For each unique package, a synthetic `.proto` file is written to the temp directory that imports all files sharing that package:

```proto
// Auto-generated: package google.cloud.billing.v1
syntax = "proto3";
import "google/cloud/billing/v1/billing.proto";
import "google/cloud/billing/v1/invoice.proto";
import "google/cloud/billing/v1/account.proto";
```

Imports are ordered alphabetically by file path for determinism. The synthetic file is written to `<tmpdir>/pkg-<package-name>.proto`.

```bash
protodot -src <tmpdir>/pkg-google.cloud.billing.v1.proto -inc <include-paths> -output <name>
dot -Tsvg <name>.dot -o <name>.svg
```

**Edge case:** Proto files without a `package` declaration are excluded from package-level diagrams (they still get file-level and dependency-expanded diagrams if enabled).

## Output Structure

```
dist/
├── index.html              # Self-contained SPA (HTML + CSS + JS inlined)
├── search-index.json        # Machine-readable catalog
└── diagrams/                # Generated SVGs
    ├── a1b2c3d4-file.svg
    ├── a1b2c3d4-deps.svg
    ├── f9e8d7c6-pkg.svg
    └── ...
```

### Stable IDs

SHA-256 hashes (first 8 hex characters) derived from source identity:
- File diagrams (git sources): `sha256(repo_url + ":" + root_path + ":" + relative_file_path)[:8]`
- File diagrams (local sources): `sha256("local:" + absolute_config_relative_path + ":" + root_path + ":" + relative_file_path)[:8]`
- Package diagrams: `sha256("pkg:" + package_name)[:8]`

Same inputs produce the same IDs across rebuilds. Deep links remain valid unless source identifiers change.

### URL scheme (hash-based)

- `index.html` — catalog view, no diagram selected
- `index.html#/a1b2c3d4/file` — file-level diagram
- `index.html#/a1b2c3d4/deps` — dependency-expanded diagram
- `index.html#/f9e8d7c6/pkg` — package-level diagram

Hash-based routing works on GitHub Pages, any static host, and file:// protocol.

### Determinism

Given the same config and proto files, output is byte-for-byte identical. No timestamps, no random IDs.

## Search Index

`search-index.json` — one entry per proto file, plus entries for package-level diagrams:

```json
[
  {
    "id": "a1b2c3d4",
    "name": "billing.proto",
    "package": "google.cloud.billing.v1",
    "label": "Billing",
    "source": "googleapis",
    "messages": ["Invoice", "Account", "LineItem"],
    "services": ["BillingService"],
    "enums": ["InvoiceState"],
    "diagramTypes": ["file", "deps"],
    "path": "google/cloud/billing/v1/billing.proto"
  }
]
```

Searchable fields: name, package, label, message/service/enum names, path.

## Site UX

### Layout

Three-part structure: header, left catalog pane, right viewer pane.

**Header** (full width, 48px):
- Left: hamburger toggle (collapses/expands catalog) + tool name "Proto Diagram Docs"
- Right: version badge + GitHub link (https://github.com/room-elephant/proto-diagram-docs)
- Hamburger collapses the catalog pane, giving the viewer full width

**Left pane — Catalog** (320px fixed width):
- Search bar at top: filters across name, package, messages, services, enums, path. Shows "No results" message when filters match nothing.
- Collapsible groups organized by root labels, with proto count
- Each proto entry shows: file name, package (monospace), diagram type badges, source link
- Selected proto highlighted with accent left border
- Package-level diagrams in their own section at the bottom

**Right pane — Viewer**:
- Toolbar: current file name, diagram type switcher (active tab highlighted), zoom controls (+, −, FIT, 1:1)
- Fixed-size viewport that does not grow with diagram size
- Pan by mouse drag (CSS transform translate)
- Zoom by scroll wheel or +/− buttons (CSS transform scale)
- FIT: scale SVG to fill viewport and recenter
- 1:1: reset to 100% zoom and recenter
- Overflow contained inside the viewport, page never scrolls due to diagram size

### Theme

Kafbat UI-inspired dark theme with cool blue-gray tones.

**Backgrounds:**
- Header: `#0B0D0E`
- Surface/sidebar: `#171A1C`
- Cards/inputs: `#22282A`
- Viewport: `#0B0D0E`
- Borders: `#2F3639`, `#394246`

**Text:**
- Primary: `#E3E6E8`
- Secondary: `#ABB5BA`
- Muted: `#73848C`
- Subtle: `#5C6970`

**Semantic:**
- Active/selected: `#33CC66` (green)
- Info/imports: `#5B67E3` (blue)
- Warning/enums: `#FF9D00` (amber)
- Error: `#E51A1A` (red)

**Diagram node colors:**
- Services: green `#33CC66` border
- Messages: white `#D5DADD` border
- Imported types: blue `#5B67E3` border
- Enums: amber `#FF9D00` dashed border
- Node fill: `#22282A` (card color)
- Edges: `#454F54`

**Font:** Inter for UI, SF Mono / monospace for package names and code.

## Error Handling

### Fatal errors (exit 1, stop immediately)

| Situation | Message |
|---|---|
| `protodot` not on PATH | `Error: protodot is not installed. See https://github.com/seamia/protodot` |
| `dot` (graphviz) not on PATH | `Error: Graphviz is not installed. See https://graphviz.org/download/` |
| Config file not found | `Error: Config file not found at <path>. Use --config to specify.` |
| Config validation fails | `Error: Invalid config — <specific field-level message>` |
| Git clone fails | `Error: Failed to clone <url> — <reason>. Is GITHUB_TOKEN set?` |
| Local path doesn't exist | `Error: Local source path <path> does not exist.` |
| Zero protos discovered | `Error: No .proto files found. Check roots and exclude patterns.` |

### Partial errors (continue, non-zero exit at end)

Per-file protodot or graphviz failures are logged with full context (file path, stderr output), the diagram is skipped, and generation continues. All failures are surfaced in the final report.

### Final report

```
Proto Diagram Docs — Generation Complete
  Sources:    3 resolved
  Protos:     47 discovered
  Diagrams:   89 generated, 3 failed
  Output:     dist/

  Failed:
    ✗ payments/legacy.proto (file-level) — protodot: parse error line 12
    ✗ payments/legacy.proto (deps) — protodot: parse error line 12
    ✗ internal/broken.proto (file-level) — dot: syntax error
```

## Testing Strategy

### Unit tests (Jest)

- Config validation: valid configs pass, invalid configs produce specific errors
- Proto discovery: given a directory structure, correct files found and exclusions applied
- Metadata extraction: regex parser extracts package, imports, messages, services, enums
- Stable ID generation: deterministic, same inputs → same hashes
- Search index generation: correct shape and fields

### Integration tests (Jest, real protodot + graphviz)

- End-to-end generation against bundled example `.proto` files
- Verifies real protodot CLI produces valid `.dot` output
- Verifies real graphviz produces valid `.svg` output
- Verifies full pipeline from config to `dist/` output

### Site tests (Playwright)

- Hash routing: `#/id/file` loads correct diagram
- Search: typing filters the catalog
- Viewer: pan, zoom, fit, reset controls
- Catalog: collapsible groups, selection highlighting
- Deep links: opening URL with hash directly loads correct diagram

### Example protos

Bundled in the repo (3-5 real `.proto` files covering messages, enums, services, imports). Used by integration tests and as the default working example. An example config (`proto-diagrams.example.yaml`) points at these local protos and produces a working site.

## CI/CD

GitHub Actions workflow for adopter repos.

**Triggers:** daily schedule (6am UTC), manual dispatch, push to main when config changes.

**Steps:**
1. Checkout
2. Install Node.js 20
3. Install Graphviz via `sudo apt-get install -y graphviz`
4. Install protodot: `curl -L https://protodot.seamia.net/binaries/linux -o /usr/local/bin/protodot && chmod +x /usr/local/bin/protodot && protodot -install`
5. Install `proto-diagram-docs` via `npm install -g proto-diagram-docs`
6. Run `proto-diagram-docs generate` with `GITHUB_TOKEN` env var mapped from the `PROTO_REPOS_TOKEN` repo secret
7. Deploy to GitHub Pages via `actions/deploy-pages`

The CLI's non-zero exit on any fatal error causes the workflow to fail before deploy.

## Adoption

Teams adopt by:
1. `npm install -g proto-diagram-docs`
2. Create `proto-diagrams.yaml` pointing at their proto sources
3. Run `proto-diagram-docs generate`
4. Copy the documented GitHub Actions workflow into their repo
5. Set a repo secret (e.g., `PROTO_REPOS_TOKEN`) for private repos; the workflow maps it to `GITHUB_TOKEN` env var which the CLI reads

No template repository. The CLI is the only dependency. Documentation covers system dependency installation, config authoring, and CI setup.
