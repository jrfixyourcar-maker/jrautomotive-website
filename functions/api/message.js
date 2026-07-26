import { EmailMessage } from 'cloudflare:email';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

const ALLOWED_ENQUIRY_TYPES = new Set([
  'Service or maintenance',
  'Repair',
  'WOF',
  'Warning light or diagnostics',
  'Auto electrical',
  'Air conditioning',
  'Something else'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanLine(value, maxLength) {
  return clean(value, maxLength).replace(/[\u0000-\u001f\u007f]+/g, ' ');
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function onRequestGet({ env }) {
  const configuration = {
    turnstileSiteKey: Boolean(env.TURNSTILE_SITE_KEY),
    turnstileSecret: Boolean(env.TURNSTILE_SECRET_KEY),
    emailBinding: Boolean(env.EMAIL),
    fromEmail: Boolean(env.MESSAGE_FROM_EMAIL),
    toEmail: Boolean(env.MESSAGE_TO_EMAIL)
  };

  return json({
    enabled: Object.values(configuration).every(Boolean),
    siteKey: env.TURNSTILE_SITE_KEY || '',
    configuration
  });
}

export async function onRequestPost({ request, env }) {
  const requiredConfiguration = [
    'TURNSTILE_SECRET_KEY',
    'EMAIL',
    'MESSAGE_FROM_EMAIL',
    'MESSAGE_TO_EMAIL'
  ];

  if (requiredConfiguration.some(key => !env[key])) {
    console.error('Message form configuration is incomplete');
    return json({ ok: false, message: 'Online messaging is not available yet. Please phone or email us instead.' }, 503);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: 'The message could not be read. Please try again.' }, 400);
  }

  if (clean(form.get('company'), 100)) return json({ ok: true });

  const name = cleanLine(form.get('name'), 80);
  const phone = cleanLine(form.get('phone'), 30);
  const email = clean(form.get('email'), 120);
  const vehicle = cleanLine(form.get('vehicle'), 100);
  const message = clean(form.get('message'), 2000);
  const requestedType = cleanLine(form.get('enquiry_type'), 60);
  const enquiryType = ALLOWED_ENQUIRY_TYPES.has(requestedType) ? requestedType : 'Something else';
  const turnstileToken = clean(form.get('cf-turnstile-response'), 2048);

  if (!name || !message || (!phone && !email)) {
    return json({ ok: false, message: 'Please add your name, message, and either a phone number or email address.' }, 400);
  }
  if (email && !isEmail(email)) {
    return json({ ok: false, message: 'Please check the email address and try again.' }, 400);
  }
  if (!turnstileToken) {
    return json({ ok: false, message: 'Please complete the spam protection check.' }, 400);
  }

  const verification = new FormData();
  verification.append('secret', env.TURNSTILE_SECRET_KEY);
  verification.append('response', turnstileToken);
  verification.append('remoteip', request.headers.get('CF-Connecting-IP') || '');

  let turnstileResult;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: verification });
    turnstileResult = await response.json();
  } catch (error) {
    console.error('Turnstile request failed', error);
    return json({ ok: false, message: 'We could not verify the message. Please try again.' }, 502);
  }

  if (!turnstileResult.success) {
    console.warn('Turnstile rejected a message', turnstileResult['error-codes']);
    return json({ ok: false, message: 'The spam protection check expired or failed. Please try again.' }, 400);
  }

  const receivedAt = new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' });
  const text = [
    'New website enquiry',
    '',
    `Name: ${name}`,
    `Phone: ${phone || 'Not provided'}`,
    `Email: ${email || 'Not provided'}`,
    `Vehicle / registration: ${vehicle || 'Not provided'}`,
    `Enquiry type: ${enquiryType}`,
    `Received: ${receivedAt}`,
    '',
    'Message:',
    message
  ].join('\n');

  const headers = [
    `From: J.R Automotive website <${env.MESSAGE_FROM_EMAIL}>`,
    `To: ${env.MESSAGE_TO_EMAIL}`,
    `Subject: Website enquiry: ${enquiryType}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@jrautomotive.nz>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit'
  ];
  if (email) headers.push(`Reply-To: ${email}`);

  const emailMessage = new EmailMessage(
    env.MESSAGE_FROM_EMAIL,
    env.MESSAGE_TO_EMAIL,
    `${headers.join('\r\n')}\r\n\r\n${text}`
  );

  try {
    await env.EMAIL.send(emailMessage);
  } catch (error) {
    console.error('Cloudflare Email Service rejected a message', JSON.stringify({
      name: String(error?.name || ''),
      code: String(error?.code || ''),
      message: String(error?.message || ''),
      cause: String(error?.cause || '')
    }));
    return json({ ok: false, message: 'Your message could not be sent. Please phone or email us instead.' }, 502);
  }

  return json({ ok: true });
}
