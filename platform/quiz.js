document.addEventListener('DOMContentLoaded', () => {

    // === 1. ELEMENTOS Y VARIABLES GLOBALES ===
    const quizGame = document.getElementById('quiz-game');
    const player = document.getElementById('player');
    const ground = document.getElementById('ground');
    const questionText = document.getElementById('question-text');
    const responseBlocks = document.querySelectorAll('.response-block');
    const failureMessage = document.getElementById('failure-message');
    const completionMessage = document.getElementById('completion-message');
    const closeFailureButton = document.getElementById('close-failure-popup');

    // Audio
    const quizMusic = document.getElementById('quiz-music');
    const soundCorrect = document.getElementById('sound-correct');
    const soundIncorrect = document.getElementById('sound-incorrect');
    const soundSuccess = document.getElementById('sound-success');

    let currentQuestionIndex = 0;
    let shuffledQuestions = [];
    let isPopupOpen = false;
    let questionAttempted = false; 
    
    // === Variables de FISICA y Movimiento ===
    let playerX = 0;
    let playerY = 0;
    let playerVelocityY = 0;
    let isJumping = false;
    const gravity = -0.5;
    const jumpForce = 15;
    const playerSpeed = 5;
    let keys = {}; // Para teclado/mobile
    
    // --- Gamepad ---
    let isGamepadConnected = false;
    let gamePadIndex = null;
    let isXButtonDown = false; // Botón X (0) para saltar

    // Flag para la música
    let isMusicPlaying = false; 


    // === 2. DATOS DE PREGUNTAS ===
    const quizQuestions = [
        {
            question: "Welche Funktion hat Insulin im menschlichen Körper?",
            options: ["Es senkt den Blutzuckerspiegel.", "Es erhöht den Blutzuckerspiegel.", "Es steuert die Körpertemperatur."],
            correctAnswer: 0, 
            correctText: "Korrekt! Insulin hilft, den Zucker aus dem Blut in die Zellen zu bringen.",
            incorrectText: "Nicht ganz richtig. Insulin ist der Schlüssel, der Zucker in die Zellen lässt."
        },
        {
            question: "Was ist ein Symptom von hohem Blutzucker (Hyperglykämie)?",
            options: ["Starker Durst und häufiges Wasserlassen.", "Plötzliche Gewichtszunahme.", "Sehr niedrige Herzfrequenz."],
            correctAnswer: 0, 
            correctText: "Richtig! Der Körper versucht, den überschüssigen Zucker loszuwerden.",
            incorrectText: "Falsch. Hoher Blutzucker führt typischerweise zu starkem Durst und Müdigkeit."
        },
        {
            question: "Wie oft sollte der Blutzucker gemessen werden?",
            options: ["Einmal täglich ist genug.", "Nur nach dem Essen.", "Mehrmals täglich, je nach Behandlungsplan."],
            correctAnswer: 2, 
            correctText: "Genau! Eine regelmäßige Messung ist wichtig für die Kontrolle.",
            incorrectText: "Fast! Die Messfrequenz hängt vom individuellen Behandlungsplan ab, oft mehrmals täglich."
        },
        // Añade más preguntas aquí (máx. 3 bloques visibles)
        {
            question: "Was ist wichtig bei der Lagerung von Insulin?",
            options: ["Im Gefrierschrank aufbewahren.", "Vor direkter Sonneneinstrahlung schützen.", "Es kann bei Raumtemperatur gelagert werden."],
            correctAnswer: 1, 
            correctText: "Ausgezeichnet! Insulin ist hitze- und lichtempfindlich.",
            incorrectText: "Leider falsch. Insulin sollte kühl, aber nicht gefroren, und vor Licht geschützt gelagert werden."
        },
        {
            question: "Welche dieser Mahlzeiten lässt den Blutzucker am schnellsten ansteigen?",
            options: ["Ein großer Teller Gemüse.", "Ein Stück Brot mit Marmelade.", "Ein Steak ohne Beilagen."],
            correctAnswer: 1, 
            correctText: "Korrekt! Kohlenhdratoe, especialmente simple, lassen den Blutzucker schnell steigen.",
            incorrectText: "Falsch. Kohlenhydrate, wie Brot und Marmelade, wirken sich am schnellsten aus."
        }
    ];

    // === 3. HILFSFUNKCIONEN ===

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function playMusic() {
        if (!isMusicPlaying && quizMusic.paused) {
            quizMusic.play().catch(e => console.log("Music auto-play blocked:", e));
            isMusicPlaying = true;
            // Remover listeners después de la primera interacción
            document.body.removeEventListener('click', playMusic);
            document.body.removeEventListener('keydown', playMusic);
            window.removeEventListener("gamepadconnected", playMusic);
        }
    }

    function loadQuestion() {
        if (currentQuestionIndex >= shuffledQuestions.length) {
            handleCompletion();
            return;
        }
        
        const q = shuffledQuestions[currentQuestionIndex];
        questionText.textContent = q.question;
        
        // Asignar opciones a bloques
        const optionIndices = [0, 1, 2];
        const shuffledOptions = shuffleArray([...optionIndices]); // Mezcla los índices para no mostrar A, B, C siempre en el mismo orden

        responseBlocks.forEach((block, index) => {
            const originalIndex = shuffledOptions[index]; // Obtiene el índice original de la opción
            block.querySelector('.response-text').textContent = q.options[originalIndex];
            block.setAttribute('data-answer', originalIndex === q.correctAnswer ? 'correct' : 'incorrect');
            block.classList.remove('incorrect-block', 'correct-answer'); // Limpia la clase de acierto/fallo
            block.style.pointerEvents = 'auto'; 
            block.style.display = 'flex'; // Asegura que los bloques estén visibles
        });

        questionAttempted = false; // Reinicia el estado de intento
    }

    function checkAnswer(block) {
        if (questionAttempted) return;
        questionAttempted = true;
        
        responseBlocks.forEach(b => b.style.pointerEvents = 'none'); // Desactiva clics
        
        if (block.getAttribute('data-answer') === 'correct') {
            // Resaltar en verde el bloque correcto
            block.classList.add('correct-answer'); 
            
            if (soundCorrect) soundCorrect.play();
            
            // Esperar un momento antes de cargar la siguiente
            setTimeout(() => {
                // Limpiar la clase de acierto antes de cargar la siguiente
                block.classList.remove('correct-answer');
                currentQuestionIndex++;
                playerX = quizGame.offsetWidth * 0.05 - (player.offsetWidth / 2); // Reposiciona al jugador
                playerY = 0;
                player.style.left = `${playerX}px`;
                player.style.bottom = `${ground.offsetHeight}px`;
                loadQuestion();
            }, 800);

        } else {
            // Fallo: solo resaltamos el bloque golpeado como incorrecto y mostramos el pop-up
            block.classList.add('incorrect-block');
            if (soundIncorrect) soundIncorrect.play();
            // Esperar un momento para que se vea el rojo antes del pop-up
            setTimeout(() => {
                block.classList.remove('incorrect-block');
                handleFailure();
            }, 500);
        }
    }

    function checkCollision() {
        if (isPopupOpen) return;
        
        const playerRect = player.getBoundingClientRect();
        
        responseBlocks.forEach(block => {
            const blockRect = block.getBoundingClientRect();
            
            // Colisión
            const collision = (
                playerRect.right > blockRect.left &&
                playerRect.left < blockRect.right &&
                playerRect.bottom > blockRect.top &&
                playerRect.top < blockRect.bottom
            );

            if (collision) {
                // Si la colisión ocurre desde arriba (aterrizando sobre el bloque)
                // y el jugador se está moviendo hacia abajo (o está estático)
                const isFalling = playerVelocityY <= 0;
                const cameFromAbove = playerRect.bottom <= blockRect.top + 10; 

                if (cameFromAbove && isFalling) {
                    playerY = blockRect.height + 10; // Ajustar posición (altura del bloque + buffer)
                    playerVelocityY = 0;
                    isJumping = false;
                    // Responder la pregunta al colisionar
                    checkAnswer(block);
                }
            }
        });
    }

    function handleFailure() {
        isPopupOpen = true;
        failureMessage.style.display = 'flex';
        // Agregamos un listener para cerrar al hacer clic en cualquier parte del overlay
        failureMessage.addEventListener('click', closeFailurePopup, { once: true });
        if (quizMusic) {
            quizMusic.pause();
            isMusicPlaying = false; 
        }
    }

    function handleCompletion() {
        if (quizMusic) {
            quizMusic.pause();
            quizMusic.currentTime = 0;
            isMusicPlaying = false; 
        }
        completionMessage.style.display = 'flex';
        if (soundSuccess) soundSuccess.play();
        isPopupOpen = true;
    }

    function closeFailurePopup() {
        failureMessage.style.display = 'none';
        isPopupOpen = false;
        // La misma pregunta queda cargada para reintentar
        questionAttempted = false; 
        // Resetear posición del jugador
        playerX = quizGame.offsetWidth * 0.05 - (player.offsetWidth / 2);
        playerY = 0;
        playerVelocityY = 0;
        isJumping = false;
        player.style.left = `${playerX}px`;
        player.style.bottom = `${ground.offsetHeight}px`;
        playMusic(); 
    }
    
    // Evento para cerrar pop-up con botón
    if (closeFailureButton) {
        // Usamos el listener normal para el botón, ya que el 'click' en el overlay lo manejará
        closeFailureButton.addEventListener('click', closeFailurePopup);
    }
    
    // Función para cerrar el pop-up de fallo si se presiona una tecla o se detecta movimiento.
    function checkInputToClosePopup() {
        if (!isPopupOpen) return;

        let inputDetected = false;

        // 1. Teclado (WASD o Escape)
        if (keys['a'] || keys['d'] || keys['w'] || keys['s'] || keys['escape']) {
            inputDetected = true;
        }

        // 2. Gamepad
        let gamepad = null;
        if (isGamepadConnected && gamePadIndex !== null) {
            gamepad = navigator.getGamepads()[gamePadIndex];
        }

        if (gamepad) {
            const xAxis = gamepad.axes[0];
            const yAxis = gamepad.axes[1];

            // Detección de movimiento de sticks
            if (Math.abs(xAxis) > 0.1 || Math.abs(yAxis) > 0.1) {
                inputDetected = true;
            }

            // Detección de cualquier botón presionado
            for (let i = 0; i < gamepad.buttons.length; i++) {
                // El botón 1 (Círculo/B) está explícitamente mencionado en el HTML para cerrar, pero cualquier botón funciona ahora.
                if (gamepad.buttons[i]?.pressed) { 
                    inputDetected = true;
                    break;
                }
            }
        }
        
        // 3. Controles móviles (ya están en el array `keys`)

        if (inputDetected) {
            closeFailurePopup();
        }
    }


    // === 4. MANEJO DE EVENTOS (Gamepad, Teclado, Mobile) ===

    function setupMobileControls() {
        const controls = document.querySelectorAll('#mobile-controls .control-button');
        controls.forEach(button => {
            const key = button.getAttribute('data-key');
            if (key) {
                const handleStart = (e) => {
                    e.preventDefault(); 
                    // No es necesario verificar el pop-up aquí, el gameLoop lo manejará
                    keys[key] = true;
                    button.classList.add('active');
                };
                const handleEnd = () => {
                    keys[key] = false;
                    button.classList.remove('active');
                };

                button.addEventListener('touchstart', handleStart, { passive: false });
                button.addEventListener('touchend', handleEnd);
                button.addEventListener('mousedown', handleStart); // Para prueba en PC
                button.addEventListener('mouseup', handleEnd);
            }
        });
    }

    // Bloquear flechas de teclado, usar solo WASD
    function setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            
            // PREVENIR EL SCROLL DEL NAVEGADOR con las flechas
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                e.preventDefault(); 
            }
            
            // Solo registramos WASD y Espacio/Enter para el juego
            if (['w', 'a', 's', 'd', ' ', 'enter', 'escape'].includes(key)) {
                keys[key] = true;
            }
            playMusic();
        });

        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
    }

    window.addEventListener("gamepadconnected", (e) => {
        isGamepadConnected = true;
        gamePadIndex = e.gamepad.index;
        playMusic();
    });

    window.addEventListener("gamepaddisconnected", () => {
        isGamepadConnected = false;
        gamePadIndex = null;
    });

    // === 5. BUCLE DE JUEGO ===
    const groundHeight = ground.offsetHeight;
    
    function gameLoop() {
        
        // **CORRECCIÓN: Llamar a la función de cierre del pop-up al inicio del bucle**
        if (isPopupOpen) {
            checkInputToClosePopup();
        }
        
        if (!isPopupOpen) {
            // --- 1. Gravedad y Salto ---
            playerVelocityY += gravity;
            playerY += playerVelocityY;

            // Restricción del suelo
            if (playerY < 0) {
                playerY = 0;
                playerVelocityY = 0;
                isJumping = false;
            }

            // --- 2. Gamepad & Keyboard Input ---
            let deltaX = 0;
            let jump = false;

            let gamepad = null;
            if (isGamepadConnected && gamePadIndex !== null) {
                gamepad = navigator.getGamepads()[gamePadIndex];
            }
            
            // 2a. Gamepad Input
            if (gamepad) {
                const xAxis = gamepad.axes[0]; 
                deltaX += xAxis * playerSpeed;
                
                // Botón X (0) para saltar
                if (gamepad.buttons[0]?.pressed && !isXButtonDown) {
                    jump = true;
                    isXButtonDown = true;
                } else if (!gamepad.buttons[0]?.pressed) {
                    isXButtonDown = false;
                }
            }
            
            // 2b. Keyboard Input (Solo WASD)
            if (keys['a']) { deltaX -= playerSpeed; } // Solo 'a'
            if (keys['d']) { deltaX += playerSpeed; } // Solo 'd'
            // Teclas de salto: W o Espacio
            if ((keys['w'] || keys[' ']) && !isJumping) { 
                jump = true;
            }
            
            if (jump) {
                isJumping = true;
                playerVelocityY = jumpForce;
            }
            
            // --- 3. Aplicar movimiento horizontal ---
            playerX += deltaX;

            // Limitar los bordes de la pantalla
            const playerWidth = player.offsetWidth;
            const gameWidth = quizGame.offsetWidth;
            playerX = Math.max(0, Math.min(playerX, gameWidth - playerWidth));

            // --- 4. Actualizar Posición ---
            player.style.left = `${playerX}px`;
            player.style.bottom = `${playerY + groundHeight}px`;

            // --- 5. Comprobar colisiones ---
            checkCollision();
        }
        
        requestAnimationFrame(gameLoop);
    }

    // =========================================================
    //         6. INICIALIZACIÓN
    // =========================================================
    shuffledQuestions = shuffleArray([...quizQuestions]);
    loadQuestion();
    
    // Inicializar la posición del personaje
    playerX = quizGame.offsetWidth * 0.05 - (player.offsetWidth / 2);
    playerY = 0; 
    playerVelocityY = 0;
    
    // Aplicar estilos iniciales
    player.style.left = `${playerX}px`;
    player.style.bottom = `${groundHeight}px`;
    
    // Iniciar el bucle de juego y controles móviles
    setupKeyboardControls();
    setupMobileControls(); 
    requestAnimationFrame(gameLoop); 
    
    // Iniciar la música al primer evento de usuario
    document.body.addEventListener('click', playMusic, { once: true });
    document.body.addEventListener('keydown', playMusic, { once: true });
    window.addEventListener("gamepadconnected", playMusic, { once: true });
});