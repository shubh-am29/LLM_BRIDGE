# ContextBridge CLI

The ContextBridge CLI links a local project to a ContextBridge backend and keeps project memory available to developers and AI coding agents from the terminal.

The executable is named `ctxbridge`. It can initialize a project link, synchronize memory, inspect project health, and export agent-ready context files.

## Requirements

- Node.js 18 or newer
- npm
- A running ContextBridge backend
- A project already created in ContextBridge

The CLI resolves the backend URL in this order: `CONTEXTBRIDGE_API_URL` environment variable → `.contextbridge/config.json` (set by `ctxbridge init`) → global config (`~/.contextbridge/config.json`) → the default, `http://127.0.0.1:8000`.

## Installation

From the CLI directory:

```bash
npm install
```

To use `ctxbridge` globally while developing the CLI, create a local npm link:

```bash
npm link
```

You can also run the entry point directly without linking:

```bash
node bin/ctxbridge.js --help
```

## Quick Start

Start the backend from the backend directory:

```bash
uvicorn app.main:app --reload --port 8000
```

From the project you want to connect:

```bash
ctxbridge init
ctxbridge sync
ctxbridge status
ctxbridge export
ctxbridge health
```

During initialization, the CLI checks the backend, lists available projects, and prompts you to select one. To provide a different backend URL without the prompt:

```bash
ctxbridge init --backend http://127.0.0.1:8000
```

Or override the backend URL for any command via the environment variable:

```bash
CONTEXTBRIDGE_API_URL=http://127.0.0.1:8000 ctxbridge health
```

## Commands

### `ctxbridge init`

Links the current directory to a ContextBridge project.

```bash
ctxbridge init
ctxbridge init --backend http://localhost:8000
```

This command:

1. Connects to the backend health endpoint.
2. Retrieves the available projects.
3. Prompts you to select a project.
4. Writes local project configuration.
5. Adds the local configuration path to `.gitignore` when needed.

### `ctxbridge sync`

Downloads the latest project memory, handoff prompt, and agent instructions into `.contextbridge/`.

```bash
ctxbridge sync
```

Run `init` first in a directory that has not been linked.

### `ctxbridge status`

Displays local configuration, generated file presence, backend connectivity, memory completeness, sessions, versions, warnings, and handoff readiness.

```bash
ctxbridge status
```

### `ctxbridge export`

Exports the latest project context into `.contextbridge/`.

```bash
ctxbridge export
ctxbridge export --root
```

The `--root` option also writes `AGENT-CONTEXT.md` to the current project root.

### `ctxbridge health`

Checks connectivity to the ContextBridge backend without needing a linked project. Uses the same backend URL resolution as every other command (`CONTEXTBRIDGE_API_URL` → local config → global config → default).

```bash
ctxbridge health
CONTEXTBRIDGE_API_URL=http://127.0.0.1:8000 ctxbridge health
```

Expected output:

```text
✓ ContextBridge backend is connected
Backend : http://127.0.0.1:8000
Status  : ok
```

### Help and version

```bash
ctxbridge --help
ctxbridge --version
```

## Generated Files

After `sync` or `export`, the CLI writes files to the linked project's `.contextbridge/` directory:

| File | Purpose |
| --- | --- |
| `config.json` | Local project ID, project name, backend URL, and sync metadata |
| `project.json` | Project metadata and memory version |
| `memory.md` | Human-readable project memory |
| `context.json` | Structured project memory |
| `handoff.md` | Agent handoff prompt |
| `AGENT-INSTRUCTIONS.md` | Instructions for using the project context |
| `project-config.json` | Export metadata written by `export` |

These files may contain project-specific information and should not be committed unless your team explicitly wants them tracked. The root and CLI `.gitignore` files ignore `.contextbridge/` by default.

When `ctxbridge export --root` is used, `AGENT-CONTEXT.md` is written to the current project root. Review that file before committing it because it can contain project context.

## Configuration

The project-specific configuration is stored at:

```text
.contextbridge/config.json
```

It contains values such as:

```json
{
	"project_id": "your-project-id",
	"project_name": "Your project",
	"backend_url": "http://127.0.0.1:8000"
}
```

Run `ctxbridge init` to create or replace this configuration. Do not share it publicly because it identifies the linked project and backend.

## Input Validation & Error Handling

The CLI validates input before making network calls, and reports failures clearly instead of raw stack traces:

- A `--backend` URL (or `CONTEXTBRIDGE_API_URL`) missing a protocol, empty, or otherwise malformed is rejected immediately with a message showing the expected format.
- A malformed `CONTEXTBRIDGE_API_URL` triggers a warning and falls back to the next source in the resolution order instead of silently failing later.
- A `.contextbridge/config.json` missing required fields (e.g. hand-edited or corrupted) is caught before any request is made, with a prompt to re-run `ctxbridge init`.
- Connection failures, timeouts, and unresolvable hosts are reported with a specific, actionable message.
- Non-2xx HTTP responses (400, 404, 422, 500, and others) show the status code, a short explanation, and any `detail`/`message` field the backend returned.

## Backend API

The CLI expects the backend to provide these endpoints:

- `GET /health`
- `GET /projects/`
- `GET /projects/{project_id}`
- `GET /projects/{project_id}/memory/`
- `GET /projects/{project_id}/memory/versions`
- `GET /projects/{project_id}/sessions/`
- `GET /projects/{project_id}/handoff/prompt`
- `GET /projects/{project_id}/handoff/completeness`
- `GET /projects/{project_id}/context/export/package`

## Development

Run the CLI locally:

```bash
npm start -- --help
```

The CLI is implemented with Node.js, Commander, Axios, Chalk, and Ora. Dependencies are declared in `package.json`, and `package-lock.json` should be committed so installations remain reproducible.

## Troubleshooting

### Backend cannot be reached

Confirm that the backend is running and that the configured URL is correct:

```bash
uvicorn app.main:app --reload --port 8000
ctxbridge init --backend http://127.0.0.1:8000
```

### No projects are available

Create a project in the ContextBridge web interface first, then run `ctxbridge init` again.

### No local configuration found

Run the following command from the project directory you want to connect:

```bash
ctxbridge init
```

### Refreshing stale context

Run:

```bash
ctxbridge sync
```