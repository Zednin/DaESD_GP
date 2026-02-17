import json
from pathlib import Path
from django import template
from django.conf import settings

register = template.Library()

@register.simple_tag
def vite_asset(entrypoint: str) -> str:
    """
    Returns the built asset path for an entrypoint from Vite manifest.json.
    Example: {% vite_asset 'src/main.jsx' %}
    """
    manifest_path = Path(settings.BASE_DIR) / "static" / "dist" / "manifest.json"
    if not manifest_path.exists():
        return ""
    manifest = json.loads(manifest_path.read_text())
    return "dist/" + manifest[entrypoint]["file"]

@register.simple_tag
def vite_css(entrypoint: str) -> list:
    """
    Returns list of css files for an entrypoint (if any).
    """
    manifest_path = Path(settings.BASE_DIR) / "static" / "dist" / "manifest.json"
    if not manifest_path.exists():
        return []
    manifest = json.loads(manifest_path.read_text())
    css_files = manifest.get(entrypoint, {}).get("css", [])
    return ["dist/" + f for f in css_files]