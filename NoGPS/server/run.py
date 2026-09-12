"""Serve HTTP and HTTPS from one process so phone + Mac share the same map."""

from __future__ import annotations

import asyncio
from pathlib import Path

import uvicorn

from app import app

ROOT = Path(__file__).resolve().parents[1]
CERT = ROOT / "certs" / "localhost.pem"
KEY = ROOT / "certs" / "localhost-key.pem"


async def main() -> None:
    http = uvicorn.Server(uvicorn.Config(app, host="0.0.0.0", port=8080, log_level="info"))
    https = uvicorn.Server(
        uvicorn.Config(
            app,
            host="0.0.0.0",
            port=8443,
            log_level="info",
            ssl_certfile=str(CERT),
            ssl_keyfile=str(KEY),
        )
    )
    https.install_signal_handlers = lambda: None  # type: ignore[method-assign]
    await asyncio.gather(http.serve(), https.serve())


if __name__ == "__main__":
    asyncio.run(main())
