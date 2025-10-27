document.addEventListener('DOMContentLoaded', () => {

    // === 1. ELEMENTOS Y VARIABLES GLOBALES (HIGHWAY) ===
    const gameContainer = document.getElementById('game-container');
    const coche = document.getElementById('coche');
    const casitas = document.querySelectorAll('.casita');
    const infoPopup = document.getElementById('info-popup'); // El div del pop-up
    const closeInfoButton = document.getElementById('close-info-popup');

    // Estado del juego
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    // activeCasita = null: Pop-up cerrado. activeCasita = ID: Pop-up abierto en esa casita.
    let activeCasita = null; 

    // --- Variables de Audio ---
    const soundStart = document.getElementById('sound-start');
    const soundCollision = document.getElementById('sound-collision');
    const soundRev = document.getElementById('sound-rev'); 
    
    // --- Variables de Gamepad ---
    let isGamepadConnected = false; 
    let gamePadIndex = null;
    const speedMultiplier = 5; 
    const scrollMultiplier = 8;
    let isXButtonDown = false; // Botón X (0) - Usado para interacción
    let isOButtonDown = false; // Botón Círculo (1) - Usado para cerrar
    let isR2Down = false;      // Gatillo R2 (Eje 5) - Usado para sonido/motor
    
    // Reproducir sonido inicial (una vez)
   if (soundStart) {
            soundStart.currentTime = 0; 
            soundStart.play(); 
        }
    
    // =========================================================
    //         2. FUNCIONES DE POP-UP Y COLISIÓN
    // =========================================================

    function activateCollision(casita, casitaId) {
        // Evitar activar si ya está abierto (solo debería suceder si activeCasita es null)
        if (activeCasita !== null) return; 

        // 1. Marcar estado y evitar movimiento/otras colisiones
        activeCasita = casitaId; 
        
        // 2. Obtener y mostrar contenido
        const contentDiv = casita.querySelector('.info-content');
        const popupTitle = document.getElementById('popup-title');
        const popupText = document.getElementById('popup-text');
        const popupImage = document.getElementById('popup-image');
        
        // Asumiendo que obtienes el título, texto e imagen del info-content de la casita
        // NOTA: Si el info-content SOLO tiene una imagen, puedes simplificar la transferencia aquí.
        const casitaImg = contentDiv.querySelector('img');

         popupImage.src = casitaImg.src; 
        
        // Mostrar el pop-up
        infoPopup.style.display = 'block';
        document.body.classList.add('overlay-active');
        
        // 3. Sonido
        if (soundCollision) {
            soundCollision.currentTime = 0;
            soundCollision.play();
        }
    }

    function deactivateCollision() {
        if (activeCasita === null) return;
        
        // 1. Marcar estado (CERRAR)
        activeCasita = null;

        // 2. Ocultar pop-up y overlay
        infoPopup.style.display = 'none';
        document.body.classList.remove('overlay-active');
        
        // 3. Limpiar contenido (opcional)
        document.getElementById('popup-image').src = "";
    }

    // --- Evento para cerrar pop-up con botón ---
    if (closeInfoButton) {
        closeInfoButton.addEventListener('click', deactivateCollision);
    }

    /**
     * Verifica colisión.
     * @param {boolean} immediate - Si true (arrastre), activa el pop-up inmediatamente. 
     * Si false (gameLoop), solo muestra el icono 'X' o espera la pulsación.
     */
    function checkCollision(immediate = false) {
        // Si el pop-up está abierto y estamos en modo gamepad, no verificamos colisiones (activeCasita se usa para cerrar)
        // PERO: Si activeCasita está abierto y estamos en modo drag (immediate=true), el arrastre debe poder cerrarlo.
        // La condición de retorno anterior aquí solo evitaría que el gamepad re-detecte colisión.

        const cocheRect = coche.getBoundingClientRect();
        const padding = 30; // Margen de colisión
        let isCollidingNow = false; // Rastrea si colisionamos con CUALQUIER casita en este frame.

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
                isCollidingNow = true; // El coche está sobre algo.
                
                if (activeCasita === null) { 
                    // No hay pop-up abierto y colisionamos
                    if (immediate) {
                        // MODO RATÓN/TOUCH (Drag): Activación inmediata al colisionar
                        activateCollision(casita, casitaId);
                    } else {
                        // MODO GAMEPAD (gameLoop): Muestra el icono 'X' y espera la pulsación
                        infoIcon.textContent = 'X';
                        infoIcon.style.backgroundColor = '#007bff';
                        infoIcon.style.display = 'flex'; 
                        
                        if (isXButtonDown) {
                            activateCollision(casita, casitaId);
                        }
                    }
                }
            } else {
                // No hay colisión con ESTA casita
                infoIcon.style.display = 'none';
            }
        });

        // ********* LÓGICA CLAVE DE CIERRE POR MOVIMIENTO *********
        // Si el pop-up está abierto Y el coche no está colisionando con NINGUNA casita ahora, lo cerramos.
        if (activeCasita !== null && !isCollidingNow) {
            deactivateCollision();
        }
    }


    // =========================================================
    //         3. LÓGICA DE DRAG (Ratón/Touch)
    // =========================================================

    function startDrag(e) {
        if (activeCasita !== null) return; // No se puede arrastrar si el pop-up está abierto

        isDragging = true;
        // Permite arrastrar tanto con ratón como con touch
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        if (soundStart) {
            soundStart.currentTime = 0; 
            soundStart.play(); 
        }
        // Calcular offset para un arrastre suave
        const cocheRect = coche.getBoundingClientRect();
        offset = {
            x: clientX - cocheRect.left,
            y: clientY - cocheRect.top
        };
        coche.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return; 
        
        // Evitar el scroll de la página durante el arrastre
        e.preventDefault(); 
        
        // Permite arrastrar tanto con ratón como con touch
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        let newLeft = clientX - offset.x - gameContainer.getBoundingClientRect().left + gameContainer.scrollLeft;
        let newTop = clientY - offset.y - gameContainer.getBoundingClientRect().top;
        
        // Limitar movimiento dentro de los límites del gameContainer
        const maxLeft = gameContainer.scrollWidth - coche.offsetWidth;
        const maxTop = gameContainer.offsetHeight - coche.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        coche.style.left = `${newLeft}px`;
        coche.style.top = `${newTop}px`;
        
        // SCROLL DE PANTALLA (Asegura que el coche se mantenga en el centro de la vista)
        const viewCenter = gameContainer.offsetWidth / 2;
        const carCenter = newLeft + coche.offsetWidth / 2;
        gameContainer.scrollLeft = carCenter - viewCenter;
        
        // Detección de colisión en tiempo real (immediate = true)
        // Esto activará el pop-up si colisiona, O lo cerrará si se ha movido fuera.
        checkCollision(true); 
    }

    function endDrag() {
        isDragging = false;
        coche.style.cursor = 'grab';
        
        // Al soltar el coche, volvemos a verificar por si estaba justo en el límite
        // checkCollision(true); 
    }

    // Asignación de eventos de Ratón
    coche.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // Asignación de eventos de Touch
    coche.addEventListener('touchstart', (e) => startDrag(e.touches[0]), { passive: false });
    document.addEventListener('touchmove', (e) => drag(e.touches[0]), { passive: false });
    document.addEventListener('touchend', endDrag);


    // =========================================================
    //         4. LÓGICA DE GAMEPAD
    // =========================================================

    window.addEventListener("gamepadconnected", (e) => {
        isGamepadConnected = true;
        gamePadIndex = e.gamepad.index;
        console.log("Gamepad conectado en el índice %d: %s",
            e.gamepad.index, e.gamepad.id);
    });

    window.addEventListener("gamepaddisconnected", () => {
        isGamepadConnected = false;
        gamePadIndex = null;
        console.log("Gamepad desconectado.");
    });
    
    // =========================================================
    //         5. BUCLE PRINCIPAL (GameLoop)
    // =========================================================

    function gameLoop() {
        if (isGamepadConnected && gamePadIndex !== null) {
            const gamepad = navigator.getGamepads()[gamePadIndex];

            if (gamepad) {
                const currentLeft = parseFloat(coche.style.left) || 0;
                const currentTop = parseFloat(coche.style.top) || 0;
                const container = gameContainer;

                // --- 1. ESTADO DE BOTONES (Solo Botón X y Círculo para Interacción/Cierre) ---
                isXButtonDown = gamepad.buttons[0].pressed; // Botón X
                isOButtonDown = gamepad.buttons[1].pressed; // Botón Círculo

                // --- 2. GATILLO R2 (ACELERACIÓN/SONIDO) ---
                const r2Axis = gamepad.axes[5]; 
                if (r2Axis > 0.5 && !isR2Down) {
                    if (soundRev) {
                        soundRev.currentTime = 0;
                        soundRev.play();
                    }
                    isR2Down = true;
                } else if (r2Axis <= 0.5) {
                    isR2Down = false;
                }

                // --- 3. CERRAR POP-UP con botón O (Círculo) ---
                if (isOButtonDown && activeCasita !== null) { 
                    deactivateCollision();
                }

                // --- 4. MOVER COCHE (GamePad) ---
                if (activeCasita === null) { // Solo se puede mover si no hay un pop-up activo
                    const xAxis = gamepad.axes[0]; // Stick izquierdo Eje X
                    const yAxis = gamepad.axes[1]; // Stick izquierdo Eje Y
                    
                    if (Math.abs(xAxis) > 0.1 || Math.abs(yAxis) > 0.1) {
                        let newLeft = currentLeft + (xAxis * speedMultiplier);
                        let newTop = currentTop + (yAxis * speedMultiplier);
                        
                        const maxLeft = container.scrollWidth - coche.offsetWidth;
                        const maxTop = container.offsetHeight - coche.offsetHeight;

                        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                        newTop = Math.max(0, Math.min(newTop, maxTop));
                        
                        coche.style.left = `${newLeft}px`;
                        coche.style.top = `${newTop}px`;

                        // SCROLL DE PANTALLA
                        container.scrollLeft += xAxis * scrollMultiplier; 
                    }
                }
            }
        } 
        
        // 5. DETECCIÓN DE COLISIÓN (Se llama siempre, incluso en Gamepad)
        // Esto permite que:
        // A) En Gamepad: Muestre el icono 'X' o active el pop-up si se pulsa 'X'.
        // B) La lógica de cierre por movimiento funcione: si activeCasita != null y ¡ya no hay colisión!, se cierra.
        checkCollision(false); 

        requestAnimationFrame(gameLoop); 
    }
    
    // 6. Inicialización del bucle
    requestAnimationFrame(gameLoop); 
    
});