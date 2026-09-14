from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.core.config import settings

security = HTTPBearer(auto_error=False)

# Anon client is sufficient for token verification
_auth_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        response = _auth_client.auth.get_user(credentials.credentials)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return response.user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")