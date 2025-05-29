// Prefijo que se usará como palabra clave para activar comandos 
const ordenPrefijo = "APOLO";

// Espera a que el contenido del DOM esté completamente cargado antes de ejecutar el script
document.addEventListener("DOMContentLoaded", () => {
    // Obtención de referencias a los elementos del DOM
    const startBtn = document.getElementById("startBtn");
    const outputText = document.getElementById("outputText");
    const msgText = document.getElementById("msgText");
    const audioPlayer = document.getElementById("audioPlayer");

    // Evento de clic para solicitar permisos de audio de forma anticipada
    startBtn.addEventListener("click", async () => {
        try {
            await audioPlayer.play();
            await audioPlayer.pause();
        } catch (e) {
            // Error de permisos silenciado
        }
    });

    // Mensaje inicial
    outputText.innerHTML = `Di ${ordenPrefijo} seguido de tu comando`;

    let recognition;
    let stoppedManually = false;

    // Verificar si el navegador soporta reconocimiento de voz
    if ("webkitSpeechRecognition" in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.lang = "es-ES";
    } else {
        alert("Tu navegador no soporta reconocimiento de voz.");
        return;
    }

    // Evento de clic en el botón para iniciar el reconocimiento de voz
    startBtn.addEventListener("click", () => {
        const msgText = document.getElementById("msgText");
        stoppedManually = false;
        recognition.start();
        startBtn.disabled = true;
        outputText.textContent = `Escuchando... Di ${ordenPrefijo} para interactuar.`;
        msgText.innerHTML = "";
    });

    // Evento que maneja los resultados del reconocimiento de voz
    recognition.onresult = async (event) => {
        let transcript = event.results[event.results.length - 1][0].transcript.trim().toUpperCase();

        // Si el usuario dice "APOLO DETENTE"
        if (transcript.includes(ordenPrefijo + " ADIOS")) {
            stoppedManually = true;
            recognition.stop();
            startBtn.disabled = false;
            outputText.textContent = "Detenido. Presiona el botón para comenzar nuevamente.";
            msgText.innerHTML = "";
            await processCommand("adios");
        } 
        // Si la frase contiene la palabra clave "APOLO"
        else if (transcript.includes(ordenPrefijo)) {
            outputText.innerHTML = `Comando detectado: "<strong><em>${transcript}</em></strong>"`;
            msgText.innerHTML = "";
            
            // Extraer el comando después del prefijo
            const command = transcript.replace(ordenPrefijo, "").trim();
            await processCommand(command);
        }
    };

    // Procesar el comando con OpenAI o comandos directos
    async function processCommand(command) {
        try {
            const directCommands = {
                "AVANZAR": "ADELANTE",
                "RETROCEDER": "retroceder",
                "DETENER": "detener",
                "VUELTA DERECHA": "vuelta derecha", 
                "VUELTA IZQUIERDA": "vuelta izquierda",
                "90° DERECHA": "90° derecha",
                "90° IZQUIERDA": "90° izquierda",
                "360° DERECHA": "360° derecha",
                "360° IZQUIERDA": "3G_360_IZQ"
            };

            let token = directCommands[command];
        
            if (!token) {
                const response = await fetch('http://44.204.125.124/deteccion-con-orden/api/interpret.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ command: command })
                });
                
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                
                //const data = await response.json();
                token = data.token;
            }

            if (token) {
                const audioResponse = await fetch('http://44.204.125.124/deteccion-con-orden/api/speech.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: token })
                });
                
                if (!audioResponse.ok) {
                    throw new Error(`Error HTTP: ${audioResponse.status}`);
                }

                const audioBlob = await audioResponse.blob();
                
                if (audioBlob.size === 0) {
                    throw new Error("El blob de audio está vacío");
                }
                
                const audioUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioUrl;

                audioPlayer.onerror = function(e) {
                    // Error al reproducir silenciado
                };

                audioPlayer.onplay = function() {
                    // Audio reproducido correctamente
                };

                audioPlayer.play().catch(e => {
                    // Error en reproducción silenciado
                });
            }
        } catch (error) {
            // Error general silenciado
        }
    }

    // Evento que maneja errores en el reconocimiento de voz
    recognition.onerror = (event) => {
        // Errores de reconocimiento silenciados
        recognition.stop();
        startBtn.disabled = false;
    };

    // Evento que se activa cuando el reconocimiento de voz finaliza
    recognition.onend = () => {
        if (!stoppedManually) {
            msgText.innerHTML = "El reconocimiento de voz se detuvo inesperadamente<br>Habla nuevamente para continuar...";
            recognition.start();
        }
    };
});
