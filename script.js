document.addEventListener('DOMContentLoaded', () => {
    // === DECLARACIÓN DE VARIABLES CRÍTICAS (ACCESIBLES GLOBALMENTE) ===
    const coche = document.getElementById('coche');
    const casitas = document.querySelectorAll('.casita');
    
    // VARIABLES DE AUDIO (DEBEN ESTAR DEFINIDAS AQUÍ)
    const soundStart = document.getElementById('sound-start');
    const soundCollision = document.getElementById('sound-collision');
    
    // CONTROL DE ESTADO DE JUEGO
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    let isColliding = {}; // Controla si ya ha habido colisión con una casita
    const scrollSpeed = 0.5;

    // --- FUNCIÓN UTILITARIA PARA OBTENER LA POSICIÓN DEL PUNTERO/DEDO ---
    function getEventPos(e) {
        // Devuelve la posición para ratón o para el primer dedo táctil
        return e.touches ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } : e;
    }

    // --- 1. FUNCIÓN DE INICIO DE ARRASTRE (mousedown / touchstart) ---
    function startDrag(e) {
        e.preventDefault(); // Evita el scroll/zoom del móvil
        const pos = getEventPos(e);

        isDragging = true;
        
        if (soundStart) {
            soundStart.currentTime = 0; 
            soundStart.play(); 
        }

        offset = {
            x: pos.clientX - coche.getBoundingClientRect().left,
            y: pos.clientY - coche.getBoundingClientRect().top
        };
        coche.style.cursor = 'grabbing';
    }

    // --- 2. FUNCIÓN DURANTE EL ARRASTRE (mousemove / touchmove) ---
    function doDrag(e) {
        if (!isDragging) return;

        const pos = getEventPos(e);
        const container = document.getElementById('game-container');
        const containerRect = container.getBoundingClientRect();
        const cocheRect = coche.getBoundingClientRect();
        
        // CORRECCIÓN CRÍTICA PARA MÓVIL: Sumamos el scroll horizontal (container.scrollLeft) 
        // para mantener el coche bajo el dedo/cursor mientras el contenedor se desplaza.
        let newX = pos.clientX - offset.x + container.scrollLeft; 
        let newY = pos.clientY - offset.y; 

        // Limitar el movimiento del coche dentro de los límites ABSOLUTOS (3500px)
        newX = Math.max(0, Math.min(newX, containerRect.width - cocheRect.width));
        newY = Math.max(0, Math.min(newY, containerRect.height - cocheRect.height));

        coche.style.left = `${newX}px`;
        coche.style.top = `${newY}px`;

        // ELIMINACIÓN DE LÓGICA DE SCROLL JS (el CSS/navegador lo hace ahora)
        // Eliminamos el código de scroll aquí, el navegador gestiona el scroll horizontal 
        // gracias a overflow-x: auto en el CSS.

        // Detección de colisión (la lógica es la misma)
        checkCollision(); 
    }

    // --- 3. FUNCIÓN DE FINAL DE ARRASTRE (mouseup / touchend) ---
    function endDrag() {
        isDragging = false;
        coche.style.cursor = 'grab';
    }

    // --- ASIGNACIÓN DE EVENTOS ---
    // Eventos de RATÓN
    coche.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);

    // Eventos TÁCTILES (CRUCIAL PARA MÓVIL)
    coche.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', doDrag);
    document.addEventListener('touchend', endDrag);


    // --- FUNCIÓN DE DETECCIÓN DE COLISIÓN Y MANEJO DE INFORMACIÓN Y SONIDO ---
    function checkCollision() {
        // Necesitamos reobtener la posición del coche dentro de la autopista
        const cocheRect = coche.getBoundingClientRect(); 

        casitas.forEach(casita => {
            const casitaRect = casita.getBoundingClientRect();
            const infoContent = casita.querySelector('.info-content');
            const infoIcon = casita.querySelector('.info-icon');
            const casitaId = casita.id; // Obtenemos el ID para la lógica de sonido

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
                    if (soundCollision) {
                        soundCollision.currentTime = 0;
                        soundCollision.play(); 
                    }
                    isColliding[casitaId] = true; // Marcamos que ya está colisionando
                }
                infoContent.style.display = 'block';
                infoIcon.style.display = 'block';
            } else {
                isColliding[casitaId] = false;
                infoContent.style.display = 'none'; 
                infoIcon.style.display = 'none'; 
            }
        });
    }
});