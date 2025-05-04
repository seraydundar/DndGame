# settings.py

"""
Django settings for dnd_project project.
"""

from pathlib import Path
from datetime import timedelta

# 📌 Proje kök dizini
BASE_DIR = Path(__file__).resolve().parent.parent

# 📌 Güvenlik Ayarları
SECRET_KEY = 'django-insecure-cxzdzr-hi^d(im3ml&g47!xch=7!qqbi2m$mpt9cx^)i+zl&ic'
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]']

# 📌 Uygulamalar
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_filters',
    'corsheaders',  # ✅ CORS Middleware :contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1}
    'rest_framework',
    'channels',     # ✅ Django Channels (WebSocket Desteği)
    'accounts',
    'game',
    'lobbies',
    'items',
    'spells',
    'combat',       # ✅ Combat Uygulaması
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ROOT_URLCONF = 'dnd_project.urls'

# 📌 Middleware (CORS en üstte olmalı!)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# 📌 CORS Ayarları
CORS_ALLOW_ALL_ORIGINS = True  # Test için True, productionda False yap!
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = [
    'authorization',
    'content-type',
    'x-requested-with',
    'accept',
    'x-user-id',  # ← eklenen satır :contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}
]

# 📌 WebSocket (Channels) Yapılandırması
ASGI_APPLICATION = "dnd_project.asgi.application"
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("127.0.0.1", 6379)]},
    },
}

# 📌 Veritabanı Ayarları
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'dnd_game_db',
        'USER': 'postgres',
        'PASSWORD': '1963',
        'HOST': 'localhost',
        'PORT': '5433',
    }
}

# 📌 REST Framework Ayarları
REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    # Sadece SessionAuthentication kullanıyoruz.
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# Eğer JWT'yi başka endpoint'lerde kullanmak isterseniz SIMPLE_JWT ayarlarını da bırakabilirsiniz,
# ancak bu örnekte tüm endpointler session tabanlı doğrulama ile çalışacaktır.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=31),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

AUTH_USER_MODEL = 'accounts.CustomUser'

# 📌 Statik Dosyalar
STATIC_URL = '/static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 📌 Loglama
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
        'file': {'class': 'logging.FileHandler', 'filename': 'dnd_project.log'},
    },
    'loggers': {
        'django': {'handlers': ['console', 'file'], 'level': 'INFO'},
        'dnd_project': {'handlers': ['console', 'file'], 'level': 'DEBUG', 'propagate': True},
    },
}

# 📌 Cache (Redis)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
    }
}

# Ek olarak, session cookie ayarlarınızı da gözden geçirin:
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_SAMESITE = 'Lax'  # veya 'None' (HTTPS'de 'None' kullanılır)
SESSION_COOKIE_SECURE = False    # Geliştirme ortamında False, production'da True olmalı

# Media (dosya yükleme) ayarları
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
