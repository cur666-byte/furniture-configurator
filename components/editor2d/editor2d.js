/* components/editor2d/editor2d.js — Модуль управления 2D-редактором помещений. Отвечает строго за логику создания стен, обработку кликов мыши и привязки, используя изолированные модули навигации и отрисовки. */

import { initNavigation } from './navigation.js';
import { drawGrid, drawFixedDimensionLine } from './drawer.js';

export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = null; // Точка старта текущей стены (в мировых координатах)
    let mousePos = { x: 0, y: 0 }; // Экранная позиция мыши
    let currentTool = 'wall'; // Активный инструмент ('wall' или 'select')
    let isShiftPressed = false; // Режим Орто

    const SCALE = 10; // 1 пиксель = 10 реальных миллиметров

    // Подключаем стабильный модуль навигации
    const { navState, screenToWorld, worldToScreen, handleFirstResize } = initNavigation(canvas, render);

    // Слушатели клавиатуры для режима Орто (Shift)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') { isShiftPressed = true; render(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') { isShiftPressed = false; render(); }
    });

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        handleFirstResize(); 
        render();
    }

    function getOrthoCoordinates(start, current) {
        if (!isShiftPressed) return current;
        const dx = Math.abs(current.x - start.x);
        const dy = Math.abs(current.y - start.y);
        return dx > dy ? { x: current.x, y: start.y } : { x: start.x, y: current.y };
    }

    function getDistanceInMM(p1, p2) {
        const dx = p2.x - p1.x; const dy = p2.y - p1.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy) * SCALE);
    }

    // ГЛАВНЫЙ РЕНДЕР (Вызывает готовые функции отрисовки из модуля drawer.js)
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем сетку через внешний модуль
        drawGrid(ctx, canvas, navState.zoom, screenToWorld, worldToScreen, SCALE);

        // Слой стен (Мировые координаты)
        ctx.save();
        ctx.translate(navState.offsetX, navState.offsetY);
        ctx.scale(navState.zoom, -navState.zoom);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 12 / navState.zoom; 
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
        });

        // Линия в процессе черчения прямо сейчас
        if (currentPoints && currentTool === 'wall') {
            const worldMouse = screenToWorld(mousePos.x, mousePos.y);
            const adjustedMouse = getOrthoCoordinates(currentPoints, worldMouse);

            ctx.strokeStyle = '#0071e3'; ctx.lineWidth = 4 / navState.zoom;
            ctx.beginPath(); ctx.moveTo(currentPoints.x, currentPoints.y); ctx.lineTo(adjustedMouse.x, adjustedMouse.y); ctx.stroke();

            const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
            const infoText = document.getElementById('wall-len-info');
            if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">${liveLen} мм</span>`;
        }
        ctx.restore();

        // Слой стрелок размеров (Экранные фиксированные координаты) через внешний модуль
        appState.walls.forEach(wall => {
            const wallLength = getDistanceInMM({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2});
            drawFixedDimensionLine(ctx, worldToScreen, wall.x1, wall.y1, wall.x2, wall.y2, `${wallLength} мм`);
        });

        if (currentPoints && currentTool === 'wall') {
            const worldMouse = screenToWorld(mousePos.x, mousePos.y);
            const adjustedMouse = getOrthoCoordinates(currentPoints, worldMouse);
            const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
            if (liveLen > 0) {
                drawFixedDimensionLine(ctx, worldToScreen, currentPoints.x, currentPoints.y, adjustedMouse.x, adjustedMouse.y, `${liveLen} мм`);
            }
        }
    }

    // ОТСЛЕЖИВАНИЕ МЫШИ ДЛЯ СОЗДАНИЯ СТЕН
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        if (currentPoints && !navState.isPanning) render();
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || currentTool !== 'wall' || navState.isPanning) return;

        const rect = canvas.getBoundingClientRect();
        const worldCoord = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

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
    });

    canvas.addEventListener('contextmenu', e => { if(currentTool === 'wall') e.preventDefault(); });

    // Управление кнопками инструментов
    const toolWall = document.getElementById('tool-wall');
    const toolSelect = document.getElementById('tool-select');

    if (toolWall && toolSelect) {
        toolWall.addEventListener('click', () => {
            currentTool = 'wall';
            toolWall.classList.add('active'); toolSelect.classList.remove('active');
            canvas.style.cursor = 'crosshair';
        });
        toolSelect.addEventListener('click', () => {
            currentTool = 'select';
            toolSelect.classList.add('active'); toolWall.classList.remove('active');
            canvas.style.cursor = 'default'; currentPoints = null;
            render();
        });
    }

    const clearBtn = document.getElementById('btn-clear-canvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            appState.walls = []; currentPoints = null;
            render();
        });
    }

    window.addEventListener('resize', resize);
    resize();
}
