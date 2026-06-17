"""
send_email.py -- delivers the compiled digest via Resend.

Resend is used here because it has a simple REST API and a free tier
(100 emails/day, 3,000/month) that's more than enough for a daily
personal digest. Swap this module out for SendGrid/SES/etc. if preferred --
only this file needs to change.
"""

import logging

import requests

import config

logger = logging.getLogger("news_digest.send_email")


def send_digest(html_body: str, subject: str) -> bool:
    """Send the digest email. Returns True on success, False on failure."""
    if not config.RESEND_API_KEY:
        logger.error("RESEND_API_KEY not set -- cannot send email")
        return False
    if not config.RECIPIENT_EMAIL:
        logger.error("RECIPIENT_EMAIL not set -- cannot send email")
        return False

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {config.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": config.SENDER_EMAIL,
                "to": [config.RECIPIENT_EMAIL],
                "subject": subject,
                "html": html_body,
            },
            timeout=15,
        )
        resp.raise_for_status()
        logger.info("Digest email sent successfully to %s", config.RECIPIENT_EMAIL)
        return True

    except Exception as e:
        logger.error("Failed to send digest email: %s", e)
        return False
