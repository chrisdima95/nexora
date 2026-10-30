from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import MeView, OrderViewSet, ProductViewSet, RegisterView, ping

router = DefaultRouter()
router.register("products", ProductViewSet, basename="products")
router.register("orders", OrderViewSet, basename="orders")

urlpatterns = [
    path("ping/", ping),
    path("auth/login/", TokenObtainPairView.as_view(), name="jwt-login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="jwt-refresh"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
]

urlpatterns += router.urls
