document.addEventListener('DOMContentLoaded', () => {

    // === 1. ELEMENTOS Y VARIABLES GLOBALES (HIGHWAY) ===
    const gameContainer = document.getElementById('game-container');
    const coche = document.getElementById('coche');
    const casitas = document.querySelectorAll('.casita');
    const infoPopup = document.getElementById('info-popup'); 
    const popupContentWrapper = document.getElementById('popup-content-wrapper');
    const closeInfoButton = document.getElementById('close-info-popup'); 
    
    // Controles móviles (solo para listeners de movimiento)
    const mobileControls = document.querySelectorAll('.control-button, .action-button'); 

    // Estado del juego
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    // activeCasita = null: Pop-up cerrado. activeCasita = ID: Pop-up abierto en esa casita.
    let activeCasita = null; 

    // --- Variables de Audio ---
    const soundStart = document.getElementById('sound-start'); // Loop del motor
    const soundCollision = document.getElementById('sound-collision');
    
    if (soundStart) {
        soundStart.loop = true; 
        soundStart.volume = 0.5;
    }
    
    // --- Variables de Gamepad / Teclado / Mobile ---
    let isGamepadConnected = false; 
    let gamePadIndex = null;
    const speedMultiplier = 5; 
    const scrollMultiplier = 8;
    // Teclado/Gamepad/Táctil
    let keys = {}; // Estado de las teclas presionadas
    const keyMap = {
        'w': { dx: 0, dy: -1 }, 'W': { dx: 0, dy: -1 }, 'ArrowUp': { dx: 0, dy: -1 },
        's': { dx: 0, dy: 1 }, 'S': { dx: 0, dy: 1 }, 'ArrowDown': { dx: 0, dy: 1 },
        'a': { dx: -1, dy: 0 }, 'A': { dx: -1, dy: 0 }, 'ArrowLeft': { dx: -1, dy: 0 },
        'd': { dx: 1, dy: 0 }, 'D': { dx: 1, dy: 0 }, 'ArrowRight': { dx: 1, dy: 0 }
    };
    let isOButtonDown = false; 
    let isR2Down = false;      


    // ---------------------------------------------------------
    //         AUDIO (Funciones Auxiliares)
    // ---------------------------------------------------------

    function pauseAllGameAudio() {
        if (soundStart && !soundStart.paused) soundStart.pause();
    }

    // ---------------------------------------------------------
    //         2. COLISIÓN E INTERACCIÓN
    // ---------------------------------------------------------

    function getNearestHouse() {
        // Obtenemos el rectángulo y las dimensiones del coche
        const carRect = coche.getBoundingClientRect();
        const carCenterX = carRect.left + carRect.width / 2;
        const carCenterY = carRect.top + carRect.height / 2;
        
        let nearestCasita = null;
        // 💡 CAMBIO CLAVE: Umbral de distancia reducido y ajustado
        let minDistance = 70; // Requiere estar mucho más cerca (ajustar este valor si es necesario)

        casitas.forEach(casita => {
            const casitaRect = casita.getBoundingClientRect();
            
            // Calculamos el centro de la casita
            const casitaCenterX = casitaRect.left + casitaRect.width / 2;
            const casitaCenterY = casitaRect.top + casitaRect.height / 2;
            
            // 💡 CAMBIO CLAVE: Cálculo de distancia basado en los centros (más preciso)
            const distance = Math.sqrt(
                Math.pow(carCenterX - casitaCenterX, 2) + 
                Math.pow(carCenterY - casitaCenterY, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestCasita = casita;
            }
        });
        
        return nearestCasita;
    }

    function interact(casita) {
        if (activeCasita === null) {
            pauseAllGameAudio();
            
            // 🛑 Mostrar el pop-up
            activeCasita = casita.id;

            const contentElement = casita.querySelector('.info-content');
            
            const videoUrl = contentElement.getAttribute('data-video-url');
            if (videoUrl) {
                // Generar el iframe de Vimeo
                popupContentWrapper.innerHTML = `
                    <iframe 
                        src="${videoUrl}" 
                        width="100%" 
                        height="100%" 
                        frameborder="0" 
                        allow="autoplay; fullscreen; picture-in-picture" 
                        allowfullscreen
                    ></iframe>
                `;
            } else {
                // Contenido normal (imágenes, texto)
                popupContentWrapper.innerHTML = contentElement.innerHTML;
            }
            
            infoPopup.style.display = 'flex';
            if(soundCollision) soundCollision.play().catch(e => console.error("Sound collision play blocked:", e));
        }
    }

    function checkCollision() {
        const nearestCasita = getNearestHouse();

        // Ocultar todos los iconos de interacción
        document.querySelectorAll('.info-icon').forEach(icon => icon.style.display = 'none');

        // 🛑 LÓGICA CLAVE (PC y Móvil): Interacción automática por proximidad
        if (nearestCasita) {
            // Mostrar el icono 'i' si estamos cerca
            const icon = nearestCasita.querySelector('.info-icon');
            if (icon) icon.style.display = 'flex';

            if (activeCasita === null) {
                // Si estamos cerca Y el popup NO está abierto, ¡lo abrimos!
                interact(nearestCasita);
            }
        }
    }
    
    function closePopup() {
        infoPopup.style.display = 'none';
        activeCasita = null;
        popupContentWrapper.innerHTML = ''; // Limpiar el contenido, deteniendo videos, etc.
    }

    // Botón de cerrar el pop-up
    closeInfoButton.addEventListener('click', closePopup);
    
    // ---------------------------------------------------------
    //         3. MANEJO DE TECLADO (PC)
    // ---------------------------------------------------------

    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        
        const key = e.key.toLowerCase();
        const map = keyMap[key];
        
        // Determinar si es una tecla de movimiento
        const isMovementKey = map && (map.dx !== 0 || map.dy !== 0);

        if (isMovementKey) {
            // 🛑 Cierra el popup al iniciar movimiento (PC)
            if (activeCasita !== null) {
                closePopup(); 
            }
            keys[key] = true;
            e.preventDefault();
        } 
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (keyMap[key]) {
            keys[key] = false;
            e.preventDefault();
        }
    });
    
    // ---------------------------------------------------------
    //         4. MANEJO TÁCTIL (MÓVIL) - D-PAD
    // ---------------------------------------------------------
    
    // Función para iniciar movimiento (touchstart / mousedown)
    function handleTouchStart(e) {
        const key = this.getAttribute('data-key');
        
        const map = keyMap[key];
        const isMovementKey = map && (map.dx !== 0 || map.dy !== 0);

        if (isMovementKey) {
            // 🛑 Cierra el popup al iniciar movimiento (D-pad)
            if (activeCasita !== null) {
                closePopup(); 
            }
            
            keys[key] = true;
            e.preventDefault(); // Impedir el scroll o arrastre al usar el D-Pad
        }
    }
    
    // Función para detener movimiento (touchend / mouseup / mouseleave)
    function handleTouchEnd(e) {
        e.preventDefault();
        const key = this.getAttribute('data-key');
        
        // Solo para teclas de movimiento (w, s, a, d)
        if (keyMap[key] && (keyMap[key].dx !== 0 || keyMap[key].dy !== 0)) {
            keys[key] = false;
        }
    }

    // Asignar listeners a todos los botones de movimiento
    mobileControls.forEach(button => {
        const key = button.getAttribute('data-key');
        // Solo añadir listeners a los botones de movimiento (w, s, a, d)
        if (keyMap[key] && (keyMap[key].dx !== 0 || keyMap[key].dy !== 0)) {
            
            button.addEventListener('touchstart', handleTouchStart, { passive: false });
            button.addEventListener('touchend', handleTouchEnd, { passive: false });
            button.addEventListener('touchcancel', handleTouchEnd, { passive: false });
            
            button.addEventListener('mousedown', handleTouchStart, { passive: false });
            button.addEventListener('mouseup', handleTouchEnd, { passive: false });
            button.addEventListener('mouseleave', handleTouchEnd, { passive: false });
        }
    });


    // ---------------------------------------------------------
    //         5. LÓGICA DE DRAG AND DROP (Ratón/Touch en coche)
    // ---------------------------------------------------------
    
    coche.addEventListener('mousedown', (e) => {
        // 🛑 Cierra el popup si se intenta arrastrar con él abierto
        if (activeCasita !== null) {
            closePopup(); 
        }
        isDragging = true;
        offset = {
            x: e.clientX - coche.offsetLeft,
            y: e.clientY - coche.offsetTop
        };
        coche.style.cursor = 'grabbing';
        
        // Reinicio de audio al empezar a arrastrar
        if (soundStart && soundStart.paused) {
             soundStart.currentTime = 0; 
             soundStart.play().catch(e => console.error("Sound start play blocked:", e));
        }
    });
    
    coche.addEventListener('touchstart', (e) => {
        // 🛑 Cierra el popup si se intenta arrastrar con él abierto
        if (activeCasita !== null) {
            closePopup(); 
        }
        const touch = e.touches[0];
        isDragging = true;
        offset = {
            x: touch.clientX - coche.offsetLeft,
            y: touch.clientY - coche.offsetTop
        };
        e.preventDefault(); 

        // Reinicio de audio al empezar a arrastrar
        if (soundStart && soundStart.paused) {
             soundStart.currentTime = 0; 
             soundStart.play().catch(e => console.error("Sound start play blocked:", e));
        }
    }, { passive: false });

    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || activeCasita !== null) return;
        e.preventDefault();

        let newLeft = e.clientX - offset.x;
        let newTop = e.clientY - offset.y;

        moveCarAndScroll(newLeft, newTop);
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging || activeCasita !== null) return;
        const touch = e.touches[0];
        e.preventDefault();
        
        let newLeft = touch.clientX - offset.x;
        let newTop = touch.clientY - offset.y;
        
        moveCarAndScroll(newLeft, newTop);
    }, { passive: false });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        coche.style.cursor = 'grab';
        if (soundStart && !soundStart.paused) pauseAllGameAudio();
    });

    document.addEventListener('touchend', () => {
        isDragging = false;
        if (soundStart && !soundStart.paused) pauseAllGameAudio();
    });
    
    document.addEventListener('touchcancel', () => {
        isDragging = false;
        if (soundStart && !soundStart.paused) pauseAllGameAudio();
    });

    function moveCarAndScroll(newLeft, newTop) {
        const minX = 0;
        const maxX = gameContainer.scrollWidth - coche.offsetWidth;
        const minY = gameContainer.offsetTop + 300; 
        const maxY = gameContainer.offsetTop + gameContainer.offsetHeight - 150; 
        
        newLeft = Math.max(minX, Math.min(newLeft, maxX));
        newTop = Math.max(minY, Math.min(newTop, maxY)); 
        
        coche.style.left = `${newLeft}px`;
        coche.style.top = `${newTop}px`;

        // SCROLL de la carretera
        gameContainer.scrollLeft = newLeft - (gameContainer.offsetWidth / 2);
        
        // ¡La colisión se chequea aquí en el Drag!
        checkCollision();
    }


    // ---------------------------------------------------------
    //         6. BUCLE PRINCIPAL DEL JUEGO (GameLoop)
    // ---------------------------------------------------------

    let lastTime = 0;
    const gameLoop = (timestamp) => {
        const deltaTime = (timestamp - lastTime) / 1000; 
        lastTime = timestamp;

        // 🛑 Si el popup está activo O estamos arrastrando, NO aplicar movimiento de teclado/gamepad.
        if (activeCasita === null && !isDragging) {

            // --- 6.1 MOVIMIENTO POR TECLADO/TÁCTIL ---
            let deltaX = 0;
            let deltaY = 0;
            let isAnyKeyMoving = false;
            
            // Recorre todas las teclas de movimiento activas
            for (const key in keys) {
                const map = keyMap[key];
                if (keys[key] && map && (map.dx !== 0 || map.dy !== 0)) {
                    deltaX += map.dx;
                    deltaY += map.dy;
                    isAnyKeyMoving = true;
                }
            }
            
            if (isAnyKeyMoving) {
                // Normalizar el movimiento (para diagonales)
                const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (magnitude > 1) {
                    deltaX /= magnitude;
                    deltaY /= magnitude;
                }

                // 🛑 Reinicio de audio al mover (Teclado/D-pad)
                if (soundStart && soundStart.paused) {
                    soundStart.currentTime = 0; 
                    soundStart.play().catch(e => console.error("Sound start play blocked:", e));
                }
                
                let currentLeft = coche.offsetLeft;
                let currentTop = coche.offsetTop;
                
                let newLeft = currentLeft + deltaX * speedMultiplier;
                let newTop = currentTop + deltaY * speedMultiplier;

                moveCarAndScroll(newLeft, newTop);

            } else {
                 // Pausar soundStart si NO hay movimiento y R2 está suelto
                 if (soundStart && !soundStart.paused && !isR2Down) { 
                      pauseAllGameAudio();
                 }
            }

            // --- 6.2 Lógica de Gamepad (Sin botón de acción) ---
            if (isGamepadConnected && !isAnyKeyMoving) {
                const gamepad = navigator.getGamepads()[gamePadIndex];
                if (gamepad) {
                    const xAxis = gamepad.axes[0]; 
                    const yAxis = gamepad.axes[1]; 
                    
                    const threshold = 0.2;

                    // Si hay movimiento en el stick
                    if (Math.abs(xAxis) > threshold || Math.abs(yAxis) > threshold) {
                        // 🛑 Cierra el popup al moverse con Gamepad
                        if (activeCasita !== null) {
                            closePopup(); 
                        }
                        
                         // Reinicio de audio al mover (Gamepad)
                        if (soundStart && soundStart.paused) {
                             soundStart.currentTime = 0; 
                             soundStart.play().catch(e => console.error("Sound start play blocked:", e));
                        }
                        
                        let currentLeft = coche.offsetLeft;
                        let currentTop = coche.offsetTop;

                        let newLeft = currentLeft + (xAxis * speedMultiplier);
                        let newTop = currentTop + (yAxis * speedMultiplier);
                        
                        moveCarAndScroll(newLeft, newTop);
                    } else {
                        // Pausar soundStart si el stick está en el centro
                         if (soundStart && !soundStart.paused && !isR2Down) {
                              pauseAllGameAudio();
                         }
                    }

                    // Botón de Cerrar (O o B)
                    if (gamepad.buttons[1]?.pressed && !isOButtonDown) {
                        isOButtonDown = true;
                        closePopup();
                    } else if (!gamepad.buttons[1]?.pressed) {
                        isOButtonDown = false;
                    }
                    
                    // Gatillo de sonido (R2)
                    isR2Down = gamepad.buttons[5]?.pressed || (gamepad.axes[5] && gamepad.axes[5] > 0.5);
                }
            } 
        } else if (activeCasita !== null) {
            // Si el pop-up está activo, asegurarse de que el motor esté parado
            pauseAllGameAudio();
            
            // Manejo de Cierre con Gamepad (O o B)
            if (isGamepadConnected) {
                const gamepad = navigator.getGamepads()[gamePadIndex];
                if (gamepad && gamepad.buttons[1]?.pressed && !isOButtonDown) {
                    isOButtonDown = true;
                    closePopup();
                } else if (gamepad && !gamepad.buttons[1]?.pressed) {
                    isOButtonDown = false;
                }
            }
        }
        
        // 5. DETECCIÓN DE COLISIÓN (Activará el popup automáticamente)
        checkCollision(); 

        requestAnimationFrame(gameLoop); 
    }
    
    // 6. Inicialización del bucle
    coche.style.left = `50px`; 
    coche.style.top = `400px`; 
    
    // Iniciar el bucle de juego
    requestAnimationFrame(gameLoop);
});