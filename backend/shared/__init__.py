"""
Shared cross-slice infrastructure and utilities.
"""
from shared.http_pool import close_client, get_client

__all__ = ["get_client", "close_client"]
