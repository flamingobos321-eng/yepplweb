<?php
declare(strict_types=1);

// This is a form-format check. It is deliberately not a secret because every
// public form includes it. The honeypot and field validation provide spam
// protection without requiring a database or third-party service.
const ENQUIRY_FORM_TOKEN = 'YEP_PUBLIC_FORM';
const ENQUIRY_TO = 'info@yogelectroprocess.com';
const ENQUIRY_FROM = 'website@yogelectroprocess.com';

// Use 'mail' for Hostinger PHP mail. Use 'smtp' only after entering mailbox
// credentials below. Keep this file private; .htaccess denies web access.
const ENQUIRY_TRANSPORT = 'mail';
const SMTP_HOST = '';
const SMTP_PORT = 587;
const SMTP_SECURITY = 'tls'; // tls, ssl, or none
const SMTP_USERNAME = '';
const SMTP_PASSWORD = '';
