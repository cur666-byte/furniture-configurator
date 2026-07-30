/* components/editor2d/editor2d.js — Модуль управления 2D-редактором помещений. Реализует непрерывное черчение карандашом, интерактивный прямоугольник по двум точкам, прозрачный вывод площади и блокировку/разблокировку черчения. */

import { initNavigation } from './navigation.js';
import { drawGrid, drawFixedDimensionLine } from './drawer.js';

export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = null; // Точка старта текущей стены/прямоугольника (в мировых координатах)
    let mousePos = { x: 0, y: 0 }; // Экранная позиция мыши (в пикселях)
    let currentTool = 'pencil'; // Активный инструмент ('pencil' или 'rectangle')
    let isShiftPressed = false; // Режим Орто
    let isRoomClosed = false; // Флаг: замкнут ли контур помещения

    let inputBuffer = ""; // Буфер клавиатурного ввода размера
    const SCALE = 10;     // 1 пиксель = 10 реальных миллиметров

    // Подключаем стабильный модуль навигации
    const { navState, screenToWorld, worldToScreen, handleFirstResize } = initNavigation(canvas, render);

    // Проверяем замкнутость при старте
    checkRoomClosure();

    // Слушатели клавиатуры
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function handleKeyDown(e) {
        if (isRoomClosed) return;
        if (e.key === 'Shift') { isShiftPressed = true; render(); return; }
        if (e.key === 'Escape') { currentPoints = null; inputBuffer = ""; render(); return; }

        if (currentPoints && currentTool === 'pencil') {
            if (e.key >= '0' && e.key <= '9') {
                inputBuffer += e.key;
                updateLiveBufferDisplay();
            } else if (e.key === 'Backspace') {
                inputBuffer = inputBuffer.slice(0, -1);
                updateLiveBufferDisplay();
            } else if (e.key === 'Enter' && inputBuffer.length > 0) {
                buildWallFromKeyboardInput();
            }
        }
    }

    function handleKeyUp(e) {
        if (e.key === 'Shift') { isShiftPressed = false; render(); }
    }

    function updateLiveBufferDisplay() {
        const infoText = document.getElementById('wall-len-info');
        if (infoText) {
            if (inputBuffer.length > 0) {
                infoText.innerHTML = `Ввод длины: <span class="highlight" style="background:#fef08a; padding:2px 4px; border-radius:3px;">${inputBuffer} мм</span>`;
            } else {
                render();
            }
        }
    }

    function buildWallFromKeyboardInput() {
        if (isRoomClosed) return;
        const desiredLengthMM = parseInt(inputBuffer);
        const desiredLengthWorld = desiredLengthMM / SCALE;

        const worldMouse = screenToWorld(mousePos.x, mousePos.y);
        const adjustedMouse = getOrthoCoordinates(currentPoints, worldMouse);

        const angle = Math.atan2(adjustedMouse.y - currentPoints.y, adjustedMouse.x - currentPoints.x);

        const finalWorldPoint = {
            x: currentPoints.x + Math.cos(angle) * desiredLengthWorld,
            y: currentPoints.y + Math.sin(angle) * desiredLengthWorld
        };

        appState.walls.push({
            x1: currentPoints.x, y1: currentPoints.y,
            x2: finalWorldPoint.x, y2: finalWorldPoint.y
        });

        currentPoints = { x: finalWorldPoint.x, y: finalWorldPoint.y };
        inputBuffer = "";

        checkRoomClosure();
        render();
    }

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

    
    function getSnappedCoordinates(screenX, screenY) {
        if (isRoomClosed) return { world: screenToWorld(screenX, screenY), isClosingSnap: false };

        if (appState.walls.length > 0 && currentPoints && currentTool === 'pencil') {
            const firstWall = appState.walls[0];
            const startScreenPos = worldToScreen(firstWall.x1, firstWall.y1);
            const distToStart = Math.hypot(screenX - startScreenPos.x, screenY - startScreenPos.y);

            if (distToStart < 15) {
                return {
                    world: { x: firstWall.x1, y: firstWall.y1 },
                    isClosingSnap: true
                };
            }
        }

        if (!currentPoints) {
            const worldMouse = screenToWorld(screenX, screenY);
            const gridStepWorld = 50;
            return {
                world: {
                    x: Math.round(worldMouse.x / gridStepWorld) * gridStepWorld,
                    y: Math.round(worldMouse.y / gridStepWorld) * gridStepWorld
                },
                isClosingSnap: false
            };
        }

        return { world: screenToWorld(screenX, screenY), isClosingSnap: false };
    }

    // Проверка замыкания контура и блокировка кнопок
    function checkRoomClosure() {
        if (appState.walls.length < 3) {
            isRoomClosed = false;
        } else {
            const first = appState.walls[0];
            const last = appState.walls[appState.walls.length - 1];
            const distance = Math.hypot(first.x1 - last.x2, first.y1 - last.y2);
            isRoomClosed = distance < 0.1;
        }


        const toolPencil = document.getElementById('tool-pencil');
        const toolRectShape = document.getElementById('tool-rect-shape');

        if (isRoomClosed) {
            if (toolPencil) toolPencil.disabled = true;
            if (toolRectShape) toolRectShape.disabled = true;
            canvas.style.cursor = 'default';
        } else {
            if (toolPencil) toolPencil.disabled = false;
            if (toolRectShape) toolRectShape.disabled = false;
            // Возвращаем курсор в зависимости от активного инструмента
            if (canvas) canvas.style.cursor = (currentTool === 'pencil') ? 'crosshair' : 'cell';
        }
    }






    function calculateRoomArea() {
        if (appState.walls.length < 3) return 0;
        let sum = 0;

        for (let i = 0; i < appState.walls.length; i++) {
            const wall = appState.walls[i];
            const x1 = wall.x1 * 0.01;
            const y1 = wall.y1 * 0.01;
            const x2 = wall.x2 * 0.01;
            const y2 = wall.y2 * 0.01;
            sum += (x1 * y2) - (x2 * y1);
        }
        return Math.abs(sum / 2).toFixed(2);
    }


    function getRoomCenterScreen() {
        let totalX = 0, totalY = 0, count = 0;
        appState.walls.forEach(wall => {
            totalX += wall.x1; totalY += wall.y1;
            totalX += wall.x2; totalY += wall.y2;
            count += 2;
        });
        return worldToScreen(totalX / count, totalY / count);
    }

    function getDistanceInMM(p1, p2) {
        const dx = p2.x - p1.x; const dy = p2.y - p1.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy) * SCALE);
    }

    // ГЛАВНЫЙ РЕНДЕР
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Слой сетки
        drawGrid(ctx, canvas, navState.zoom, screenToWorld, worldToScreen, SCALE);

        const snapResult = getSnappedCoordinates(mousePos.x, mousePos.y);

        // 2. Слой стен (Мировые координаты)
        ctx.save();
        ctx.translate(navState.offsetX, navState.offsetY);
        ctx.scale(navState.zoom, -navState.zoom);

        ctx.strokeStyle = '#334155';


        ctx.lineWidth = 12 / navState.zoom;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        // Мягкая заливка комнаты при готовности
        if (isRoomClosed) {
            ctx.fillStyle = 'rgba(0, 113, 227, 0.03)';
            ctx.beginPath();
            ctx.moveTo(appState.walls[0].x1, appState.walls[0].y1);
            appState.walls.forEach(wall => ctx.lineTo(wall.x2, wall.y2));
            ctx.fill();
        }

        appState.walls.forEach(wall => {
            ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
        });

        // Живой интерактивный предпросмотр
        if (currentPoints && !isRoomClosed) {
            ctx.strokeStyle = '#0071e3'; ctx.lineWidth = 4 / navState.zoom;

            if (currentTool === 'pencil' && inputBuffer.length === 0) {
                const adjustedMouse = getOrthoCoordinates(currentPoints, snapResult.world);
                ctx.beginPath(); ctx.moveTo(currentPoints.x, currentPoints.y); ctx.lineTo(adjustedMouse.x, adjustedMouse.y); ctx.stroke();

                const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
                const infoText = document.getElementById('wall-len-info');
                if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">${liveLen} мм</span>`;
            }
            else if (currentTool === 'rectangle') {
                const worldMouse = screenToWorld(mousePos.x, mousePos.y);
                ctx.beginPath();
                ctx.rect(currentPoints.x, currentPoints.y, worldMouse.x - currentPoints.x, worldMouse.y - currentPoints.y);
                ctx.stroke();
            }
        }
        ctx.restore();

        // 3. Слой стрелок размеров (Выносятся строго СНАРУЖИ контура)
        appState.walls.forEach(wall => {
            const wallLength = getDistanceInMM({ x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 });
            drawFixedDimensionLine(ctx, worldToScreen, wall.x1, wall.y1, wall.x2, wall.y2, `${wallLength} мм`);
        });

        // Временные живые размеры для строящихся элементов
        if (currentPoints && !isRoomClosed) {
            const worldMouse = screenToWorld(mousePos.x, mousePos.y);
            if (currentTool === 'pencil' && inputBuffer.length === 0) {
                const adjustedMouse = getOrthoCoordinates(currentPoints, snapResult.world);
                const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
                if (liveLen > 0)
                    drawFixedDimensionLine(ctx, worldToScreen, currentPoints.x, currentPoints.y, adjustedMouse.x, adjustedMouse.y, `${ liveLen } мм`);
            } else if (currentTool === 'rectangle') {
                const lengthX = Math.round(Math.abs(worldMouse.x - currentPoints.x) * SCALE);
                const lengthY = Math.round(Math.abs(worldMouse.y - currentPoints.y) * SCALE);
                // Вывод live-габаритов
                drawFixedDimensionLine(ctx, worldToScreen, currentPoints.x, currentPoints.y, worldMouse.x, currentPoints.y, `${ lengthX } мм`);
                drawFixedDimensionLine(ctx, worldToScreen, worldMouse.x, currentPoints.y, worldMouse.x, worldMouse.y, `${ lengthY } мм`);
            }
        }
        // 4. Индикатор магнита замыкания
        if (snapResult.isClosingSnap && !isRoomClosed) {
            const screenTarget = worldToScreen(snapResult.world.x, snapResult.world.y);
            ctx.save();
            ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath();
            ctx.arc(screenTarget.x, screenTarget.y, 8, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'; ctx.beginPath();
            ctx.arc(screenTarget.x, screenTarget.y, 4, 0, 2 * Math.PI);
            ctx.fill(); ctx.restore();
        }
        // 5. ПОЛНОСТЬЮ ПРОЗРАЧНЫЙ И ЧИСТЫЙ ВЫВОД ПЛОЩАДИ БЕЗ СЛОВА И ТРЕУГОЛЬНИКА
        if (isRoomClosed) {
            const centerScreen = getRoomCenterScreen();
            const area = calculateRoomArea();

            ctx.save();
            ctx.fillStyle = '#0f172a';
            // Глубокий темный цвет текста
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Выводим только число метров с прозрачным фоном вокруг
                        ctx.fillText(`${area} м²`, centerScreen.x, centerScreen.y);

            ctx.restore();
        }
    }

    // ДВИЖЕНИЕ МЫШИ
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        if (!navState.isPanning) render();
    });


    // ОБРАБОТКА КЛИКОВ МЫШИ


    canvas.addEventListener('mousedown', (e) => {

        if (e.button !== 0 || navState.isPanning || isRoomClosed) return;
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // ИНСТРУМЕНТ: КАРАНДАШ
        if (currentTool === 'pencil') {
            const snapResult = getSnappedCoordinates(screenX, screenY);

            if (!currentPoints) {
                currentPoints = { x: snapResult.world.x, y: snapResult.world.y };
            } else {
                const finalPoint = getOrthoCoordinates(currentPoints, snapResult.world);
                appState.walls.push({
                    x1: currentPoints.x, y1: currentPoints.y, x2: finalPoint.x, y2: finalPoint.y
                });

                if (snapResult.isClosingSnap) {
                    currentPoints = null;

                } else {
                    currentPoints = { x: finalPoint.x, y: finalPoint.y };
                }
            }
            inputBuffer = ""; checkRoomClosure(); render();
        }
        // ИНСТРУМЕНТ: ПРЯМОУГОЛЬНИК (НАПРАВЛЕНИЕ СТЕН СИНХРОНИЗИРОВАНО ДЛЯ ВЫНОСА НАРУЖУ)




        if (currentTool === 'rectangle') {

            const worldCoord = screenToWorld(screenX, screenY);

            if (!currentPoints) {
                currentPoints = {
                    x: worldCoord.x, y: worldCoord.y
                };
            } else {
                const x1 = currentPoints.x; const y1 = currentPoints.y; const x2 = worldCoord.x;
                const y2 = worldCoord.y;
                // Перестраиваем обход углов, чтобы векторы размеров всегда выталкивались наружу комнаты
                appState.walls.push(
                    { x1: x1, y1: y1, x2: x2, y2: y1 }, // Слева направо (Верх)
                    { x1: x2, y1: y1, x2: x2, y2: y2 }, // Сверху вниз (Право)
                    { x1: x2, y1: y2, x2: x1, y2: y2 }, // Справа налево (Низ)
                    { x1: x1, y1: y2, x2: x1, y2: y1 }  // Снизу вверх (Лево)
                );
                currentPoints = null; checkRoomClosure(); render();
            }
        }
    });
    canvas.addEventListener('contextmenu', e => {
        if (currentTool === 'pencil') e.preventDefault();

    });
    // Управление кнопками инструментов панели с очисткой незавершённых линий
    const toolPencil = document.getElementById('tool-pencil');
    const toolRectShape = document.getElementById('tool-rect-shape');

    if (toolPencil && toolRectShape) {
        toolPencil.addEventListener('click', () => {
            if (isRoomClosed) return;
            currentTool = 'pencil';
            toolPencil.classList.add('active'); 
            toolRectShape.classList.remove('active');
            canvas.style.cursor = 'crosshair';
            
            // ТОЧЕЧНАЯ ПРАВКА: Сбрасываем недорисованную линию при смене инструмента
            currentPoints = null; 
            inputBuffer = "";
            render();
        });

        toolRectShape.addEventListener('click', () => {
            if (isRoomClosed) return;
            currentTool = 'rectangle';
            toolRectShape.classList.add('active'); 
            toolPencil.classList.remove('active');
            canvas.style.cursor = 'cell';
            
            // ТОЧЕЧНАЯ ПРАВКА: Сбрасываем недорисованную линию при смене инструмента
            currentPoints = null; 
            inputBuffer = "";
            render();
        });
    }


    // Кнопка очистки — СБРОС И ПОЛНАЯ РАЗБЛОКИРОВКА МЕНЮ С СОХРАНЕНИЕМ ТЕКУЩЕГО ИНСТРУМЕНТА
    const clearBtn = document.getElementById('btn-clear-canvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            appState.walls = []; 
            currentPoints = null; 
            inputBuffer = "";
            isRoomClosed = false;
            
            // Разблокируем кнопки в меню
            if (toolPencil) toolPencil.disabled = false;
            if (toolRectShape) toolRectShape.disabled = false;
            
            // ТОЧЕЧНАЯ ПРАВКА ПАМЯТИ: сохраняем текущий инструмент currentTool и просто обновляем его подсветку
            if (currentTool === 'pencil') {
                if (toolPencil) toolPencil.classList.add('active');
                if (toolRectShape) toolRectShape.classList.remove('active');
                canvas.style.cursor = 'crosshair';
            } else if (currentTool === 'rectangle') {
                if (toolRectShape) toolRectShape.classList.add('active');
                if (toolPencil) toolPencil.classList.remove('active');
                canvas.style.cursor = 'cell';
            }
            
            checkRoomClosure(); 
            render();
        });
    }
}
