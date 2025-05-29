<?php
// Mostrar errores en pantalla
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');
require_once 'config.php';

// Función para enviar el comando a la API
function enviarComandoAPI($status) {
    $payload = json_encode(["status" => $status]);

    $ch = curl_init("http://44.204.125.124/iot-api-php/controllers/AddCommandFromDetection.php");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    // Log para depuración
    file_put_contents("api_debug_log.txt", "Payload enviado: " . $payload . "\nRespuesta: " . $response . "\nError: " . $error . "\n", FILE_APPEND);

    echo json_encode([
        "token" => $status,
        "api_response" => $response,
        "curl_error" => $error
    ]);
    exit;
}

// Leer JSON de entrada
$data = json_decode(file_get_contents('php://input'), true);
file_put_contents("input_debug.json", json_encode($data));

if (!isset($data['command'])) {
    echo json_encode(["error" => "Falta el parámetro 'command'."]);
    exit;
}

$command = strtolower($data['command']);

// Mapeo de comandos a tokens
$commandMap = [
    'avanzar' => 'ADELANTE',
    'adelante' => 'ADELANTE',
    'avanza' => 'ADELANTE',
    'retroceder' => 'ATRAS',
    'atrás' => 'ATRAS',
    'retrocede' => 'ATRAS',
    'detener' => 'DETENER',
    'para' => 'DETENER',
    'alto' => 'DETENER',
    'vuelta derecha' => 'V_ADE_DER',
    'gira derecha' => 'V_ADE_DER',
    'vuelta a la derecha' => 'V_ADE_DER',
    'vuelta izquierda' => 'V_ADE_IZQ',
    'gira izquierda' => 'V_ADE_IZQ',
    'vuelta a la izquierda' => 'V_ADE_IZQ',
    '90 grados derecha' => 'G_90_DER',
    '90° derecha' => 'G_90_DER',
    '90 grados a la derecha' => 'G_90_DER',
    '90 grados izquierda' => 'G_90_IZQ',
    '90° izquierda' => 'G_90_IZQ',
    '90 grados a la izquierda' => 'G_90_IZQ',
    '360 grados derecha' => 'G_360_DER',
    '360° derecha' => 'G_360_DER',
    '360 grados a la derecha' => 'G_360_DER',
    '360 grados izquierda' => 'G_360_IZQ',
    '360° izquierda' => 'G_360_IZQ',
    '360 grados a la izquierda' => 'G_360_IZQ'
];

// Buscar coincidencia exacta
foreach ($commandMap as $key => $token) {
    if (strpos($command, $key) !== false) {
        enviarComandoAPI($token);
    }
}

// Si no hay coincidencia, usar OpenAI para interpretar
$prompt = "Identifica el token correspondiente para el comando de movimiento. Opciones: avanzar, retroceder, detener, vuelta derecha, vuelta izquierda, 90° derecha, 90° izquierda, 360° derecha, 360° izquierda. Comando: \"$command\". Responde solo con el token correspondiente.";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'gpt-3.5-turbo',
    'messages' => [['role' => 'user', 'content' => $prompt]],
    'temperature' => 0.3
]));

$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . OPENAI_API_KEY
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo json_encode(['error' => curl_error($ch)]);
    exit;
}
curl_close($ch);

$result = json_decode($response, true);
$token = trim(strtoupper($result['choices'][0]['message']['content']));
enviarComandoAPI($token);
?>
