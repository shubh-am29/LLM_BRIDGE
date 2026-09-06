# ContextBridge

ContextBridge is a project-memory platform for developers and AI coding agents. It combines a React web application, a FastAPI backend, and a command-line client to capture project context, organize conversations, track memory, and generate agent-ready handoffs.

## What It Provides

- Project dashboards and project workspaces
- Conversation/session import and inspection
- Structured project memory and memory versions
- Context previews and export packages
- Proposal and agent handoff workflows
- A CLI for synchronizing project context into local files

## Repository Structure

```text
contextbridge/
├── frontend/       React + Vite web application
├── backend/        FastAPI application and services
├── cli/            ctxbridge command-line client
├── database/       Database-related files
├── docs/            Architecture and project documentation
├── .gitignore
└── README.md
```

## Architecture

```text
Browser ──> React/Vite frontend ── /api proxy ──> FastAPI backend ──> Supabase
													   ^
													   │
									  ctxbridge CLI ────┘
```

The frontend runs on Vite and proxies `/api` requests to `http://127.0.0.1:8000`. The backend exposes project, memory, session, proposal, context, and handoff APIs. The CLI communicates with the backend directly and writes synchronized context files into the linked project’s `.contextbridge/` directory.

## Requirements

- Node.js 18 or newer
- npm
- Python 3.10 or newer
- A Supabase project and service-role key

## Backend Setup

Open a terminal in `backend/` and create or activate a virtual environment:

```bash
cd backend
python -m venv venv
```

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

On macOS or Linux:

```bash
source venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env` with your own credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
APP_ENV=development
```

Never commit `.env` or expose the Supabase service-role key. The repository ignore rules already exclude environment files and the backend virtual environment.

Start the API from the `backend/` directory:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend provides these basic endpoints:

- `GET /` - API status message
- `GET /health` - health check
- Interactive API documentation at `http://127.0.0.1:8000/docs`

The backend also registers routers for projects, memory, sessions, proposals, context, and handoff workflows.

## Frontend Setup

Open another terminal in `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

Available frontend routes include:

- `/` - dashboard
- `/projects/:projectId` - project workspace
- `/projects/:projectId/import` - import a session
- `/projects/:projectId/sessions/:sessionId` - session details
- `/projects/:projectId/proposals/:proposalId` - proposal details
- `/projects/:projectId/handoff` - agent handoff

Useful frontend commands:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## CLI Setup

The CLI package is located in `cli/` and exposes the `ctxbridge` command.

```bash
cd cli
npm install
npm link
```

To run it without linking:

```bash
node bin/ctxbridge.js --help
```

From a project directory connected to the ContextBridge backend:

```bash
ctxbridge init
ctxbridge sync
ctxbridge status
ctxbridge export
ctxbridge health
```

Use another backend URL during initialization when needed:

```bash
ctxbridge init --backend http://127.0.0.1:8000
```

Or override it for any command via an environment variable:

```bash
CONTEXTBRIDGE_API_URL=http://127.0.0.1:8000 ctxbridge health
```

The CLI commands are:

| Command | Purpose |
| --- | --- |
| `ctxbridge init` | Connect the current directory to a ContextBridge project |
| `ctxbridge sync` | Download current memory and agent instructions |
| `ctxbridge status` | Show local files, backend health, memory completeness, and handoff readiness |
| `ctxbridge export` | Export agent-readable context files |
| `ctxbridge export --root` | Also write `AGENT-CONTEXT.md` to the current project root |
| `ctxbridge health` | Check connectivity to the ContextBridge backend |

CLI-generated files are stored in `.contextbridge/` and are ignored by Git because they can contain project-specific context and configuration.

## Development Workflow

1. Configure the backend environment and start FastAPI.
2. Start the frontend development server.
3. Open the web interface and create or select a project.
4. Use the project pages to import sessions and manage memory.
5. Run the CLI from another project directory to initialize a link and synchronize agent context.
6. Use `ctxbridge status` to inspect memory completeness before an agent handoff.

## Security Notes

- Do not commit `backend/.env`, `.contextbridge/`, or any service credentials.
- Treat exported memory, handoff prompts, and `AGENT-CONTEXT.md` as potentially sensitive project data.
- Use a Supabase service-role key only on the trusted backend. Never expose it in frontend code.
- If a service key has been exposed, rotate it in Supabase and update the local environment.

## Documentation

- [CLI documentation](cli/readme.md)
- [Architecture notes](docs/architecture.md)

## Status

ContextBridge is under active development. The frontend, backend, and CLI are organized as separate runnable parts of the same project and currently use local development defaults for their server URLs.