<?php
require_once __DIR__ . '/../../config.php';

function callOpenAI($prompt, $apiKey) {
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POSTFIELDS => json_encode([
        "model" => "gpt-3.5-turbo",
        "messages" => [["role" => "user", "content" => $prompt]],
        "temperature" => 0.7
      ]),
      CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "Authorization: Bearer $apiKey"
      ]
    ]);
  
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
  }
  