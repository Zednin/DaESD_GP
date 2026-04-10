import requests
from django.conf import settings
from django.template.loader import render_to_string

RESEND_URL = "https://api.resend.com/emails"


def send_email(to_email, subject, html, from_email=None):
    response = requests.post(
        RESEND_URL,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_email or settings.DEFAULT_FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html,
        },
        timeout=15,
    )

    if response.status_code >= 400:
        raise Exception(f"Email failed: {response.text}")

    return response.json()


def send_template_email(to_email, subject, template_name, context):
    html = render_to_string(template_name, context)
    return send_email(
        to_email=to_email,
        subject=subject,
        html=html,
    )


def send_customer_order_confirmation(order):
    return send_template_email(
        to_email=order.account.email,
        subject=f"BRFN order confirmation #{order.id}",
        template_name="emails/order_confirmation.html",
        context={
            "order": order,
            "frontend_url": settings.FRONTEND_URL,
        },
    )
    
def send_producer_new_order_notification(producer_order):
    return send_template_email(
        to_email=producer_order.producer.account.email,
        subject=f"New BRFN producer order #{producer_order.id}",
        template_name="emails/producer_notification.html",
        context={
            "producer_order": producer_order,
            "frontend_url": settings.FRONTEND_URL,
        },
    )


def send_announcement_to_producers(announcement):
    from apps.producers.models import Producer

    recipients = (
        Producer.objects
        .select_related("account")
        .filter(account__email__isnull=False)
        .exclude(account__email="")
    )

    results = []
    for producer in recipients:
        try:
            result = send_template_email(
                to_email=producer.account.email,
                subject=f"BRFN announcement: {announcement.title}",
                template_name="emails/announcement.html",
                context={
                    "announcement": announcement,
                    "recipient": producer.account,
                    "frontend_url": settings.FRONTEND_URL,
                },
            )
            results.append((producer.account.email, result))
        except Exception as exc:
            results.append((producer.account.email, {"error": str(exc)}))
    return results