export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Выводим параметры проекта в боковую панель
    document.getElementById('info-height').textContent = appState.roomHeight;
    document.getElementById('info-thickness').textContent = appState.wallThickness;

    let currentPoints = []; // временные точки черчения
    let mousePos = { x: 0, y: 0 }; // текущая позиция мыши

    // Подгоняем холст под размеры контейнера
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width - 30; // учитываем отступы padding
        canvas.height = rect.height - 30;
        render();
    }

    // Сетка (миллиметровка)
    function drawGrid() {
        const step = 40; // шаг сетки
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < canvas.width; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
    }

    // Отрисовка всех объектов
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        // Рисуем готовые стены из глобальной базы данных
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = appState.wallThickness / 20; // масштабируем толщину для визуализации
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();
        });

        // Динамический предпросмотр стены при движении мыши
        if (currentPoints.length === 1) {
            ctx.strokeStyle = '#0071e3';
            ctx.lineWidth = 4;
            ctx.setLineDash([6, 4]); // пунктирная линия
            ctx.beginPath();
            ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.stroke();
            ctx.setLineDash([]); // сбрасываем пунктир
        }
    }

    // Слушатели событий мыши
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        if (currentPoints.length === 1) render(); // перерисовываем только если тянем стену
    });

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentPoints.length === 0) {
            currentPoints.push({ x, y });
        } else {
            const start = currentPoints[0];
            // Сохраняем стену в ГЛОБАЛЬНОЕ состояние приложения
            appState.walls.push({ x1: start.x, y1: start.y, x2: x, y2: y });
            currentPoints = []; // сбрасываем для следующей стены
            
            // Как только нарисована хотя бы одна стена, открываем доступ к 3D вкладке!
            document.getElementById('tab-3d').removeAttribute('disabled');
        }
        render();
    });

    // Кнопка очистки холста
    document.getElementById('btn-clear-canvas').addEventListener('click', () => {
        appState.walls = [];
        currentPoints = [];
        render();
    });

    // Отслеживаем изменение размеров окна
    window.addEventListener('resize', resize);
    resize();
}

