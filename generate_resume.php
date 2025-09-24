<?php

function get_post($key) {
    return htmlspecialchars($_POST[$key] ?? '');
}

// Get API key from environment variables (production) or .env file (development)
function get_api_key() {
    // First, try to get from environment variables (Fly.io secrets)
    $api_key = getenv('OPENAI_API_KEY');
    if ($api_key) {
        return $api_key;
    }
    
    // Fallback: try to read from .env file (local development)
    if (file_exists('.env')) {
        $env_data = parse_ini_file('.env');
        if (isset($env_data['OPENAI_API_KEY'])) {
            return $env_data['OPENAI_API_KEY'];
        }
    }
    
    // No API key found
    return null;
}

$api_key = get_api_key();

// Check if API key is available
if (!$api_key) {
    echo "<div style='color: red; padding: 20px; border: 1px solid red;'>";
    echo "<h3>Configuration Error</h3>";
    echo "<p>OpenAI API key not found. Please set the OPENAI_API_KEY environment variable or create a .env file.</p>";
    echo "</div>";
    exit;
}

$name = get_post('name');
$email = get_post('email');
$experience = get_post('experience');
$skills = get_post('skills');
$job = get_post('job');
$education = get_post('education') ?? 'Politehnica University of Bucharest';

$prompt = <<<EOD
Generate a professional resume that includes a Summary, Work Experience, Skills, and Education for the following person based on the target job description: $job

Name: $name
Email: $email

Work Experience:
$experience

Skills:
$skills

Education:
$education

Format it in clean HTML with clear sections and professional styling.
EOD;

$data = [
    "model" => "gpt-4o",
    // "model" => "gpt-3.5-turbo",
    "messages" => [
        ["role" => "system", "content" => "You are a professional resume writer. Create a well-formatted, professional resume based on the provided information. Use HTML formatting with proper structure and styling."],
        ["role" => "user", "content" => $prompt]
    ],
    "temperature" => 1,
    "max_tokens" => 1500
];

// Debug: Log what we're sending
error_log("Sending to API: " . json_encode($data, JSON_PRETTY_PRINT));

$curl = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "Authorization: Bearer " . $api_key
    ],
    CURLOPT_POSTFIELDS => json_encode($data)
]);

$response = curl_exec($curl);
$http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

// Debug: Log the raw response
error_log("HTTP Code: " . $http_code);
error_log("Raw API Response: " . $response);

$result = json_decode($response, true);

// Check for errors
if ($http_code !== 200) {
    echo "<div style='color: red; padding: 20px; border: 1px solid red;'>";
    echo "<h3>API Error (HTTP $http_code)</h3>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    echo "</div>";
    exit;
}

if (isset($result['error'])) {
    echo "<div style='color: red; padding: 20px; border: 1px solid red;'>";
    echo "<h3>OpenAI API Error</h3>";
    echo "<p><strong>Type:</strong> " . htmlspecialchars($result['error']['type']) . "</p>";
    echo "<p><strong>Message:</strong> " . htmlspecialchars($result['error']['message']) . "</p>";
    echo "</div>";
    exit;
}

if (!isset($result['choices'][0]['message']['content'])) {
    echo "<div style='color: red; padding: 20px; border: 1px solid red;'>";
    echo "<h3>Unexpected API Response</h3>";
    echo "<pre>" . htmlspecialchars(json_encode($result, JSON_PRETTY_PRINT)) . "</pre>";
    echo "</div>";
    exit;
}

// Get the content and clean up markdown code blocks
$content = $result['choices'][0]['message']['content'];

// Remove markdown code block markers
$content = preg_replace('/^```html\s*/i', '', $content);
$content = preg_replace('/^```\s*/i', '', $content); // Also handle plain ```
$content = preg_replace('/\s*```$/', '', $content);

// Remove common AI response endings/notes
$content = preg_replace('/\n\s*Note:.*$/is', '', $content);
$content = preg_replace('/\n\s*Please note:.*$/is', '', $content);
$content = preg_replace('/\n\s*\*\*Note:.*$/is', '', $content);
$content = preg_replace('/\n\s*---.*$/is', '', $content);
$content = preg_replace('/\n\s*This resume.*$/is', '', $content);
$content = preg_replace('/\n\s*Feel free.*$/is', '', $content);
$content = preg_replace('/\n\s*Let me know.*$/is', '', $content);
$content = preg_replace('/\n\s*This resume is structured/i', '', $content);


$content = trim($content);

// OPTION 1: Strip all HTML tags and return plain text
// $content = strip_tags($content);
// $content = html_entity_decode($content, ENT_QUOTES, 'UTF-8');

// OPTION 2: Convert to plain text with line breaks preserved
// $content = strip_tags($content);
// $content = preg_replace('/\n\s*\n/', "\n\n", $content); // Clean up multiple line breaks
// $content = nl2br(htmlspecialchars($content)); // Convert to HTML with <br> tags

// OPTION 3: Custom text processing with replacements
// $content = strip_tags($content);
// $content = str_replace(['•', '◦', '▪'], '-', $content); // Replace bullet points
// $content = preg_replace('/([A-Z][A-Z\s]+):/', '<strong>$1:</strong>', $content); // Bold section headers
// $content = preg_replace('/\n\s*-/', '<br>•', $content); // Convert dashes to bullet points
// $content = nl2br($content);

echo $content;


