export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = []; // временные точки черчения
    let mousePos = { x: 0, y: 0 }; // текущая позиция мыши

    // Автоматическая подгонка размера холста
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        render();
    }

    // Отрисовка координатной сетки (миллиметровки)
    function drawGrid() {
        const step = 40; // шаг сетки в пикселях
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < canvas.width; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
    }

    // Главная функция отрисовки сцены
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        // 1. Рисуем уже сохраненные готовые стены
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 8; // Толщина стены на чертеже
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();
        });

        // 2. Рисуем динамическую линию, которую пользователь тянет мышкой прямо сейчас
        if (currentPoints.length === 1) {
            ctx.strokeStyle = '#0071e3'; // Фирменный синий цвет
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.stroke();
        }
    }

    // Слежение за движением мыши
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        if (currentPoints.length === 1) render();
    });

    // Клик мышкой — ставим точку или строим стену
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentPoints.length === 0) {
            // Первый клик: начали стену
            currentPoints.push({ x, y });
        } else {
            // Второй клик: зафиксировали стену и сохранили в общую базу данных
            const start = currentPoints[0];
            appState.walls.push({ x1: start.x, y1: start.y, x2: x, y2: y });
            currentPoints = []; // сбрасываем для следующей стены
        }
        render();
    });

    // Кнопка «Очистить всё»
    const clearBtn = document.getElementById('btn-clear-canvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            appState.walls = [];
            currentPoints = [];
            render();
        });
    }

    // Кнопка перехода в 3D (пока просто выведем алерт)
    const to3dBtn = document.getElementById('btn-to-3d');
    if (to3dBtn) {
        to3dBtn.addEventListener('click', () => {
            alert('Стены готовы! На следующем этапе мы превратим этот чертеж в 3D комнату.');
        });
    }

    window.addEventListener('resize', resize);
    resize();
}
