"""
MyBoard backend proxy.

The actual MyBoard application is a Node.js Express server (vanilla JS frontend
served from /app/public, REST API under /app/server/index.js). The Emergent
platform wraps it with:
  - `yarn start` on port 3000  →  Express server (serves static frontend + API)
  - `uvicorn server:app` on port 8001  →  this FastAPI proxy

The Kubernetes ingress routes `/api/*` requests to port 8001, so this proxy
forwards them to the Express server on localhost:3000 where the real API
lives. Non-API requests are not expected here.
"""
import os
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response, JSONResponse

UPSTREAM = os.environ.get("MYBOARD_UPSTREAM", "http://localhost:3000")

app = FastAPI(title="MyBoard proxy")
client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0))


@app.on_event("shutdown")
async def _close():
    await client.aclose()


@app.get("/health")
async def health():
    return {"ok": True}


HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-encoding",
    "content-length", "host",
}


async def _proxy(request: Request, path: str) -> Response:
    target = f"{UPSTREAM}/{path}"
    body = await request.body()
    fwd_headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}
    try:
        upstream = await client.request(
            request.method,
            target,
            params=request.query_params,
            content=body,
            headers=fwd_headers,
        )
    except httpx.ConnectError:
        return JSONResponse({"error": "Upstream MyBoard server unavailable"}, status_code=503)
    out_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP}
    return Response(content=upstream.content, status_code=upstream.status_code, headers=out_headers)


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_api(request: Request, path: str):
    return await _proxy(request, f"api/{path}")
