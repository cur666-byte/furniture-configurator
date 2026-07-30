/* components/editor2d/navigation.js — Модуль навигации 2D-видового окна в стиле SketchUp. Управляет зумом сфокусированным на курсор, перемещением холста колесиком мыши и трансформацией координат. */

export function initNavigation(canvas, renderCallback) {
    // Настройки навигации, которые мы довели до ума
    const navState = {
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        isPanning: false,
        startPan: { x: 0, y: 0 },
        isFirstLoad: true
    };

    // Перевод координат из пикселей экрана в миллиметры чертежа
    function screenToWorld(screenX, screenY) {
        return {
            x: (screenX - navState.offsetX) / navState.zoom,
            y: (navState.offsetY - screenY) / navState.zoom
        };
    }

    // Перевод координат из мира на экран
    function worldToScreen(worldX, worldY) {
        return {
            x: worldX * navState.zoom + navState.offsetX,
            y: navState.offsetY - worldY * navState.zoom
        };
    }

    // Первая автоматическая центровка и зум под область 6 метров
    function handleFirstResize() {
        if (!navState.isFirstLoad) return;
        
        const targetWorldSize = 600; 
        navState.zoom = (canvas.width * 0.7) / targetWorldSize;

        navState.offsetX = 80;
        navState.offsetY = canvas.height - 80;
        
        navState.isFirstLoad = false;
    }

    // СЛУШАТЬ СКРОЛЛА (ТОЧНЫЙ ЗУМ НА КУРСОР)
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mX = e.clientX - rect.left;
        const mY = e.clientY - rect.top;

        const mouseWorldBefore = screenToWorld(mX, mY);

        const zoomFactor = 1.1;
        if (e.deltaY < 0) {
            navState.zoom = Math.min(navState.zoom * zoomFactor, 12.0);
        } else {
            navState.zoom = Math.max(navState.zoom / zoomFactor, 0.08);
        }

        navState.offsetX = mX - mouseWorldBefore.x * navState.zoom;
        navState.offsetY = mY + mouseWorldBefore.y * navState.zoom;

        renderCallback(); // Вызываем перерисовку холста
    }, { passive: false });

    // ЗАЖАТИЕ КОЛЕСИКА (ПЕРЕМЕЩЕНИЕ КАРТЫ)
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Клик колесиком
            e.preventDefault();
            navState.isPanning = true;
            canvas.style.cursor = 'grab';
            
            const rect = canvas.getBoundingClientRect();
            navState.startPan.x = e.clientX - rect.left - navState.offsetX;
            navState.startPan.y = e.clientY - rect.top - navState.offsetY;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!navState.isPanning) return;
        
        const rect = canvas.getBoundingClientRect();
        navState.offsetX = (e.clientX - rect.left) - navState.startPan.x;
        navState.offsetY = (e.clientY - rect.top) - navState.startPan.y;
        
        renderCallback();
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 1 && navState.isPanning) {
            navState.isPanning = false;
            // Возвращаем курсор обратно в зависимость от текущего инструмента
            const toolWall = document.getElementById('tool-wall');
            const isWallActive = toolWall && toolWall.classList.contains('active');
            canvas.style.cursor = isWallActive ? 'crosshair' : 'default';
        }
    });

    // Возвращаем функции наружу, чтобы их мог использовать основной файл черчения
    return {
        navState,
        screenToWorld,
        worldToScreen,
        handleFirstResize
    };
}
