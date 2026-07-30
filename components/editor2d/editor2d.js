export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = null; // временная точка начала черчения
    let mousePos = { x: 0, y: 0 };
    let currentTool = 'wall'; // текущий активный инструмент

    // ГЕНЕРАЦИЯ ГОТОВЫХ ШАБЛОНОВ СТЕН (если в базе еще пусто)
    if (appState.walls.length === 0) {
        // Зададим базовый масштаб: 1 пиксель = 10 миллиметров (шкаф 600мм = 60px)
        if (appState.template === 'rectangle') {
            appState.walls = [
                { x1: 150, y1: 100, x2: 550, y2: 100 }, // Верхняя (4000мм)
                { x1: 550, y1: 100, x2: 550, y2: 400 }, // Правая (3000мм)
                { x1: 550, y1: 400, x2: 150, y2: 400 }, // Нижняя
                { x1: 150, y1: 400, x2: 150, y2: 100 }  // Левая
            ];
        } else if (appState.template === 'l-shape') {
            appState.walls = [
                { x1: 150, y1: 100, x2: 550, y2: 100 },
                { x1: 550, y1: 100, x2: 550, y2: 400 },
                { x1: 550, y1: 400, x2: 350, y2: 400 },
                { x1: 350, y1: 400, x2: 350, y2: 250 },
                { x1: 350, y1: 250, x2: 150, y2: 250 },
                { x1: 150, y1: 250, x2: 150, y2: 100 }
            ];
        } else if (appState.template === 'polygon') {
            appState.walls = [
                { x1: 150, y1: 100, x2: 450, y2: 100 },
                { x1: 450, y1: 100, x2: 550, y2: 200 },
                { x1: 550, y1: 200, x2: 550, y2: 400 },
                { x1: 550, y1: 400, x2: 150, y2: 400 },
                { x1: 150, y1: 400, x2: 150, y2: 100 }
            ];
        }
    }

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        render();
    }

    // ИНЖЕНЕРНАЯ РАЗМЕРНАЯ СЕТКА С ЦИФРАМИ
    function drawGrid() {
        const step = 50; // 50px = 500мм в нашем масштабе
        ctx.lineWidth = 0.5;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#94a3b8';

        // Вертикальные линии и подписи шкалы X
        for (let x = 0; x < canvas.width; x += step) {
            ctx.strokeStyle = x % 100 === 0 ? '#cbd5e1' : '#f1f5f9'; // Каждые 100px линия чуть ярче (1 метр)
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            
            if (x > 0 && x % 100 === 0) {
                ctx.fillText(`${x * 10}мм`, x + 4, 12); // Выводим размер в мм вверху сетки
            }
        }
        
        // Горизонтальные линии и подписи шкалы Y
        for (let y = 0; y < canvas.height; y += step) {
            ctx.strokeStyle = y % 100 === 0 ? '#cbd5e1' : '#f1f5f9';
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            
            if (y > 0 && y % 100 === 0) {
                ctx.fillText(`${y * 10}мм`, 4, y - 4); // Выводим размер слева
            }
        }
    }

    // Функция расчета расстояния между точками (длина стены)
    function getDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy) * 10); // переводим масштаб в реальные мм
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        // Отрисовка готовых стен из базы данных
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 10; // Толщина стены
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();

            // Выводим размеры прямо над готовыми стенами
            const midX = (wall.x1 + wall.x2) / 2;
            const midY = (wall.y1 + wall.y2) / 2;
            const len = getDistance({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2});
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(`${len}`, midX, midY - 10);
        });

        // Отрисовка линии в процессе черчения
        if (currentPoints && currentTool === 'wall') {
            ctx.strokeStyle = '#0071e3';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(currentPoints.x, currentPoints.y);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.stroke();

            // Считаем текущую длину и выводим в левую панель
            const liveLen = getDistance(currentPoints, mousePos);
            const infoText = document.getElementById('wall-len-info');
            if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">${liveLen} мм</span>`;
        }
    }

    // Логика движения мыши
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        if (currentPoints) render();
    });

    // Логика кликов
    canvas.addEventListener('mousedown', (e) => {
        if (currentTool !== 'wall') return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (!currentPoints) {
            currentPoints = { x, y };
        } else {
            appState.walls.push({ x1: currentPoints.x, y1: currentPoints.y, x2: x, y2: y });
            currentPoints = null;
            const infoText = document.getElementById('wall-len-info');
            if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">—</span>`;
        }
        render();
    });

    // Логика меню слева: переключение кнопок Инструментов
    const toolWall = document.getElementById('tool-wall');
    const toolSelect = document.getElementById('tool-select');

    if (toolWall && toolSelect) {
        toolWall.addEventListener('click', () => {
            currentTool = 'wall';
            toolWall.classList.add('active');
            toolSelect.classList.remove('active');
            canvas.style.cursor = 'crosshair';
        });
        toolSelect.addEventListener('click', () => {
            currentTool = 'select';
            toolSelect.classList.add('active');
            toolWall.classList.remove('active');
            canvas.style.cursor = 'default';
            currentPoints = null;
            render();
        });
    }

    // Очистить холст
    const clearBtn = document.getElementById('btn-clear-canvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            appState.walls = [];
            currentPoints = null;
            render();
        });
    }

    window.addEventListener('resize', resize);
    resize();
}
