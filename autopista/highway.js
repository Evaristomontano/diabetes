document.addEventListener('DOMContentLoaded', () => {

    // === 1. ELEMENTOS Y VARIABLES GLOBALES (HIGHWAY) ===
    const gameContainer = document.getElementById('game-container');
    const coche = document.getElementById('coche');
    const casitas = document.querySelectorAll('.casita');
    const infoPopup = document.getElementById('info-popup'); 
    const closeInfoButton = document.getElementById('close-info-popup');

    // Estado del juego
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    let activeCasita = null; 

    // --- Variables de Audio ---
    const soundStart = document.getElementById('sound-start');
    const soundCollision = document.getElementById('sound-collision');
    const soundRev = document.getElementById('sound-rev'); 
    let isMusicPlaying = false; 
    
    // **MODIFICACIÓN: Configuración de loop y volumen al inicio, garantizando el loop.**
    if (soundRev) {
        soundRev.loop = true; 
        soundRev.volume = 0.5;
    }
    
    // --- Variables de Gamepad / Teclado / Mobile ---
    let isGamepadConnected = false; 
    let gamePadIndex = null;
    const speedMultiplier = 5; 
    const scrollMultiplier = 8;
    let isR2Down = false;      
    let keys = {};             
    
    
    // =========================================================
    //         1.1. CONTROL DE AUDIO POR INTERACCIÓN
    // =========================================================

    function playAudioOnInteraction() {
        if (!isMusicPlaying) {
            // Reproducir sonido inicial (motor de inicio)
            if (soundStart) {
                soundStart.currentTime = 0; 
                soundStart.play().catch(e => console.error("Sound start autoplay blocked:", e));
            }
            // Ya no es necesario configurar loop y volumen aquí porque se hace al inicio del script.
            isMusicPlaying = true;
            // Remover listeners después de la primera interacción
            document.body.removeEventListener('click', playAudioOnInteraction);
            document.body.removeEventListener('keydown', playAudioOnInteraction);
            window.removeEventListener("gamepadconnected", playAudioOnInteraction);
        }
    }
    // Agregar listeners para la primera interacción
    document.body.addEventListener('click', playAudioOnInteraction, { once: true });
    document.body.addEventListener('keydown', playAudioOnInteraction, { once: true });
    window.addEventListener("gamepadconnected", playAudioOnInteraction, { once: true });

    // =========================================================
    //         1.2. LÍMITES DE LA CARRETERA
    // =========================================================
    
    function getRoadLimits() {
        // Los límites son empíricos basados en road1.png.
        const roadLimits = {
            minY: 340, 
            maxY: 550 
        };
        const cocheHeight = coche.offsetHeight;
        roadLimits.maxY = roadLimits.maxY - cocheHeight; 

        return roadLimits;
    }


    // =========================================================
    //         2. FUNCIONES DE POP-UP Y COLISIÓN
    // =========================================================

    function activateCollision(casita, casitaId) {
        if (activeCasita !== null) return; 

        activeCasita = casitaId; 
        
        const contentDiv = casita.querySelector('.info-content');
        const popupImage = document.getElementById('popup-image');
        const casitaImg = contentDiv.querySelector('img');

        if (casitaImg) {
            popupImage.src = casitaImg.src; 
        } else {
             popupImage.src = "";
        }
        
        infoPopup.style.display = 'flex'; 
        document.body.classList.add('overlay-active');
        
        if (soundCollision) {
            soundCollision.currentTime = 0;
            soundCollision.play();
        }
        
        // Pausar el sonido del motor si está activo (la colisión lo silencia)
        if (soundRev && !soundRev.paused) { 
             soundRev.pause();
        }
    }

    function deactivateCollision() {
        if (activeCasita === null) return;
        
        activeCasita = null;

        infoPopup.style.display = 'none';
        document.body.classList.remove('overlay-active');
        
        document.getElementById('popup-image').src = "";
    }

    if (closeInfoButton) {
        closeInfoButton.addEventListener('click', deactivateCollision);
    }
    
    infoPopup.addEventListener('click', (e) => {
        if (e.target.id === 'info-popup') { 
            deactivateCollision();
        }
    });


    /**
     * Verifica colisión.
     */
    function checkCollision() {
        const cocheRect = coche.getBoundingClientRect();
        const padding = 30; // Margen de colisión
        let isCollidingNow = false; 

        casitas.forEach(casita => {
            const casitaRect = casita.getBoundingClientRect();
            const infoIcon = casita.querySelector('.info-icon');
            const casitaId = casita.id;

            const collision = !(
                cocheRect.right < casitaRect.left + padding ||
                cocheRect.left > casitaRect.right - padding ||
                cocheRect.bottom < casitaRect.top + padding ||
                cocheRect.top > casitaRect.bottom - padding
            );

            if (collision) {
                isCollidingNow = true; 
                
                if (activeCasita === null) { 
                    activateCollision(casita, casitaId);
                    infoIcon.style.display = 'none';
                } else {
                    infoIcon.style.display = 'none';
                }
            } else {
                infoIcon.style.display = 'none';
            }
        });

        if (activeCasita !== null && !isCollidingNow) {
            deactivateCollision();
        }
    }


    // =========================================================
    //         3. LÓGICA DE DRAG (Ratón/Touch)
    // =========================================================

    function startDrag(e) {
        // Cierra el pop-up si intentas arrastrar
        if (activeCasita !== null) {
            deactivateCollision();
        }
        
        isDragging = true;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        // Inicia el sonido de revolución
        if (soundRev && soundRev.paused) {
             soundRev.play().catch(e => console.error("Rev sound play blocked:", e));
        }
        playAudioOnInteraction(); 

        const cocheRect = coche.getBoundingClientRect();
        offset = {
            x: clientX - cocheRect.left,
            y: clientY - cocheRect.top
        };
        coche.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return; 
        
        e.preventDefault(); 
        
        const { minY, maxY } = getRoadLimits(); 

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        let newLeft = clientX - offset.x - gameContainer.getBoundingClientRect().left + gameContainer.scrollLeft;
        let newTop = clientY - offset.y - gameContainer.getBoundingClientRect().top;
        
        const maxLeft = gameContainer.scrollWidth - coche.offsetWidth;

        // 1. Limitar Lados (Izquierda/Derecha)
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        
        // 2. Limitar Verticalmente (Arriba/Abajo) a la carretera
        newTop = Math.max(minY, Math.min(newTop, maxY));
        
        coche.style.left = `${newLeft}px`;
        coche.style.top = `${newTop}px`;
        
        const viewCenter = gameContainer.offsetWidth / 2;
        const carCenter = newLeft + coche.offsetWidth / 2;
        gameContainer.scrollLeft = carCenter - viewCenter;
        
        checkCollision(); 
    }

    function endDrag() {
        isDragging = false;
        coche.style.cursor = 'grab';
        
        // Pausa el motor al soltar el coche
        if (soundRev && !soundRev.paused) { 
             soundRev.pause();
        }
    }

    // Asignación de eventos de Ratón/Touch
    coche.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    coche.addEventListener('touchstart', (e) => startDrag(e.touches[0]), { passive: false });
    document.addEventListener('touchmove', (e) => drag(e.touches[0]), { passive: false });
    document.addEventListener('touchend', endDrag);


    // =========================================================
    //         4. LÓGICA DE TECLADO Y GAMEPAD
    // =========================================================
    
    function setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            
            // PREVENIR EL SCROLL DEL NAVEGADOR con las flechas
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                e.preventDefault(); 
            }
            
            keys[key] = true;
            playAudioOnInteraction(); 
        });

        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
    }

    window.addEventListener("gamepadconnected", (e) => {
        isGamepadConnected = true;
        gamePadIndex = e.gamepad.index;
        playAudioOnInteraction(); 
    });

    window.addEventListener("gamepaddisconnected", () => {
        isGamepadConnected = false;
        gamePadIndex = null;
    });
    
    // =========================================================
    //         5. BUCLE PRINCIPAL (GameLoop)
    // =========================================================

    function gameLoop() {
        let gamepad = null;
        if (isGamepadConnected && gamePadIndex !== null) {
            gamepad = navigator.getGamepads()[gamePadIndex];
        } 
        
        // --- 1. DETECCIÓN DE ENTRADA PARA CERRAR POP-UP ---
        if (activeCasita !== null) {
             let inputDetectedToClose = false;

             // 1a. Teclado (WASD/Flechas)
             // Solo verificamos WASD, ya que las flechas están bloqueadas para movimiento
             if (keys['a'] || keys['d'] || keys['w'] || keys['s']) {
                inputDetectedToClose = true;
            }
            
            // 1b. Gamepad Sticks/Buttons
            if (gamepad) {
                // Stick movement check
                const xAxis = gamepad.axes[0]; 
                const yAxis = gamepad.axes[1]; 
                if (Math.abs(xAxis) > 0.1 || Math.abs(yAxis) > 0.1) {
                    inputDetectedToClose = true;
                }
                
                // Any Button press check
                for (let i = 0; i < gamepad.buttons.length; i++) {
                    if (gamepad.buttons[i].pressed) {
                         inputDetectedToClose = true;
                         break;
                    }
                }
            }

            if (inputDetectedToClose) {
                deactivateCollision();
            }
        }
        
        
        // --- 2. GESTIÓN DE R2 / SONIDO ---
        if (gamepad) {
            const r2Axis = gamepad.axes[5]; 
            if (r2Axis > 0.5 && !isR2Down) {
                if (soundRev && soundRev.paused) { // Solo si está en pausa
                    soundRev.play().catch(e => console.error("Rev sound play blocked:", e));
                }
                isR2Down = true;
            } else if (r2Axis <= 0.5 && isR2Down) {
                isR2Down = false;
            }
        }


        // --- 3. MOVER COCHE (GamePad/Teclado) ---
        if (activeCasita === null && !isDragging) { 
            const currentLeft = parseFloat(coche.style.left) || 0;
            const currentTop = parseFloat(coche.style.top) || 0;
            const container = gameContainer;
            const { minY, maxY } = getRoadLimits(); 

            let deltaX = 0;
            let deltaY = 0;

            // 3a. Gamepad Input
            if (gamepad) {
                const xAxis = gamepad.axes[0]; 
                const yAxis = gamepad.axes[1]; 
                
                // Gamepad Sticks
                deltaX += xAxis * speedMultiplier;
                deltaY += yAxis * speedMultiplier;

                // D-Pad
                if (gamepad.buttons[14]?.pressed) { deltaX -= speedMultiplier; }
                if (gamepad.buttons[15]?.pressed) { deltaX += speedMultiplier; }
                if (gamepad.buttons[12]?.pressed) { deltaY -= speedMultiplier; }
                if (gamepad.buttons[13]?.pressed) { deltaY += speedMultiplier; }
            }
            
            // **MODIFICACIÓN: Teclado/Mobile D-Pad Input (SOLO WASD)**
            if (keys['a']) { deltaX -= speedMultiplier; } 
            if (keys['d']) { deltaX += speedMultiplier; }
            if (keys['w']) { deltaY -= speedMultiplier; }
            if (keys['s']) { deltaY += speedMultiplier; }
            
            // --- APLICAR MOVIMIENTO ---
            if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
                 // Inicia el sonido de Rev si se detecta movimiento por sticks/teclado y no está presionado R2.
                 if (soundRev && soundRev.paused && !isR2Down) {
                     soundRev.play().catch(e => console.error("Rev sound play blocked:", e));
                 }
                
                let newLeft = currentLeft + deltaX;
                let newTop = currentTop + deltaY;
                
                const maxLeft = container.scrollWidth - coche.offsetWidth;
                
                // 1. Limitar Lados (Izquierda/Derecha)
                newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                
                // 2. Limitar Verticalmente (Arriba/Abajo) a la carretera
                newTop = Math.max(minY, Math.min(newTop, maxY)); 
                
                coche.style.left = `${newLeft}px`;
                coche.style.top = `${newTop}px`;

                // SCROLL DE PANTALLA
                container.scrollLeft += deltaX * (scrollMultiplier / speedMultiplier); 
            } else {
                 // Pausar sonido de Rev si no hay movimiento y R2 no está presionado.
                 if (soundRev && !soundRev.paused && !isR2Down) { 
                      soundRev.pause();
                 }
            }
        } 
        
        // 4. DETECCIÓN DE COLISIÓN
        checkCollision(); 

        requestAnimationFrame(gameLoop); 
    }
    
    // 6. Inicialización del bucle
    coche.style.left = `50px`; 
    coche.style.top = `400px`; 
    setupKeyboardControls(); 
    requestAnimationFrame(gameLoop); 
    
});