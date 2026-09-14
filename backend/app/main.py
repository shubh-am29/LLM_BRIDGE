from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api import projects, memory, sessions, proposals, context, handoff
from app.core.auth import get_current_user

app = FastAPI(title="ContextBridge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public — no auth needed
@app.get("/")
def root():
    return {"message": "ContextBridge API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# Protected — valid Supabase session required
_auth = [Depends(get_current_user)]

app.include_router(projects.router,  dependencies=_auth)
app.include_router(memory.router,    dependencies=_auth)
app.include_router(sessions.router,  dependencies=_auth)
app.include_router(proposals.router, dependencies=_auth)
app.include_router(context.router,   dependencies=_auth)
app.include_router(handoff.router,   dependencies=_auth)