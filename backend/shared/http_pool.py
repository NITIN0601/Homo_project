"""
Shared async HTTP client pool for all external service calls.
Prevents creating a new TCP connection per request (Supabase, LLM APIs, etc.)
"""
import httpx

_client: httpx.AsyncClient | None = None


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=45.0, write=10.0, pool=5.0),
            limits=httpx.Limits(max_connections=30, max_keepalive_connections=15),
        )
    return _client


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None

