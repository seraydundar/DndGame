# dnd_project/asgi_cors.py
class SimpleCORSMiddleware:
    """
    Basit bir ASGI middleware, gelen HTTP isteklerine CORS header ekler.
    Production'da domain kısıtlaması ekleyebilirsiniz.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            async def send_wrapper(response):
                # Yalnızca 'http.response.start' tipinde header ekliyoruz
                if response["type"] == "http.response.start":
                    headers = dict(response.get("headers", []))
                    # Burada * diyerek her kaynaktan gelebilir diyorsunuz
                    # Production'da sabit domain yazabilirsiniz: b"http://localhost:3000"
                    headers[b"access-control-allow-origin"] = b"*"
                    headers[b"access-control-allow-credentials"] = b"true"
                    headers[b"access-control-allow-methods"] = b"GET,POST,OPTIONS,DELETE,PATCH"
                    headers[b"access-control-allow-headers"] = b"*"
                    # Headers'ı tekrar list haline dönüştür
                    response["headers"] = list(headers.items())
                await send(response)

            return await self.app(scope, receive, send_wrapper)
        else:
            return await self.app(scope, receive, send)
