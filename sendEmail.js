// sendEmail.js
//
// Delivers the compiled digest via Resend. Swap this module out for
// SendGrid/SES/etc. if preferred -- only this file needs to change.

import * as config from './config.js';

export async function sendDigest(htmlBody, subject) {
  if (!config.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set -- cannot send email');
    return false;
  }
  if (!config.RECIPIENT_EMAIL) {
    console.error('RECIPIENT_EMAIL not set -- cannot send email');
    return false;
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.SENDER_EMAIL,
        to: [config.RECIPIENT_EMAIL],
        subject,
        html: htmlBody,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Failed to send digest email: HTTP ${resp.status} ${text}`);
      return false;
    }

    console.log(`Digest email sent successfully to ${config.RECIPIENT_EMAIL}`);
    return true;
  } catch (err) {
    console.error(`Failed to send digest email: ${err.message}`);
    return false;
  }
}
