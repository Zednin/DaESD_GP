# Create your views here.

from rest_framework.decorators import api_view
from rest_framework.response import Response

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
