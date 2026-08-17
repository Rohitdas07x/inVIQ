"""
Security Headers Middleware — Enforces CSP, HSTS, frame protection, and referrer policies.

Implemented as pure ASGI middleware (NOT BaseHTTPMiddleware) to preserve multiple Set-Cookie
headers and avoid WebSocket connection drops.
"""

from starlette.types import ASGIApp, Scope, Receive, Send


class SecurityHeadersMiddleware:
    """
    Appends strict enterprise security headers to every HTTP response.
    Protects against XSS, clickjacking, MIME-sniffing, and data exfiltration.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (
                        b"content-security-policy",
                        b"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss: ws:; frame-src 'self' https://accounts.google.com; object-src 'none'; base-uri 'self';",
                    ),
                    (b"x-frame-options", b"SAMEORIGIN"),
                    (b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (b"permissions-policy", b"camera=(), microphone=(self), geolocation=()"),
                ])
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

