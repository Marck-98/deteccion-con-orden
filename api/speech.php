<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'config.php';

// Archivo de log
$logFile = 'audio_log.txt';
file_put_contents($logFile, date('Y-m-d H:i:s') . " - Inicio de solicitud\n", FILE_APPEND);

$data = json_decode(file_get_contents('php://input'), true);
file_put_contents($logFile, "Datos recibidos: " . print_r($data, true) . "\n", FILE_APPEND);



$token = $data['token'];
file_put_contents($logFile, "Token a procesar: $token\n", FILE_APPEND);

// Mapeo de tokens a respuestas de voz
$responses = [
    'avanzar' => 'ADELANTE',
    'retroceder' => 'ATRAS',
    'detener' => 'DETENER',
    'vuelta derecha' => 'V_ADE_DER',
    'vuelta izquierda' => 'V_ADE_IZQ',
    '90° derecha' => 'G_90_DER',
    '90° izquierda' => 'G_90_IZQ',
    '360° derecha' => 'G_360_DER',
    '360° izquierda' => 'G_360_IZQ'
];

$text = $responses[$token] ?? 'Comando recibido';
file_put_contents($logFile, "Texto a convertir: $text\n", FILE_APPEND);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/audio/speech');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'tts-1',
    'input' => $text,
    'voice' => 'onyx'
]));

curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 segundos de timeout (ajústalo)
$response = curl_exec($ch);

$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . OPENAI_API_KEY
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

file_put_contents($logFile, "Enviando solicitud a OpenAI...\n", FILE_APPEND);
$response = curl_exec($ch);

if (curl_errno($ch)) {
    $error = curl_error($ch);
    file_put_contents($logFile, "Error en cURL: $error\n", FILE_APPEND);
    header('Content-Type: application/json');
    echo json_encode(['error' => $error]);
    exit;
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
file_put_contents($logFile, "Código HTTP de respuesta: $httpCode\n", FILE_APPEND);

if ($httpCode !== 200) {
    file_put_contents($logFile, "Respuesta no exitosa: $response\n", FILE_APPEND);
    header('Content-Type: application/json');
    echo json_encode(['error' => "HTTP $httpCode", 'response' => $response]);
    exit;
}

file_put_contents($logFile, "Respuesta de audio recibida, tamaño: " . strlen($response) . " bytes\n", FILE_APPEND);

// Guardar el audio para depuración
file_put_contents('debug_audio.mp3', $response);

header('Content-Type: audio/mpeg');
echo $response;

curl_close($ch);
