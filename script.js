document.addEventListener('DOMContentLoaded', () => {
    // === DECLARACIÓN DE VARIABLES CRÍTICAS (ACCESIBLES GLOBALMENTE) ===
    const coche = document.getElementById('coche');
    const casitas = document.querySelectorAll('.casita');
    
    // 1. Obtención de Elementos de Audio: Deben estar aquí para ser accesibles.
    const soundStart = document.getElementById('sound-start');
    const soundCollision = document.getElementById('sound-collision'); // AÑADIDO!
    
    // 2. Control de Colisión: Debe estar aquí para mantener el estado entre ejecuciones.
    let isColliding = {}; // MOVIDO y definido aquí.
    
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    const scrollSpeed = 0.5;

    // --- Función para arrastrar el coche ---
    coche.addEventListener('mousedown', (e) => {
       isDragging = true;
       
       // El sonido de inicio SÍ funciona porque soundStart está definido arriba.
       soundStart.currentTime = 0; 
       soundStart.play(); 

       offset = {
            x: e.clientX - coche.getBoundingClientRect().left,
            y: e.clientY - coche.getBoundingClientRect().top
       };
       coche.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // ... (resto del código de movimiento y scroll - CORRETO) ...
        let newX = e.clientX - offset.x;
        let newY = e.clientY - offset.y;

        const container = document.getElementById('game-container');
        const containerRect = container.getBoundingClientRect();
        const cocheRect = coche.getBoundingClientRect();

        newX = Math.max(0, Math.min(newX, containerRect.width - cocheRect.width));
        newY = Math.max(0, Math.min(newY, containerRect.height - cocheRect.height));

        coche.style.left = `${newX}px`;
        coche.style.top = `${newY}px`;

        const screenWidth = window.innerWidth;
        const scrollThreshold = screenWidth * 0.3;

        if (e.clientX < scrollThreshold) { 
            container.scrollLeft -= scrollSpeed * (scrollThreshold - e.clientX);
        } else if (e.clientX > screenWidth - scrollThreshold) { 
            container.scrollLeft += scrollSpeed * (e.clientX - (screenWidth - scrollThreshold));
        }
        // --- Detección de colisión con casitas ---
        checkCollision();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        coche.style.cursor = 'grab';
    });

    // --- Función de detección de colisión y manejo de información ---
    function checkCollision() {
        // Necesitamos reobtener la posición del coche dentro de la autopista
        // (La posición se ajusta automáticamente por el scroll en getBoundingClientRect, pero es bueno ser explícito)
        const cocheRect = coche.getBoundingClientRect(); 

        casitas.forEach(casita => {
            const casitaRect = casita.getBoundingClientRect();
            const infoContent = casita.querySelector('.info-content');
            
            // 3. Obtención del ID de la Casita: NECESARIO para la lógica isColliding
            const casitaId = casita.id; // AÑADIDO!

            const padding = 30; // Píxeles de tolerancia

            const collision = !(
                cocheRect.right < casitaRect.left + padding ||
                cocheRect.left > casitaRect.right - padding ||
                cocheRect.bottom < casitaRect.top + padding ||
                cocheRect.top > casitaRect.bottom - padding
            );

            if (collision) {
                // Si está colisionando Y NO estaba colisionando antes (es la primera vez)
                if (!isColliding[casitaId]) { 
                    soundCollision.currentTime = 0; // Reiniciar por si acaso
                    soundCollision.play().catch(error => {
                        console.log("Error al reproducir el sonido (a menudo es por la política de navegadores que requiere interacción previa).", error);
                    }); 
                    isColliding[casitaId] = true; // Marcamos que ya está colisionando
                }
                infoContent.style.display = 'block';
            } else {
                isColliding[casitaId] = false;
                infoContent.style.display = 'none'; 
            }
        });
    }
});