/* components/editor2d/editor2d.js — Модуль управления 2D-редактором помещений. Отвечает за фиксированные размеры текста/стрелок при зуме, цветные полупрозрачные оси координат, автоматическое выравнивание и навигацию по холсту. */

export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = null; // Точка старта текущей стены (в мировых координатах)
    let mousePos = { x: 0, y: 0 }; // Позиция курсора (в экранных пикселях)
    let currentTool = 'wall'; // Активный инструмент ('wall' или 'select')
    let isShiftPressed = false; // Флаг зажатого Shift для режима Орто

    // НАСТРОЙКИ НАВИГАЦИИ (СТАРТ ИЗ ЛЕВОГО НИЖНЕГО УГЛА)
    let zoom = 1.0;          
    let offsetX = 0;        
    let offsetY = 0;        
    let isFirstLoad = true;  
    let isPanning = false;   
    let startPan = { x: 0, y: 0 }; 

    const SCALE = 10; // 1 пиксель чертежа = 10 реальных миллиметров

    // Слушатели клавиатуры для режима Орто
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') { isShiftPressed = true; render(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') { isShiftPressed = false; render(); }
    });

    // ПЕРЕВОД КООРДИНАТ (Экран <-> Мир)
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

    // Инициализация размеров и привязка нуля (0,0) к левому нижнему углу
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        if (isFirstLoad) {
            // Вычисляем зум, чтобы 6 метров (600px в мире) занимали около 70% экрана
            const targetWorldSize = 600; 
            zoom = (canvas.width * 0.7) / targetWorldSize;

            // Сдвигаем точку (0,0) в левый нижний угол с отступом в 60 пикселей
            offsetX = 60;
            offsetY = canvas.height - 60;
            
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

    // УМНАЯ СЕТКА С РАЗРЕЖЕНИЕМ И ЦВЕТНЫМИ ПОЛУПРОЗРАЧНЫМИ ОСЯМИ
    function drawGrid() {
        // Вычисляем шаг сетки так, чтобы на экране между линиями всегда было не меньше 50 пикселей
        let worldStep = 50; // 500 мм базовый шаг
        
        if (worldStep * zoom < 40) {
            worldStep = 100; // Если слишком мелко, переключаем на шаг 1 метр
        }
        if (worldStep * zoom < 40) {
            worldStep = 200; // Если всё ещё мелко — шаг 2 метра
        }
        if (worldStep * zoom > 150) {
            worldStep = 10;  // Если сильно приблизили — шаг 100 мм
        }

        ctx.save();
        ctx.font = '10px monospace';

        const topLeftWorld = screenToWorld(0, 0);
        const bottomRightWorld = screenToWorld(canvas.width, canvas.height);

        // Сетка рисуется с инверсией оси Y (чтобы Y шёл вверх, как в математике)
        const startX = Math.floor(topLeftWorld.x / worldStep) * worldStep;
        const endX = Math.ceil(bottomRightWorld.x / worldStep) * worldStep;
        const startY = Math.floor(bottomRightWorld.y / worldStep) * worldStep;
        const endY = Math.ceil(topLeftWorld.y / worldStep) * worldStep;

        // 1. РИСУЕМ ЛИНИИ СЕТКИ (Тонкие и прозрачные)
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 0.5;
        
        for (let wx = startX; wx <= endX; wx += worldStep) {
            if (Math.round(wx) === 0) continue; // Пропускаем нулевую ось
            const sCoord = worldToScreen(wx, 0);
            ctx.beginPath(); ctx.moveTo(sCoord.x, 0); ctx.lineTo(sCoord.x, canvas.height); ctx.stroke();
        }
        for (let wy = startY; wy <= endY; wy += worldStep) {
            if (Math.round(wy) === 0) continue;
            const sCoord = worldToScreen(0, wy);
            ctx.beginPath(); ctx.moveTo(0, sCoord.y); ctx.lineTo(canvas.width, sCoord.y); ctx.stroke();
        }

        // 2. ЦВЕТНЫЕ ПОЛУПРОЗРАЧНЫМИ ОСИ КООРДИНАТ (X — красная, Y — зеленая)
        const zeroScreen = worldToScreen(0, 0);

        // Вертикальная ось Y — ЗЕЛЕНАЯ полупрозрачная
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; 
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(zeroScreen.x, 0); ctx.lineTo(zeroScreen.x, canvas.height); ctx.stroke();

        // Горизонтальная ось X — КРАСНАЯ полупрозрачная
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; 
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, zeroScreen.y); ctx.lineTo(canvas.width, zeroScreen.y); ctx.stroke();

        // 3. ПОДПИСИ ШКАЛЫ (Выводим поверх, чтобы не слипались)
        ctx.fillStyle = '#94a3b8';
        for (let wx = startX; wx <= endX; wx += worldStep) {
            if (Math.round(wx) === 0) continue;
            const sCoord = worldToScreen(wx, 0);
            // Пишем шкалу X вдоль нижней границы экрана
            ctx.fillText(`${wx * SCALE}мм`, sCoord.x + 4, canvas.height - 15);
        }
        for (let wy = startY; wy <= endY; wy += worldStep) {
            if (Math.round(wy) === 0) continue;
            const sCoord = worldToScreen(0, wy);
            // Пишем шкалу Y вдоль левой границы экрана
            ctx.fillText(`${wy * SCALE}мм`, 10, sCoord.y - 4);
        }

        // Маркер центра координат (0,0)
        ctx.fillStyle = '#475569';
        ctx.beginPath(); ctx.arc(zeroScreen.x, zeroScreen.y, 4, 0, 2 * Math.PI); ctx.fill();
        ctx.font = 'bold 11px monospace';
        ctx.fillText("ЦЕНТР (0,0)", zeroScreen.x + 8, zeroScreen.y - 8);
        ctx.restore();
    }

    // ПРОФЕССИОНАЛЬНЫЕ РАЗМЕРНЫЕ ЛИНИИ (Всегда фиксированный размер на экране!)
    function drawFixedDimensionLine(wx1, wy1, wx2, wy2, valueText) {
        // Переводим мировые координаты точек в экранные пиксели
        const s1 = worldToScreen(wx1, wy1);
        const s2 = worldToScreen(wx2, wy2);

        const offset = 25; // Фиксированный вынос линии в пикселях на экране
        let angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
        
        // Вектор сдвига размерной линии
        const pX = -Math.sin(angle) * offset;
        const pY = Math.cos(angle) * offset;

        const rx1 = s1.x + pX; const ry1 = s1.y + pY;
        const rx2 = s2.x + pX; const ry2 = s2.y + pY;

        ctx.save();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1; // Толщина линии всегда 1px

        // Выносные линии от стены к размерной стрелке
        ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(rx1, ry1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s2.x, s2.y); ctx.lineTo(rx2, ry2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();

        // Наклонные засечки по краям (всегда 6 пикселей на экране)
        const tickLen = 5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rx1 - Math.cos(angle + Math.PI/4) * tickLen, ry1 - Math.sin(angle + Math.PI/4) * tickLen);
        ctx.lineTo(rx1 + Math.cos(angle + Math.PI/4) * tickLen, ry1 + Math.sin(angle + Math.PI/4) * tickLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rx2 - Math.cos(angle + Math.PI/4) * tickLen, ry2 - Math.sin(angle + Math.PI/4) * tickLen);
        ctx.lineTo(rx2 + Math.cos(angle + Math.PI/4) * tickLen, ry2 + Math.sin(angle + Math.PI/4) * tickLen);
        ctx.stroke();

        // Поворот цифр строго параллельно линии размеров
        const midX = (rx1 + rx2) / 2;
        const midY = (ry1 + ry2) / 2;

        ctx.translate(midX, midY);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle -= Math.PI;
        ctx.rotate(angle);

        // Шрифт ВСЕГДА 11px на экране, не раздувается при приближении!
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const textWidth = ctx.measureText(valueText).width + 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-textWidth / 2, -13, textWidth, 12);

        ctx.fillStyle = '#0f172a';
        ctx.fillText(valueText, 0, -2);
        ctx.restore();
    }

    function getDistanceInMM(p1, p2) {
        const dx = p2.x - p1.x; const dy = p2.y - p1.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy) * SCALE);
    }

    // ГЛАВНЫЙ РЕНДЕР
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Рисуем умную сетку и полупрозрачные цветные оси координат
        drawGrid();

        // 2. Слой отрисовки самих стен в мировых координатах
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoom, zoom);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 12 / zoom; // Толщина адаптируется под зум
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();
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

        // 3. Слой отрисовки РАЗМЕРОВ (Вынесен отдельно, чтобы размеры не увеличивались от зума!)
        appState.walls.forEach(wall => {
            const wallLength = getDistanceInMM({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2});
            drawFixedDimensionLine(wall.x1, wall.y1, wall.x2, wall.y2, `${wallLength} мм`);
        });

        if (currentPoints && currentTool === 'wall') {
            const worldMouse = screenToWorld(mousePos.x, mousePos.y);
            const adjustedMouse = getOrthoCoordinates(currentPoints, worldMouse);
            const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
            if (liveLen > 0) {
                drawFixedDimensionLine(currentPoints.x, currentPoints.y, adjustedMouse.x, adjustedMouse.y, `${liveLen} мм`);
            }
        }
    }

    // ЛОГИКА МАСШТАБИРОВАНИЯ СКРОЛЛОМ
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); 
        const zoomFactor = 1.1;

        if (e.deltaY < 0) {
            zoom = Math.min(zoom * zoomFactor, 12.0); 
        } else {
            zoom = Math.max(zoom / zoomFactor, 0.08); 
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

    canvas.addEventListener('contextmenu', e => { if(currentTool === 'wall') e.preventDefault(); });

    // Управление боковыми кнопками инструментов
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
