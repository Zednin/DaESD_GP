# Create your views here.

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

@api_view(["GET"])
def api_home(request):
    return Response({
        "app": "RETS",
        "status": "ok",
        "endpoints": [
            {"name": "API Home", "path": "/api/"},
            # add more , listing authentication etc etc
        ],
    })
    
    
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"detail": "CSRF cookie set"})