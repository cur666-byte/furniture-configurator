/* components/editor2d/editor2d.js — Модуль управления 2D-редактором помещений. Отвечает за измерительную сетку, режим Орто (Shift), стрелочные размеры и навигацию по холсту в стиле SketchUp (зум скроллом и панорамирование зажатым колесиком). */

export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = null; // Точка старта текущей стены (в мировых координатах)
    let mousePos = { x: 0, y: 0 }; // Позиция курсора (в экранных пикселях)
    let currentTool = 'wall'; // Активный инструмент ('wall' или 'select')
    let isShiftPressed = false; // Флаг зажатого Shift для режима Орто

    // НАСТРОЙКИ НАВИГАЦИИ (КАК В SKETCHUP)
    let zoom = 1.0;          // Текущий масштаб (1.0 = 100%)
    let offsetX = 0;        // Смещение холста по X
    let offsetY = 0;        // Смещение холста по Y
    let isPanning = false;   // Флаг перемещения карты прямо сейчас
    let startPan = { x: 0, y: 0 }; // Начальная точка зажатия колесика

    const SCALE = 10; // 1 пиксель чертежа = 10 реальных миллиметров

    // СЛУШАТЕЛИ КЛАВИАТУРЫ ДЛЯ РЕЖИМА ОРТО
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') { isShiftPressed = true; render(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') { isShiftPressed = false; render(); }
    });

    // ФУНКЦИИ ПЕРЕВОДА КООРДИНАТ (Из пикселей экрана в миллиметры чертежа и обратно)
    function screenToWorld(screenX, screenY) {
        return {
            x: (screenX - offsetX) / zoom,
            y: (screenY - offsetY) / zoom
        };
    }

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        render();
    }

    // РАСЧЕТ РЕЖИМА ОРТО (в мировых координатах)
    function getOrthoCoordinates(start, current) {
        if (!isShiftPressed) return current;
        const dx = Math.abs(current.x - start.x);
        const dy = Math.abs(current.y - start.y);
        return dx > dy ? { x: current.x, y: start.y } : { x: start.x, y: current.y };
    }

    // ИНЖЕНЕРНАЯ СЕТКА С УЧЕТОМ ЗУМА И СМЕЩЕНИЯ
    function drawGrid() {
        const baseStep = 50; // Базовый шаг 500мм
        const step = baseStep * zoom; // Шаг сетки меняется в зависимости от зума
        
        ctx.lineWidth = 0.5;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#94a3b8';

        // Рассчитываем стартовые линии, чтобы сетка бесконечно двигалась во все стороны
        const startX = offsetX % step;
        const startY = offsetY % step;

        // Вертикальные линии
        for (let x = startX; x < canvas.width; x += step) {
            const worldCoord = screenToWorld(x, 0);
            const isMajor = Math.round(worldCoord.x) % 100 === 0;
            ctx.strokeStyle = isMajor ? '#cbd5e1' : '#f1f5f9';
            
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            
            // Выводим цифры шкалы, если масштаб позволяет их читать
            if (zoom > 0.3 && Math.round(worldCoord.x) % 100 === 0) {
                ctx.fillText(`${Math.round(worldCoord.x) * SCALE}мм`, x + 4, 12);
            }
        }
        
        // Горизонтальные линии
        for (let y = startY; y < canvas.height; y += step) {
            const worldCoord = screenToWorld(0, y);
            const isMajor = Math.round(worldCoord.y) % 100 === 0;
            ctx.strokeStyle = isMajor ? '#cbd5e1' : '#f1f5f9';
            
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            
            if (zoom > 0.3 && Math.round(worldCoord.y) % 100 === 0) {
                ctx.fillText(`${Math.round(worldCoord.y) * SCALE}мм`, 4, y - 4);
            }
        }
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
        
        // 1. Отрисовываем сетку (она сама считает зум)
        drawGrid();

        ctx.save();
        // Применяем глобальную матрицу трансформации навигации для стен!
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoom, zoom);

        // Отрисовка готовых стен
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 12 / zoom; // Чтобы толщина стен визуально оставалась адекватной при зуме
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();

            // Стрелочки размеров чертятся внутри трансформированного слоя
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

    // 1. ЛОГИКА МАСШТАБИРОВАНИЯ СКРОЛЛОМ (ZOOM С ФОКУСОМ НА КУРСОР)
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); // Запрещаем стандартную прокрутку страницы браузера

        const zoomFactor = 1.1;
        const oldZoom = zoom;

        // Вперед — увеличиваем масштаб, назад — уменьшаем
        if (e.deltaY < 0) {
            zoom = Math.min(zoom * zoomFactor, 8.0); // Ограничение макс. зума 800%
        } else {
            zoom = Math.max(zoom / zoomFactor, 0.15); // Ограничение мин. зума 15%
        }

        // Магия фокуса: чертеж увеличивается именно туда, куда смотрит мышка (как в SketchUp)
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

        // КНОПКА 1 — Зажатие колесика мыши (PAN / Перемещение карты)
        if (e.button === 1) {
            e.preventDefault();
            isPanning = true;
            canvas.style.cursor = 'grab';
            startPan = { x: screenX - offsetX, y: screenY - offsetY };
            return;
        }

        // Левая кнопка мыши — обычное черчение
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

        // Если зажато колесико, передвигаем чертеж вслед за мышкой
        if (isPanning) {
            offsetX = screenX - startPan.x;
            offsetY = screenY - startPan.y;
            render();
        } else if (currentPoints) {
            render();
        }
    });

    // ОТПУСКАНИЕ МЫШИ
    window.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
            isPanning = false;
            canvas.style.cursor = currentTool === 'wall' ? 'crosshair' : 'default';
        }
    });

    // Отмена стандартного появления контекстного меню по клику на колесико
    canvas.addEventListener('contextmenu', (e) => { 
        if (currentTool === 'wall') e.preventDefault(); 
    });

    // Инструменты панели управления слева
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

    // Кнопка очистки холста
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
