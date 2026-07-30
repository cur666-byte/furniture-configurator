/* components/editor2d/editor2d.js — Модуль управления 2D-редактором помещений. Отвечает за измерительную динамическую сетку, выделение нулевых осей, режим Орто (Shift), стрелочные размеры и навигацию по холсту. */

export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = null; // Точка старта текущей стены (в мировых координатах)
    let mousePos = { x: 0, y: 0 }; // Позиция курсора (в экранных пикселях)
    let currentTool = 'wall'; // Активный инструмент ('wall' или 'select')
    let isShiftPressed = false; // Флаг зажатого Shift для режима Орто

    // НАСТРОЙКИ НАВИГАЦИИ С ДЕФОЛТНЫМ МАСШТАБОМ НА 6 МЕТРОВ
    let zoom = 1.0;          // Будет рассчитан при resize для подгонки под 6 метров
    let offsetX = 0;        
    let offsetY = 0;        
    let isFirstLoad = true;  // Флаг для первой центровки экрана под 6 метров
    let isPanning = false;   
    let startPan = { x: 0, y: 0 }; 

    const SCALE = 10; // 1 пиксель чертежа = 10 реальных миллиметров

    // СЛУШАТЕЛИ КЛАВИАТУРЫ ДЛЯ РЕЖИМА ОРТО
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') { isShiftPressed = true; render(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') { isShiftPressed = false; render(); }
    });

    // ФУНКЦИИ ПЕРЕВОДА КООРДИНАТ
    function screenToWorld(screenX, screenY) {
        return {
            x: (screenX - offsetX) / zoom,
            y: (screenY - offsetY) / zoom
        };
    }

    function worldToScreen(worldX, worldY) {
        return {
            x: worldX * zoom + offsetX,
            y: worldY * zoom + offsetY
        };
    }

    // Автоматическая подгонка холста и центровка на 6 метров при первом запуске
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        if (isFirstLoad) {
            // Задача: показать область в 6000 мм (600px в мировых координатах)
            // Вычисляем зум так, чтобы 600px занимали примерно 80% от меньшей стороны холста
            const targetWorldSize = 600; 
            const minCanvasSide = Math.min(canvas.width, canvas.height);
            zoom = (minCanvasSide * 0.8) / targetWorldSize;

            // Смещаем начало координат (0,0) так, чтобы оно встало по центру экрана
            offsetX = canvas.width / 2;
            offsetY = canvas.height / 2;
            
            isFirstLoad = false;
        }

        render();
    }

    function getOrthoCoordinates(start, current) {
        if (!isShiftPressed) return current;
        const dx = Math.abs(current.x - start.x);
        const dy = Math.abs(current.y - start.y);
        return dx > dy ? { x: current.x, y: start.y } : { x: start.x, y: current.y };
    }

    // УМНАЯ ДИНАМИЧЕСКАЯ СЕТКА С ВЫДЕЛЕНИЕМ НУЛЕВЫХ ОСЕЙ
    function drawGrid() {
        // 1. Вычисляем динамический шаг сетки в зависимости от приближения (zoom)
        // В мировых координатах (в пикселях, где 1px = 10мм)
        let worldStep = 100; // По дефолту шаг 1 метр (100px)

        if (zoom > 2.5) {
            worldStep = 10;  // Сильное приближение: шаг 100 мм (10px)
        } else if (zoom > 1.2) {
            worldStep = 20;  // Среднее приближение: шаг 200 мм (20px)
        } else if (zoom > 0.6) {
            worldStep = 50;  // Обычный масштаб: шаг 500 мм (50px)
        } else if (zoom < 0.25) {
            worldStep = 200; // Сильное отдаление: шаг 2 метра (200px)
        }

        const step = worldStep * zoom; // Экранный шаг сетки в пикселях

        ctx.lineWidth = 0.5;
        ctx.font = '10px monospace';
        
        // Находим крайние видимые мировые координаты на экране, чтобы рисовать сетку только в области видимости
        const topLeftWorld = screenToWorld(0, 0);
        const bottomRightWorld = screenToWorld(canvas.width, canvas.height);

        // Округляем стартовые точки до шага сетки
        const startX = Math.floor(topLeftWorld.x / worldStep) * worldStep;
        const endX = Math.ceil(bottomRightWorld.x / worldStep) * worldStep;
        const startY = Math.floor(topLeftWorld.y / worldStep) * worldStep;
        const endY = Math.ceil(bottomRightWorld.y / worldStep) * worldStep;

        // РИСУЕМ ВЕРТИКАЛЬНЫЕ ЛИНИИ (ОСЬ X)
        for (let wx = startX; wx <= endX; wx += worldStep) {
            const screenCoord = worldToScreen(wx, 0);
            
            // Проверяем, не является ли линия нулевой осью
            if (Math.round(wx) === 0) {
                ctx.strokeStyle = '#334155'; // Жирная темная нулевая ось Y
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = '#f1f5f9';
                ctx.lineWidth = 0.5;
            }

            ctx.beginPath();
            ctx.moveTo(screenCoord.x, 0);
            ctx.lineTo(screenCoord.x, canvas.height);
            ctx.stroke();

            // Подписи координат в мм над основными линиями
            if (Math.round(wx) !== 0) {
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`${wx * SCALE}мм`, screenCoord.x + 4, 12);
            }
        }

        // РИСУЕМ ГОРИЗОНТАЛЬНЫЕ ЛИНИИ (ОСЬ Y)
        for (let wy = startY; wy <= endY; wy += worldStep) {
            const screenCoord = worldToScreen(0, wy);
            
            if (Math.round(wy) === 0) {
                ctx.strokeStyle = '#334155'; // Жирная темная нулевая ось X
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = '#f1f5f9';
                ctx.lineWidth = 0.5;
            }

            ctx.beginPath();
            ctx.moveTo(0, screenCoord.y);
            ctx.lineTo(canvas.width, screenCoord.y);
            ctx.stroke();

            if (Math.round(wy) !== 0) {
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`${wy * SCALE}мм`, 4, screenCoord.y - 4);
            }
        }

        // Помечаем центр координат жирной точкой и текстом (0,0)
        const zeroScreen = worldToScreen(0, 0);
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 11px monospace';
        ctx.beginPath();
        ctx.arc(zeroScreen.x, zeroScreen.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText("ЦЕНТР (0,0)", zeroScreen.x + 8, zeroScreen.y - 6);
    }

    // ОТРИСОВКА СТРЕЛОК РАЗМЕРОВ
    function drawDimensionLine(x1, y1, x2, y2, valueText) {
        const offset = 25; 
        let angle = Math.atan2(y2 - y1, x2 - x1);
        
        const pX = -Math.sin(angle) * offset;
        const pY = Math.cos(angle) * offset;

        const rx1 = x1 + pX; const ry1 = y1 + pY;
        const rx2 = x2 + pX; const ry2 = y2 + pY;

        ctx.save();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;

        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(rx1, ry1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(rx2, ry2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();

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

        const midX = (rx1 + rx2) / 2; const midY = (ry1 + ry2) / 2;
        ctx.translate(midX, midY);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle -= Math.PI;
        ctx.rotate(angle);

        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const textWidth = ctx.measureText(valueText).width + 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-textWidth / 2, -14, textWidth, 13);

        ctx.fillStyle = '#0f172a';
        ctx.fillText(valueText, 0, -2);
        ctx.restore();
    }

    function getDistanceInMM(p1, p2) {
        const dx = p2.x - p1.x; const dy = p2.y - p1.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy) * SCALE);
    }

    // ГЛАВНЫЙ РЕНДЕР ХОЛСТА
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Отрисовываем умную сетку и нулевые оси
        drawGrid();

        ctx.save();
        // Применяем глобальную матрицу трансформации навигации
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoom, zoom);

        // Отрисовка готовых стен
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 12 / zoom; 
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

        // Линия в процессе черчения
        if (currentPoints && currentTool === 'wall') {
            const worldMouse = screenToWorld(mousePos.x, mousePos.y);
            const adjustedMouse = getOrthoCoordinates(currentPoints, worldMouse);

            ctx.strokeStyle = '#0071e3';
            ctx.lineWidth = 4 / zoom;
            ctx.beginPath();
            ctx.moveTo(currentPoints.x, currentPoints.y);
            ctx.lineTo(adjustedMouse.x, adjustedMouse.y);
            ctx.stroke();

            const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
            const infoText = document.getElementById('wall-len-info');
            if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">${liveLen} мм</span>`;
        }

        ctx.restore();
    }

    // ЛОГИКА МАСШТАБИРОВАНИЯ СКРОЛЛОМ
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); 

        const zoomFactor = 1.1;

        if (e.deltaY < 0) {
            zoom = Math.min(zoom * zoomFactor, 15.0); // Увеличили макс. зум до 1500% для детальной сетки
        } else {
            zoom = Math.max(zoom / zoomFactor, 0.05); // Минимальный зум 5%
        }

        const mouseWorld = screenToWorld(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top);
        offsetX = e.clientX - canvas.getBoundingClientRect().left - mouseWorld.x * zoom;
        offsetY = e.clientY - canvas.getBoundingClientRect().top - mouseWorld.y * zoom;

        render();
    }, { passive: false });

    // ОБРАБОТЧИКИ НАЖАТИЯ МЫШИ
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        if (e.button === 1) {
            e.preventDefault();
            isPanning = true;
            canvas.style.cursor = 'grab';
            startPan = { x: screenX - offsetX, y: screenY - offsetY };
            return;
        }

        if (e.button === 0 && currentTool === 'wall') {
            const worldCoord = screenToWorld(screenX, screenY);

            if (!currentPoints) {
                currentPoints = { x: worldCoord.x, y: worldCoord.y };
            } else {
                const finalPoint = getOrthoCoordinates(currentPoints, worldCoord);
                appState.walls.push({
                    x1: currentPoints.x, y1: currentPoints.y,
                    x2: finalPoint.x, y2: finalPoint.y
                });
                currentPoints = null;
                const infoText = document.getElementById('wall-len-info');
                if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">—</span>`;
            }
            render();
        }
    });

    // ДВИЖЕНИЕ МЫШИ
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        mousePos.x = screenX;
        mousePos.y = screenY;

        if (isPanning) {
            offsetX = screenX - startPan.x;
            offsetY = screenY - startPan.y;
            render();
        } else if (currentPoints) {
            render();
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
            isPanning = false;
            canvas.style.cursor = currentTool === 'wall' ? 'crosshair' : 'default';
        }
    });

    canvas.addEventListener('contextmenu', e => { 
        if (currentTool === 'wall') e.preventDefault(); 
    });

    // Инструменты панели управления
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
