// En el evento click del botón
startBtn.addEventListener("click", async () => {
    // Solicita permisos de audio primero
    try {
        // Intenta reproducir audio (para activar permisos)
        await audioPlayer.play();
        // Pausa inmediatamente el audio
        await audioPlayer.pause();
    } catch (e) {
        // Captura y muestra errores de permisos de audio
        console.log("Permisos de audio:", e);
    }
  });
  
  // Prefijo que se usará como palabra clave para activar comandos 
  const ordenPrefijo = "APOLO";
  
  // Espera a que el contenido del DOM esté completamente cargado
  document.addEventListener("DOMContentLoaded", () => {
      // Obtención de referencias a los elementos del DOM:
      // Botón de inicio
      const startBtn = document.getElementById("startBtn");
      // Elemento para mostrar el estado/output
      const outputText = document.getElementById("outputText");
      // Elemento para mensajes adicionales
      const msgText = document.getElementById("msgText");
      // Reproductor de audio
      const audioPlayer = document.getElementById("audioPlayer");
  
      // Mensaje inicial indicando cómo usar el sistema
      outputText.innerHTML = `Di ${ordenPrefijo} seguido de tu comando`;
  
      // Variables para controlar el reconocimiento:
      let recognition; // Instancia del reconocimiento de voz
      let stoppedManually = false; // Bandera para controlar si se detuvo manualmente
  
      // Verificar si el navegador soporta reconocimiento de voz
      if ("webkitSpeechRecognition" in window) {
          // Crear instancia del reconocimiento de voz
          recognition = new webkitSpeechRecognition();
          recognition.continuous = true; // Escucha continua
          recognition.lang = "es-ES"; // Idioma español
      } else {
          // Mostrar alerta si no hay soporte
          alert("Tu navegador no soporta reconocimiento de voz.");
          return; // Salir si no hay soporte
      }
  
      // Evento de clic en el botón para iniciar el reconocimiento
      startBtn.addEventListener("click", () => {
          stoppedManually = false; // Resetear bandera
          recognition.start(); // Iniciar reconocimiento
          startBtn.disabled = true; // Deshabilitar botón
          // Mostrar mensaje de escuchando
          outputText.textContent = `Escuchando... Di ${ordenPrefijo} para interactuar.`;
          msgText.innerHTML = ""; // Limpiar mensajes adicionales
      });
  
      // Evento que maneja los resultados del reconocimiento
      recognition.onresult = async (event) => {
          // Obtener el último texto reconocido, limpiarlo y ponerlo en mayúsculas
          let transcript = event.results[event.results.length - 1][0].transcript.trim().toUpperCase();
          console.log("Texto reconocido:", transcript);
  
          // Si el usuario dice "APOLO DETENTE"
          if (transcript.includes(ordenPrefijo + " DETENTE")) {
              stoppedManually = true; // Marcar como detenido manualmente
              recognition.stop(); // Detener reconocimiento
              startBtn.disabled = false; // Habilitar botón
              // Mostrar mensaje de detenido
              outputText.textContent = "Detenido. Presiona el botón para comenzar nuevamente.";
              msgText.innerHTML = ""; // Limpiar mensajes
              await processCommand("detener"); // Procesar comando de detener
          } 
          // Si la frase contiene la palabra clave "APOLO"
          else if (transcript.includes(ordenPrefijo)) {
              // Mostrar comando detectado con formato
              outputText.innerHTML = `Comando detectado: "<strong><em>${transcript}</em></strong>"`;
              msgText.innerHTML = ""; // Limpiar mensajes
              
              // Extraer el comando (eliminando el prefijo)
              const command = transcript.replace(ordenPrefijo, "").trim();
              await processCommand(command); // Procesar el comando
          }
      };
  
      // Función para procesar comandos con OpenAI
      async function processCommand(command) {
          try {
            console.log("Procesando comando:", command);
              // Lista de comandos directos conocidos y sus tokens
              const directCommands = {
                  "AVANZAR": "avanzar",
                  "RETROCEDER": "retroceder",
                  "DETENER": "detener",
                  "VUELTA DERECHA": "vuelta derecha",
                  "VUELTA IZQUIERDA": "vuelta izquierda",
                  "90° DERECHA": "90° derecha",
                  "90° IZQUIERDA": "90° izquierda",
                  "360° DERECHA": "360° derecha",
                  "360° IZQUIERDA": "360° izquierda"
              };
  
              // Buscar si el comando está en la lista directa
              let token = directCommands[command];
          
          // Si no es un comando directo conocido
          if (!token) {
              console.log("Usando OpenAI para interpretar comando...");
              // Enviar comando al backend para interpretación
              const response = await fetch('api/interpret.php', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ command: command })
              });
              
              // Verificar errores en la respuesta
              if (!response.ok) {
                  throw new Error(`Error HTTP: ${response.status}`);
              }
              
              // Obtener datos de la respuesta
              const data = await response.json();
              console.log("Respuesta de interpret.php:", data);
              token = data.token; // Obtener token de la respuesta
          }
  
          // Si se obtuvo un token válido
          if (token) {
              console.log("Token identificado:", token);
              
              // Solicitar audio correspondiente al token
              const audioResponse = await fetch('api/speech.php', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ token: token })
              });
              
              // Verificar errores en la respuesta de audio
              if (!audioResponse.ok) {
                  throw new Error(`Error HTTP: ${audioResponse.status}`);
              }
              
              // Mostrar tipo de contenido de la respuesta
              console.log("Respuesta de audio recibida, tipo:", audioResponse.headers.get('content-type'));
              
              // Convertir respuesta a blob de audio
              const audioBlob = await audioResponse.blob();
              console.log("Blob de audio creado, tamaño:", audioBlob.size);
              
              // Verificar si el blob está vacío
              if (audioBlob.size === 0) {
                  throw new Error("El blob de audio está vacío");
              }
              
              // Crear URL para el blob de audio
              const audioUrl = URL.createObjectURL(audioBlob);
              console.log("URL de audio creada:", audioUrl);
              
              // Configurar el reproductor de audio
              audioPlayer.src = audioUrl;
              // Manejar errores de reproducción
              audioPlayer.onerror = function(e) {
                  console.error("Error al reproducir audio:", e);
                  msgText.innerHTML = "Error al reproducir audio";
              };
              // Evento cuando comienza la reproducción
              audioPlayer.onplay = function() {
                  console.log("Audio comenzó a reproducirse");
              };
              
              // Intentar reproducir el audio
              audioPlayer.play().catch(e => {
                  console.error("Error al intentar reproducir:", e);
                  msgText.innerHTML = "Error al reproducir: " + e.message;
              });
          }
      } catch (error) {
          // Manejo de errores generales
          console.error("Error en processCommand:", error);
          msgText.innerHTML = "Error: " + error.message;
      }
  }
  
      // Evento para manejar errores del reconocimiento
      recognition.onerror = (event) => {
          console.error("Error en el reconocimiento:", event.error);
          
          // Mostrar alertas según el tipo de error
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
              alert("Error: El micrófono no tiene permisos o fue bloqueado.");
          } else if (event.error === "network") {
              alert("Error: Problema de conexión con el servicio de reconocimiento de voz.");
          }
          
          // Detener reconocimiento y habilitar botón
          recognition.stop();
          startBtn.disabled = false;
      };
  
      // Evento cuando el reconocimiento finaliza
      recognition.onend = () => {
          // Si no fue detenido manualmente
          if (!stoppedManually) {
              // Mostrar mensaje y reiniciar
              msgText.innerHTML = "El reconocimiento de voz se detuvo inesperadamente<br>Habla nuevamente para continuar...";
              recognition.start();
          }
      };
  });