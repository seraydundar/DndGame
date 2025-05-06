# projename/csrfcookie.py
from django.utils.deprecation import MiddlewareMixin

class CSRFCookieMiddleware(MiddlewareMixin):
    """
    Eğer gelen istekte X-CSRFToken header'ı yoksa,
    sırf cookie içindeki csrftoken'i buraya header olarak ekle.
    """
    def process_request(self, request):
        # Sadece etki alanı API istekleri için de uygulayabilirsin
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            header = 'HTTP_X_CSRFTOKEN'
            if header not in request.META:
                token = request.COOKIES.get('csrftoken')
                if token:
                    request.META[header] = token
