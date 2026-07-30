/* components/editor2d/editor2d.js — Модуль управления 2D-редактором помещений. Отвечает за измерительную сетку, режим Орто (Shift) и стрелочные строительные размеры стен с поворотом текста параллельно линиям. */

export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = null; // Точка старта текущей стены
    let mousePos = { x: 0, y: 0 }; // Позиция курсора
    let currentTool = 'wall'; // Активный инструмент ('wall' или 'select')
    let isShiftPressed = false; // Флаг зажатого Shift для режима Орто

    // МАСШТАБ: 1 пиксель холста = 10 реальных миллиметров помещения
    const SCALE = 10; 

    // СЛУШАТЕЛИ КЛАВИАТУРЫ ДЛЯ РЕЖИМА ОРТО (90 ГРАДУСОВ)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') { isShiftPressed = true; render(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') { isShiftPressed = false; render(); }
    });

    // Функция авто-подгонки холста под контейнер
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        render();
    }

    // РАСЧЕТ РЕЖИМА ОРТО (выравнивание по осям X или Y)
    function getOrthoCoordinates(start, current) {
        if (!isShiftPressed) return current;
        
        const dx = Math.abs(current.x - start.x);
        const dy = Math.abs(current.y - start.y);
        
        if (dx > dy) {
            return { x: current.x, y: start.y };
        } else {
            return { x: start.x, y: current.y };
        }
    }

    // ИНЖЕНЕРНАЯ РАЗМЕРНАЯ СЕТКА
    function drawGrid() {
        const step = 50; // 50px = 500мм
        ctx.lineWidth = 0.5;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#94a3b8';

        for (let x = 0; x < canvas.width; x += step) {
            ctx.strokeStyle = x % 100 === 0 ? '#cbd5e1' : '#f1f5f9';
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            if (x > 0 && x % 100 === 0) ctx.fillText(`${x * SCALE}мм`, x + 4, 12);
        }
        
        for (let y = 0; y < canvas.height; y += step) {
            ctx.strokeStyle = y % 100 === 0 ? '#cbd5e1' : '#f1f5f9';
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            if (y > 0 && y % 100 === 0) ctx.fillText(`${y * SCALE}мм`, 4, y - 4);
        }
    }

    // ФУНКЦИЯ ОТРИСОВКИ СТРЕЛОК РАЗМЕРОВ С ПАРАЛЛЕЛЬНЫМ ПОВОРОТОМ ЦИФР
    function drawDimensionLine(x1, y1, x2, y2, valueText) {
        const offset = 25; // Вынос размерной линии наружу от стены
        
        // Считаем угол наклона стены в радианах
        let angle = Math.atan2(y2 - y1, x2 - x1);
        
        // Считаем перпендикулярный вектор для выноса линии
        const pX = -Math.sin(angle) * offset;
        const pY = Math.cos(angle) * offset;

        // Координаты вынесенной линии размеров
        const rx1 = x1 + pX;
        const ry1 = y1 + pY;
        const rx2 = x2 + pX;
        const ry2 = y2 + pY;

        ctx.save();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;

        // 1. Тонкие выносные линии от стены к стрелке
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(rx1, ry1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(rx2, ry2); ctx.stroke();

        // 2. Главная линия размера
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();

        // 3. Строительные засечки (наклонные штрихи по краям) под 45 градусов
        const tickLen = 6;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(rx1 - Math.cos(angle + Math.PI/4) * tickLen, ry1 - Math.sin(angle + Math.PI/4) * tickLen);
        ctx.lineTo(rx1 + Math.cos(angle + Math.PI/4) * tickLen, ry1 + Math.sin(angle + Math.PI/4) * tickLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rx2 - Math.cos(angle + Math.PI/4) * tickLen, ry2 - Math.sin(angle + Math.PI/4) * tickLen);
        ctx.lineTo(rx2 + Math.cos(angle + Math.PI/4) * tickLen, ry2 + Math.sin(angle + Math.PI/4) * tickLen);
        ctx.stroke();

        // 4. ПОВОРОТ ТЕКСТА ПАРАЛЛЕЛЬНО ЛИНИИ
        const midX = (rx1 + rx2) / 2;
        const midY = (ry1 + ry2) / 2;

        ctx.translate(midX, midY); // Переносим центр координат в точку вывода текста
        
        // Корректируем угол, чтобы текст никогда не переворачивался "вверх ногами" (чертежный стандарт)
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
            angle -= Math.PI;
        }
        ctx.rotate(angle); // Поворачиваем холст на угол стены

        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom'; // Текст будет аккуратно лежать НАД линией

        // Считаем ширину текста для белой подложки
        const textWidth = ctx.measureText(valueText).width + 8;
        
        // Рисуем белую плашку, чтобы сетка не просвечивала сквозь цифры
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-textWidth / 2, -14, textWidth, 13);

        // Пишем сам текст (смещаем на 2 пикселя вверх, чтобы он не сливался с линией)
        ctx.fillStyle = '#0f172a';
        ctx.fillText(valueText, 0, -2);
        
        ctx.restore();
    }


    // РАСЧЕТ РАССТОЯНИЯ В МИЛЛИМЕТРАХ
    function getDistanceInMM(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy) * SCALE);
    }

    // ГЛАВНЫЙ РЕНДЕР ЭКРАНА ЧЕРТЕЖА
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        // Отрисовка готовых стен
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 12; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();

            const wallLength = getDistanceInMM({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2});
            drawDimensionLine(wall.x1, wall.y1, wall.x2, wall.y2, `${wallLength} мм`);
        });

        // Отрисовка активной линии черчения (в процессе)
        if (currentPoints && currentTool === 'wall') {
            const adjustedMouse = getOrthoCoordinates(currentPoints, mousePos);

            ctx.strokeStyle = '#0071e3';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(currentPoints.x, currentPoints.y);
            ctx.lineTo(adjustedMouse.x, adjustedMouse.y);
            ctx.stroke();

            const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
            const infoText = document.getElementById('wall-len-info');
            if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">${liveLen} мм</span>`;
        }
    }

    // СОБЫТИЯ МЫШИ
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        if (currentPoints) render();
    });

    canvas.addEventListener('mousedown', (e) => {
        if (currentTool !== 'wall') return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (!currentPoints) {
            currentPoints = { x, y };
        } else {
            const finalPoint = getOrthoCoordinates(currentPoints, { x, y });
            
            appState.walls.push({ 
                x1: currentPoints.x, 
                y1: currentPoints.y, 
                x2: finalPoint.x, 
                y2: finalPoint.y 
            });
            currentPoints = null;
            
            const infoText = document.getElementById('wall-len-info');
            if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">—</span>`;
        }
        render();
    });

    // Управление кнопками инструментов слева
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

    // Кнопка очистки
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
drawDimensionLine