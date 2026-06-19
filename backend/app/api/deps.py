import jwt
from jwt.algorithms import ECAlgorithm
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.config import settings

_bearer = HTTPBearer()

# Supabase ES256 공개키 (JWKS에서 가져옴)
_JWKS = {
    "alg": "ES256", "crv": "P-256", "kty": "EC", "use": "sig",
    "x": "jzX00QUtMgUPar1UutWKPAM6vVYSlpitygACrrBgxKw",
    "y": "9hrgcNSYl07vawXbTnxHXaRsOgmSB1WbRhOCdB9vks8",
}
import json as _json
_public_key = ECAlgorithm.from_jwk(_json.dumps(_JWKS))


def get_current_user(
    creds: HTTPAuthorizationCredentials = Security(_bearer),
) -> str:
    try:
        payload = jwt.decode(
            creds.credentials,
            _public_key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료됐습니다")
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"JWT 오류: {type(e).__name__}: {e}")
