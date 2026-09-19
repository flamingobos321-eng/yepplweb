<?php
declare(strict_types=1);
require __DIR__ . '/enquiry-config.php';

function fail_request(string $message, int $status = 400): never {
    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!doctype html><html><head><meta charset="utf-8"><title>Enquiry error</title></head><body><h1>Unable to send enquiry</h1><p>'
        . htmlspecialchars($message, ENT_QUOTES, 'UTF-8')
        . '</p><p><a href="/contact">Return to contact page</a></p></body></html>';
    exit;
}
function clean_line(string $value, int $max): string {
    $value = trim(preg_replace('/[\r\n]+/', ' ', $value) ?? '');
    return mb_substr($value, 0, $max);
}
function clean_text(string $value, int $max): string {
    return mb_substr(trim($value), 0, $max);
}
function smtp_expect($socket, array $codes): string {
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    if (!in_array((int)substr($response, 0, 3), $codes, true)) {
        throw new RuntimeException('SMTP server rejected the message.');
    }
    return $response;
}
function smtp_command($socket, string $command, array $codes): void {
    fwrite($socket, $command . "\r\n");
    smtp_expect($socket, $codes);
}
function smtp_send(string $to, string $subject, string $body, string $replyTo): bool {
    $scheme = SMTP_SECURITY === 'ssl' ? 'ssl://' : '';
    $socket = stream_socket_client($scheme . SMTP_HOST . ':' . SMTP_PORT, $errno, $errstr, 20);
    if (!$socket) throw new RuntimeException('Unable to connect to SMTP.');
    stream_set_timeout($socket, 20);
    smtp_expect($socket, [220]);
    smtp_command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'yogelectroprocess.in'), [250]);
    if (SMTP_SECURITY === 'tls') {
        smtp_command($socket, 'STARTTLS', [220]);
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('Unable to enable SMTP encryption.');
        }
        smtp_command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'yogelectroprocess.in'), [250]);
    }
    smtp_command($socket, 'AUTH LOGIN', [334]);
    smtp_command($socket, base64_encode(SMTP_USERNAME), [334]);
    smtp_command($socket, base64_encode(SMTP_PASSWORD), [235]);
    smtp_command($socket, 'MAIL FROM:<' . ENQUIRY_FROM . '>', [250]);
    smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
    smtp_command($socket, 'DATA', [354]);
    $headers = [
        'From: Yog Electro Process Website <' . ENQUIRY_FROM . '>',
        'Reply-To: ' . $replyTo,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit'
    ];
    $message = 'Subject: ' . $subject . "\r\n" . implode("\r\n", $headers) . "\r\n\r\n" . $body;
    $message = preg_replace('/^\./m', '..', $message) ?? $message;
    fwrite($socket, $message . "\r\n.\r\n");
    smtp_expect($socket, [250]);
    smtp_command($socket, 'QUIT', [221]);
    fclose($socket);
    return true;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail_request('This endpoint accepts enquiry form submissions only.', 405);
if (!hash_equals(ENQUIRY_FORM_TOKEN, (string)($_POST['form_token'] ?? ''))) fail_request('Invalid form submission.');
if (trim((string)($_POST['website'] ?? '')) !== '') { header('Location: /contact?sent=1', true, 303); exit; }
$started = filter_var($_POST['form_started'] ?? null, FILTER_VALIDATE_INT);
if ($started && time() - $started < 3) fail_request('Please review the form and submit again.');

$name = clean_line((string)($_POST['name'] ?? ''), 100);
$company = clean_line((string)($_POST['company'] ?? ''), 150);
$email = filter_var(trim((string)($_POST['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$phone = clean_line((string)($_POST['phone'] ?? ''), 30);
$product = clean_line((string)($_POST['product'] ?? ''), 180);
$productUrl = clean_line((string)($_POST['product_url'] ?? ''), 500);
$quantity = clean_line((string)($_POST['quantity'] ?? ''), 60);
$message = clean_text((string)($_POST['message'] ?? ''), 5000);

if (mb_strlen($name) < 2 || mb_strlen($company) < 2 || !$email || mb_strlen($phone) < 7 || $product === '' || mb_strlen($message) < 10) {
    fail_request('Please complete all required fields with valid information.');
}
if ($productUrl !== '' && !filter_var($productUrl, FILTER_VALIDATE_URL)) fail_request('The product URL is invalid.');

$subject = 'Website enquiry: ' . $product;
$body = "New website enquiry\n\n"
    . "Name: {$name}\nCompany: {$company}\nEmail: {$email}\nPhone: {$phone}\n"
    . "Product: {$product}\nProduct URL: {$productUrl}\nQuantity: {$quantity}\n\n"
    . "Requirement:\n{$message}\n\n"
    . "Submitted: " . gmdate('c') . "\nIP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');

try {
    $sent = ENQUIRY_TRANSPORT === 'smtp'
        ? smtp_send(ENQUIRY_TO, $subject, $body, (string)$email)
        : mail(ENQUIRY_TO, $subject, $body, implode("\r\n", [
            'From: Yog Electro Process Website <' . ENQUIRY_FROM . '>',
            'Reply-To: ' . $email,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8'
        ]));
    if (!$sent) throw new RuntimeException('Mail transport returned an error.');
} catch (Throwable $error) {
    error_log('Enquiry delivery failed: ' . $error->getMessage());
    fail_request('Your enquiry could not be delivered. Please email info@yogelectroprocess.com directly.', 500);
}
header('Location: /contact?sent=1', true, 303);
exit;
