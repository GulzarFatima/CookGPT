<?php
// ------------------------------------------------------------------
// 🔐 Load API Key securely from .env file
// ------------------------------------------------------------------
$env = parse_ini_file(__DIR__ . '/.env');
$apiKey = $env['OPENAI_API_KEY'] ?? null;


if (!$apiKey) {
  http_response_code(500);
  echo 'Missing API key';
  exit;
}

header('Content-Type: audio/mpeg');

// ------------------------------------------------------------------
// 📥 Read and validate JSON input
// ------------------------------------------------------------------
$input = json_decode(file_get_contents('php://input'), true);
$text = trim($input['text'] ?? '');
$voice = $input['voice'] ?? 'shimmer'; // shimmer, nova, onyx, etc.

if (!$text) {
  http_response_code(400);
  echo 'Missing text input';
  exit;
}

// ------------------------------------------------------------------
// 📤 Send POST request to OpenAI TTS API
// ------------------------------------------------------------------
$ch = curl_init('https://api.openai.com/v1/audio/speech');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'model' => 'tts-1',
    'input' => $text,
    'voice' => $voice,
    'response_format' => 'mp3'
  ])
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// ------------------------------------------------------------------
// 📦 Output audio or error message
// ------------------------------------------------------------------
if ($httpCode === 200 && $response) {
  echo $response;
} else {
  http_response_code(500);
  echo 'Failed to generate audio';
}
