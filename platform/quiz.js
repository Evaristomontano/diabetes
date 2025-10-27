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
    let keys = {};
    
    // --- Gamepad ---
    let isGamepadConnected = false;
    let gamePadIndex = null;
    let isXButtonDown = false;
    let isOButtonDown = false;
    const O_BUTTON_INDEX = 1;

    const groundHeight = ground.offsetHeight;
    let isMusicPlaying = false;

    // =========================================================
    //         2. FRAGEN (PREGUNTAS)
    // =========================================================
    const quizQuestions = [
        {
            question: "Was ist Diabetes mellitus Typ 1?",
            options: [
                "Eine Krankheit, bei der der Körper zu viel Insulin produziert.",
                "Eine Autoimmunerkrankung, bei der die Bauchspeicheldrüse kein Insulin produziert.",
                "Eine Erkrankung, die nur durch schlechte Ernährung verursacht wird."
            ],
            correctAnswer: "Eine Autoimmunerkrankung, bei der die Bauchspeicheldrüse kein Insulin produziert."
        },
        {
            question: "Welche Funktion hat Insulin im Körper?",
            options: [
                "Es baut Muskelmasse auf.",
                "Es hilft, Glukose aus dem Blut in die Zellen zu transportieren.",
                "Es reguliert den Blutdruck."
            ],
            correctAnswer: "Es hilft, Glukose aus dem Blut in die Zellen zu transportieren."
        },
        {
            question: "Was ist eine Hypoglykämie?",
            options: [
                "Ein extrem hoher Blutzuckerspiegel.",
                "Ein normaler Blutzuckerspiegel.",
                "Ein extrem niedriger Blutzuckerspiegel."
            ],
            correctAnswer: "Ein extrem niedriger Blutzuckerspiegel."
        },
    ];

    // =========================================================
    //         3. HILFSFUNKCIONEN
    // =========================================================

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function loadQuestion() {
        if (currentQuestionIndex >= shuffledQuestions.length) {
            handleCompletion();
            return;
        }

        const q = shuffledQuestions[currentQuestionIndex];
        questionText.textContent = q.question;
        const shuffledOptions = shuffleArray([...q.options]);

        responseBlocks.forEach((block, index) => {
            const optionText = shuffledOptions[index];
            const isCorrect = optionText === q.correctAnswer;
            
            block.querySelector('.response-text').textContent = optionText;
            block.setAttribute('data-answer', isCorrect ? 'correct' : 'incorrect');
            
            block.classList.remove('correct', 'incorrect'); 
            block.style.pointerEvents = 'auto';

            const brick = block.querySelector('.brick');
            const text = block.querySelector('.response-text');
            if (brick) brick.style.display = 'none';
            if (text) text.style.display = 'block'; 
        });

        questionAttempted = false; 
    }

    function playMusic() {
        if (!isMusicPlaying && quizMusic) {
            quizMusic.loop = true;
            quizMusic.volume = 0.5;
            quizMusic.play().then(() => {
                isMusicPlaying = true;
            }).catch(e => {
                console.log("Audio play prevented/failed:", e);
                isMusicPlaying = false;
            });
        }
    }

    // **FUNCIÓN: Resetear posición del personaje al suelo**
    function resetPlayerPosition() {
        playerY = 0;
        playerVelocityY = 0;
        isJumping = false;
        player.style.bottom = `${groundHeight}px`;
    }

    function checkCollision() {
        if (questionAttempted || isPopupOpen) return;

        const playerRect = player.getBoundingClientRect();

        responseBlocks.forEach(block => {
            const blockRect = block.getBoundingClientRect();
            
            if (
                playerRect.bottom >= blockRect.top &&
                playerRect.top <= blockRect.bottom &&
                playerRect.right >= blockRect.left &&
                playerRect.left <= blockRect.right
            ) {
                if (playerVelocityY < 0 && playerRect.bottom >= blockRect.top && playerRect.bottom < blockRect.bottom + 5) { 
                    checkAnswer(block);
                }
            }
        });
    }

    function checkAnswer(block) {
        if (questionAttempted) return; 
        
        questionAttempted = true; 

        // **CRÍTICO: Resetear la posición del personaje al suelo INMEDIATAMENTE**
        resetPlayerPosition();

        if (block.getAttribute('data-answer') === 'correct') {
            block.classList.add('correct');
            soundCorrect.play();
            setTimeout(() => {
                currentQuestionIndex++;
                loadQuestion();
            }, 1200); 
        } else {
            block.classList.add('incorrect');
            soundIncorrect.play();
            handleFailure();
        }
        
        playMusic();
    }
    
    function handleFailure() {
        isPopupOpen = true; 
        failureMessage.style.display = 'flex';
        if (isMusicPlaying && quizMusic) quizMusic.pause(); 
    }
    
    function handleCompletion() {
        quizMusic.pause();
        quizMusic.currentTime = 0;
        completionMessage.style.display = 'flex';
        soundSuccess.play();
        isPopupOpen = true;
    }
    
    function closeFailurePopup() {
        if (!isPopupOpen) return;
        
        failureMessage.style.display = 'none';
        isPopupOpen = false;
        
        // Remover la clase incorrecta de TODOS los bloques
        responseBlocks.forEach(block => {
            block.classList.remove('incorrect', 'correct');
        });
        
        questionAttempted = false;
        playMusic();
        
        // **Asegurar que el personaje esté en posición inicial**
        resetPlayerPosition();
    }
    
    // =========================================================
    //         EVENT LISTENERS MEJORADOS
    // =========================================================
    
    // Botón de cierre
    closeFailureButton.addEventListener('click', closeFailurePopup);
    
    // Cierre por teclado - CUALQUIER tecla
    document.addEventListener('keydown', (e) => {
        if (isPopupOpen && failureMessage.style.display === 'flex') {
            closeFailurePopup();
            return; // Prevenir que otras acciones se ejecuten
        }
        
        playMusic(); 
        keys[e.key.toLowerCase()] = true;
        
        // Salto
        const jumpKeys = ['w', 'arrowup', 'x'];
        if (jumpKeys.includes(e.key.toLowerCase()) && !isJumping && !isPopupOpen && !questionAttempted) {
            isJumping = true;
            playerVelocityY = jumpForce;
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // Cierre por click/touch en cualquier parte del popup
    failureMessage.addEventListener('click', (e) => {
        // Solo cerrar si se hace click en el overlay, no en los elementos internos
        if (e.target === failureMessage) {
            closeFailurePopup();
        }
    });

    // Cierre por touch para móviles
    failureMessage.addEventListener('touchend', (e) => {
        if (e.target === failureMessage) {
            closeFailurePopup();
        }
    });

    responseBlocks.forEach(block => {
        block.addEventListener('click', () => {
            if (!isPopupOpen && !questionAttempted) {
                checkAnswer(block);
            }
        });
    });


    // =========================================================
    //         4. LÓGICA DEL JUEGO (FÍSICA y GAMEPAD)
    // =========================================================

    // --- Gamepad Events ---
    window.addEventListener("gamepadconnected", (e) => {
        isGamepadConnected = true;
        gamePadIndex = e.gamepad.index;
        console.log("Gamepad connected:", e.gamepad.id);
    });

    window.addEventListener("gamepaddisconnected", () => {
        isGamepadConnected = false;
        gamePadIndex = null;
    });
    
    // --- Bucle Principal del Juego ---
    function gameLoop() {
        requestAnimationFrame(gameLoop);

        // --- Manejo del Gamepad para cerrar popup ---
        if (isPopupOpen && failureMessage.style.display === 'flex' && isGamepadConnected && gamePadIndex !== null) {
            const gamepad = navigator.getGamepads()[gamePadIndex];
            if (gamepad) {
                const circleButton = gamepad.buttons[O_BUTTON_INDEX];
                const anyButtonPressed = gamepad.buttons.some((button, index) => 
                    index !== O_BUTTON_INDEX && button.pressed
                );
                
                // Cerrar con botón O o cualquier otro botón
                if ((circleButton?.pressed && !isOButtonDown) || anyButtonPressed) {
                    closeFailurePopup();
                    isOButtonDown = true;
                } else if (!circleButton?.pressed) { 
                    isOButtonDown = false; 
                }
            }
        }

        // --- Movimiento y Física (Solo si el Popup está cerrado) ---
        if (!isPopupOpen) {
            
            // Aplicar gravedad
            playerVelocityY += gravity;
            playerY += playerVelocityY;

            // Colisión con el suelo
            if (playerY <= 0) {
                playerY = 0;
                playerVelocityY = 0;
                isJumping = false;
            }

            // --- Calcular Movimiento Horizontal ---
            let deltaX = 0;
            if (keys['a'] || keys['arrowleft']) {
                deltaX -= playerSpeed;
            }
            if (keys['d'] || keys['arrowright']) {
                deltaX += playerSpeed;
            }
            
            // --- Gamepad Input (Movimiento y Salto) ---
            if (isGamepadConnected && gamePadIndex !== null) {
                const gamepad = navigator.getGamepads()[gamePadIndex];
                if (gamepad) {
                    playMusic();
                    
                    // Sticks (Eje 0)
                    const xAxis = gamepad.axes[0]; 
                    if (Math.abs(xAxis) > 0.1) {
                        deltaX += xAxis * playerSpeed;
                    }
                    
                    // D-Pad
                    if (gamepad.buttons[14]?.pressed) { deltaX -= playerSpeed; }
                    if (gamepad.buttons[15]?.pressed) { deltaX += playerSpeed; }
                    
                    // Salto con X (0)
                    if (gamepad.buttons[0]?.pressed && !isXButtonDown && !isJumping && !questionAttempted) {
                        isJumping = true;
                        playerVelocityY = jumpForce;
                        isXButtonDown = true;
                    } else if (!gamepad.buttons[0]?.pressed) {
                        isXButtonDown = false;
                    }
                }
            }
            
            // Aplicar movimiento horizontal
            playerX += deltaX;

            // Limitar los bordes de la pantalla
            const playerWidth = player.offsetWidth;
            const gameWidth = quizGame.offsetWidth;
            playerX = Math.max(0, Math.min(playerX, gameWidth - playerWidth));

            // --- Actualizar Posición ---
            player.style.left = `${playerX}px`;
            player.style.bottom = `${playerY + groundHeight}px`;

            // --- Comprobar colisiones ---
            checkCollision();
        }
    }

    // =========================================================
    //         5. INICIALIZACIÓN
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
    
    // Iniciar el bucle de juego
    requestAnimationFrame(gameLoop); 
});