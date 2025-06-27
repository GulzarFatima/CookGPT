<?php
require_once '../services/openai.php';

header('Content-Type: application/json');

// ------------------------------------------------------------------
// ✅ Load API key from environment
// ------------------------------------------------------------------
$apiKey = getenv('OPENAI_API_KEY');

if (!$apiKey) {
  http_response_code(500);
  echo json_encode(['error' => 'Missing OpenAI API key']);
  exit;
}

// ------------------------------------------------------------------
// 🔐 Decode and validate input
// ------------------------------------------------------------------
$input = json_decode(file_get_contents('php://input'), true);

$ingredients = isset($input['ingredients']) && is_array($input['ingredients']) ? $input['ingredients'] : [];
$prefs = isset($input['preferences']) && is_array($input['preferences']) ? $input['preferences'] : [];
$time = isset($input['time']) ? intval($input['time']) : 30;

// ------------------------------------------------------------------
// 📦 Construct GPT prompt
// ------------------------------------------------------------------
$ingredientList = implode(', ', $ingredients);
$preferenceList = implode(', ', $prefs);

$prompt = "I have the following ingredients: $ingredientList. " .
          "I want a recipe that takes under $time minutes. " .
          ($preferenceList ? "Preferences: $preferenceList. " : "") .
          "Please suggest a recipe with:\n" .
          "- a clearly labeled **Ingredients** section\n" .
          "- a **Steps** section using numbered steps (1. 2. 3...)\n" .
          "- and a **Serving** note at the end.";

// ------------------------------------------------------------------
// 🧠 Call OpenAI using the secured key
// ------------------------------------------------------------------
$response = callOpenAI($prompt, $apiKey);

if (!isset($response['choices'][0]['message']['content'])) {
  http_response_code(500);
  echo json_encode(['error' => 'OpenAI response incomplete']);
  exit;
}

echo json_encode([
  'recipe' => $response['choices'][0]['message']['content']
]);

