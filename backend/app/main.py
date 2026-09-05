from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import projects, memory, sessions, proposals, context, handoff

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

app.include_router(projects.router)
app.include_router(memory.router)
app.include_router(sessions.router)
app.include_router(proposals.router)
app.include_router(context.router)
app.include_router(handoff.router)

@app.get("/")
def root():
    return {"message": "ContextBridge API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}