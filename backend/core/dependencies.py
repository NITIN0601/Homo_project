"""
Shared FastAPI Dependencies and Rate Limiting Infrastructure.
"""
from collections.abc import Callable

from fastapi import Request
from fastapi.responses import JSONResponse

try:
    from slowapi import Limiter
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)

    def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Rate limit exceeded. Please wait and try again.",
                "retry_after": str(exc.limit),
            },
        )
except ImportError:
    # Graceful fallback when slowapi is not installed
    class DummyLimiter:
        def limit(self, *args, **kwargs) -> Callable:
            def decorator(func):
                return func
            return decorator

    limiter = DummyLimiter()  # type: ignore

    class RateLimitExceeded(Exception):  # type: ignore
        pass

    def rate_limit_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded."},
        )

__all__ = ["limiter", "rate_limit_handler", "RateLimitExceeded"]
