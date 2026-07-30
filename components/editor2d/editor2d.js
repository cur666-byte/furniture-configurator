/* components/editor2d/editor2d.js — Модуль управления 2D-редактором помещений. Отвечает за измерительную динамическую сетку, фиксированные выносы размеров, режим Орто (Shift) и точный зум с фокусом на курсор мыши. */

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

    // ПЕРЕВОД КООРДИНАТ (Экран <-> Мир) - ИСПРАВЛЕНО
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

            // Сдвигаем точку (0,0) в левый нижний угол с отступом в 80 пикселей для линеек размеров
            offsetX = 80;
            offsetY = canvas.height - 80;
            
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
        let worldStep = 50; // 500 мм базовый шаг
        
        // Автоматически укрупняем или уменьшаем шаг сетки в зависимости от зума, чтобы линии не слипались
        if (worldStep * zoom < 50) worldStep = 100; // 1 метр
        if (worldStep * zoom < 50) worldStep = 200; // 2 метра
        if (worldStep * zoom > 150) worldStep = 10; // 100 мм

        ctx.save();
        ctx.font = '10px monospace';

        const topLeftWorld = screenToWorld(0, 0);
        const bottomRightWorld = screenToWorld(canvas.width, canvas.height);

        const startX = Math.floor(topLeftWorld.x / worldStep) * worldStep;
        const endX = Math.ceil(bottomRightWorld.x / worldStep) * worldStep;
        const startY = Math.floor(bottomRightWorld.y / worldStep) * worldStep;
        const endY = Math.ceil(topLeftWorld.y / worldStep) * worldStep;

        // 1. РИСУЕМ ЛИНИИ СЕТКИ (Сделали цвет контрастнее — #e2e8f0)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;
        
        for (let wx = startX; wx <= endX; wx += worldStep) {
            if (Math.round(wx) === 0) continue; 
            const sCoord = worldToScreen(wx, 0);
            ctx.beginPath(); ctx.moveTo(sCoord.x, 0); ctx.lineTo(sCoord.x, canvas.height); ctx.stroke();
        }
        for (let wy = startY; wy <= endY; wy += worldStep) {
            if (Math.round(wy) === 0) continue;
            const sCoord = worldToScreen(0, wy);
            ctx.beginPath(); ctx.moveTo(0, sCoord.y); ctx.lineTo(canvas.width, sCoord.y); ctx.stroke();
        }

        // 2. ЦВЕТНЫЕ ПОЛУПРОЗРАЧНЫЕ ОСИ КООРДИНАТ (X — красная, Y — зеленая)
        const zeroScreen = worldToScreen(0, 0);

        // Вертикальная ось Y — ЗЕЛЕНАЯ полупрозрачная
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)'; 
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(zeroScreen.x, 0); ctx.lineTo(zeroScreen.x, canvas.height); ctx.stroke();

        // Горизонтальная ось X — КРАСНАЯ полупрозрачная
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; 
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, zeroScreen.y); ctx.lineTo(canvas.width, zeroScreen.y); ctx.stroke();

        // 3. ПОДПИСИ ШКАЛЫ (С фиксацией отступа от краев экрана, чтобы не улетали)
        ctx.fillStyle = '#64748b';
        
        for (let wx = startX; wx <= endX; wx += worldStep) {
            if (Math.round(wx) === 0) continue;
            const sCoord = worldToScreen(wx, 0);
            // Линейка X всегда прижата к нижнему краю экрана
            ctx.fillText(`${wx * SCALE}мм`, sCoord.x + 4, canvas.height - 12);
        }
        for (let wy = startY; wy <= endY; wy += worldStep) {
            if (Math.round(wy) === 0) continue;
            const sCoord = worldToScreen(0, wy);
            // ИСПРАВЛЕНО: Линейка Y теперь зафиксирована слева (всегда видна на 12px от края экрана)
            ctx.fillText(`${wy * SCALE}мм`, 12, sCoord.y - 4);
        }

        // Маркер центра координат (0,0)
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.arc(zeroScreen.x, zeroScreen.y, 4, 0, 2 * Math.PI); ctx.fill();
        ctx.font = 'bold 11px monospace';
        ctx.fillText("ЦЕНТР (0,0)", zeroScreen.x + 8, zeroScreen.y - 8);
        ctx.restore();
    }

    // ПРОФЕССИОНАЛЬНЫЕ РАЗМЕРНЫЕ ЛИНИИ (Фиксированный размер на экране)
    function drawFixedDimensionLine(wx1, wy1, wx2, wy2, valueText) {
        const s1 = worldToScreen(wx1, wy1);
        const s2 = worldToScreen(wx2, wy2);

        const offset = 25; 
        let angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
        
        const pX = -Math.sin(angle) * offset;
        const pY = Math.cos(angle) * offset;

        const rx1 = s1.x + pX; const ry1 = s1.y + pY;
        const rx2 = s2.x + pX; const ry2 = s2.y + pY;

        ctx.save();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;

        ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(rx1, ry1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s2.x, s2.y); ctx.lineTo(rx2, ry2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();

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

        const midX = (rx1 + rx2) / 2;
        const midY = (ry1 + ry2) / 2;

        ctx.translate(midX, midY);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle -= Math.PI;
        ctx.rotate(angle);

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
        
        // 1. Рисуем сетку
        drawGrid();

        // 2. Слой стен (Мировые координаты)
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoom, zoom);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 12 / zoom; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();
        });

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

        // 3. Слой РАЗМЕРОВ (Фиксированный экранный размер)
        appState.walls.forEach(wall => {
            const wallLength = getDistanceInMM({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2});
            drawFixedDimensionLine(wall.x1, wall.y1, wall.x2, wall.y2, `${wallLength} мм`);
        });

        if (currentPoints && currentTool === 'wall') {
            if (currentPoints && currentTool === 'wall') {
                const worldMouse = screenToWorld(mousePos.x, mousePos.y);
                const adjustedMouse = getOrthoCoordinates(currentPoints, worldMouse);
                const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
                if (liveLen > 0) {
                    drawFixedDimensionLine(currentPoints.x, currentPoints.y, adjustedMouse.x, adjustedMouse.y, `${liveLen} мм`);
                }
            }
        }
    
        // ЛОГИКА МАСШТАБИРОВАНИЯ СКРОЛЛОМ (ТОЧНЫЙ ФОКУС НА КУРСОР МЫШИ — КАК В SKETCHUP)
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault(); 
            
            // Берем позицию мыши относительно холста
            const rect = canvas.getBoundingClientRect();
            const mX = e.clientX - rect.left;
            const mY = e.clientY - rect.top;
    
            // Находим мировую точку под курсором ДО изменения зума
            const mouseWorldBefore = screenToWorld(mX, mY);
    
            const zoomFactor = 1.1;
            if (e.deltaY < 0) {
                zoom = Math.min(zoom * zoomFactor, 12.0); 
            } else {
                zoom = Math.max(zoom / zoomFactor, 0.08); 
            }
    
            // Пересчитываем смещение offsetX/offsetY так, чтобы мировая точка осталась ровно под курсором мыши!
            offsetX = mX - mouseWorldBefore.x * zoom;
            offsetY = mY - mouseWorldBefore.y * zoom;
    
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
}