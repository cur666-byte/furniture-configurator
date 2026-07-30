/* components/editor2d/editor2d.js — Модуль управления 2D-редактором помещений. Реализует непрерывное черчение стен (Polyline), замыкание контура магнитом, привязку к сетке и ввод точной длины с клавиатуры. */

import { initNavigation } from './navigation.js';
import { drawGrid, drawFixedDimensionLine } from './drawer.js';

export function initEditor2D(appState) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentPoints = null; // Точка старта текущей стены (в мировых координатах)
    let mousePos = { x: 0, y: 0 }; // Экранная позиция мыши (в пикселях)
    let currentTool = 'pencil'; // Активный инструмент ('pencil' или 'rectangle')
    let isShiftPressed = false; // Режим Орто

    // ПЕРЕМЕННЫЕ ДЛЯ КЛАВИАТУРНОГО ВВОДА РАЗМЕРА
    let inputBuffer = ""; // Сюда собираем нажатые цифры
    const SCALE = 10;     // 1 пиксель = 10 реальных миллиметров

    // Подключаем стабильный модуль навигации
    const { navState, screenToWorld, worldToScreen, handleFirstResize } = initNavigation(canvas, render);

    // СЛУШАТЕЛИ КЛАВИАТУРЫ ДЛЯ ОРТО, СБРОСА И ВВОДА ЦИФР
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function handleKeyDown(e) {
        if (e.key === 'Shift') { isShiftPressed = true; render(); return; }
        if (e.key === 'Escape') { currentPoints = null; inputBuffer = ""; render(); return; }

        // Если пользователь чертит и вводит цифры с клавиатуры
        if (currentPoints && currentTool === 'pencil') {
            if (e.key >= '0' && e.key <= '9') {
                inputBuffer += e.key;
                updateLiveBufferDisplay();
            } else if (e.key === 'Backspace') {
                inputBuffer = inputBuffer.slice(0, -1);
                updateLiveBufferDisplay();
            } else if (e.key === 'Enter' && inputBuffer.length > 0) {
                // Строим стену по введенной длине в миллиметрах
                buildWallFromKeyboardInput();
            }
        }
    }

    function handleKeyUp(e) {
        if (e.key === 'Shift') { isShiftPressed = false; render(); }
    }

    // Функция обновления текста текущего ввода в левой панели
    function updateLiveBufferDisplay() {
        const infoText = document.getElementById('wall-len-info');
        if (infoText) {
            if (inputBuffer.length > 0) {
                infoText.innerHTML = `Ввод длины: <span class="highlight" style="background:#fef08a; padding:2px 4px; border-radius:3px;">${inputBuffer} мм</span>`;
            } else {
                render(); // Перерисует и вернет стандартную live-длину
            }
        }
    }

    // СТРОИМ СТЕНУ ПО ТОЧНОЙ ДЛИНЕ С КЛАВИАТУРЫ
    function buildWallFromKeyboardInput() {
        const desiredLengthMM = parseInt(inputBuffer);
        const desiredLengthWorld = desiredLengthMM / SCALE; // Переводим мм в мировые пиксели

        const worldMouse = screenToWorld(mousePos.x, mousePos.y);
        const adjustedMouse = getOrthoCoordinates(currentPoints, worldMouse);

        // Считаем угол направления мыши относительно стартовой точки
        const angle = Math.atan2(adjustedMouse.y - currentPoints.y, adjustedMouse.x - currentPoints.x);

        // Рассчитываем финальную точку ровно по вектору направления на заданную длину
        const finalWorldPoint = {
            x: currentPoints.x + Math.cos(angle) * desiredLengthWorld,
            y: currentPoints.y + Math.sin(angle) * desiredLengthWorld
        };

        // Сохраняем стену в базу данных
        appState.walls.push({
            x1: currentPoints.x, y1: currentPoints.y,
            x2: finalWorldPoint.x, y2: finalWorldPoint.y
        });

        // НЕПРЕРЫВНОЕ РИСОВАНИЕ: Новая точка старта начинается там, где закончилась предыдущая!
        currentPoints = { x: finalWorldPoint.x, y: finalWorldPoint.y };
        inputBuffer = ""; // Очищаем буфер ввода

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

    // МАТЕМАТИКА МАГНИТНЫХ ПРИВЯЗОК (К сетке и к началу первой линии)
    function getSnappedCoordinates(screenX, screenY) {
        // Проверяем привязку к началу ПЕРВОЙ стены для замыкания контура
        if (appState.walls.length > 0 && currentPoints) {
            const firstWall = appState.walls[0];
            const startScreenPos = worldToScreen(firstWall.x1, firstWall.y1);
            
            // Расстояние в пикселях на экране от мыши до самого начала чертежа
            const distToStart = Math.hypot(screenX - startScreenPos.x, screenY - startScreenPos.y);
            
            if (distToStart < 15) { // Радиус магнита 15 пикселей
                return { 
                    world: { x: firstWall.x1, y: firstWall.y1 }, 
                    isClosingSnap: true 
                };
            }
        }

        // Если это САМАЯ первая точка проекта, привязываем её к узлам размерной сетки (пункт 3)
        if (!currentPoints) {
            const worldMouse = screenToWorld(screenX, screenY);
            const gridStepMM = 500; // Привязка к шагу 500 мм
            const gridStepWorld = gridStepMM / SCALE;

            return {
                world: {
                    x: Math.round(worldMouse.x / gridStepWorld) * gridStepWorld,
                    y: Math.round(worldMouse.y / gridStepWorld) * gridStepWorld
                },
                isClosingSnap: false
            };
        }

        // В остальных случаях отдаем обычные мировые координаты под мышкой
        return { world: screenToWorld(screenX, screenY), isClosingSnap: false };
    }

    function getDistanceInMM(p1, p2) {
        const dx = p2.x - p1.x; const dy = p2.y - p1.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy) * SCALE);
    }

    // ГЛАВНЫЙ РЕНДЕР
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Слой 1: Рисуем измерительную динамическую сетку
        drawGrid(ctx, canvas, navState.zoom, screenToWorld, worldToScreen, SCALE);

        // Вычисляем координаты мыши с учетом магнита
        const snapResult = getSnappedCoordinates(mousePos.x, mousePos.y);

        // Слой 2: Отрисовка стен (Мировые координаты)
        ctx.save();
        ctx.translate(navState.offsetX, navState.offsetY);
        ctx.scale(navState.zoom, -navState.zoom);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 12 / navState.zoom; 
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        appState.walls.forEach(wall => {
            ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
        });

        // Рисование линии в процессе
        if (currentPoints && currentTool === 'pencil' && inputBuffer.length === 0) {
            const adjustedMouse = getOrthoCoordinates(currentPoints, snapResult.world);

            ctx.strokeStyle = '#0071e3'; ctx.lineWidth = 4 / navState.zoom;
            ctx.beginPath(); ctx.moveTo(currentPoints.x, currentPoints.y); ctx.lineTo(adjustedMouse.x, adjustedMouse.y); ctx.stroke();

            // Выводим live-длину в левое меню
            const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
            const infoText = document.getElementById('wall-len-info');
            if (infoText) infoText.innerHTML = `Длина стены: <span class="highlight">${liveLen} мм</span>`;
        }
        ctx.restore();

        // Слой 3: Отрисовка стрелок размеров поверх стен (Экранные координаты)
        appState.walls.forEach(wall => {
            const wallLength = getDistanceInMM({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2});
            drawFixedDimensionLine(ctx, worldToScreen, wall.x1, wall.y1, wall.x2, wall.y2, `${wallLength} мм`);
        });

        // Живой размер при черчении карандашом
        if (currentPoints && currentTool === 'pencil' && inputBuffer.length === 0) {
            const adjustedMouse = getOrthoCoordinates(currentPoints, snapResult.world);
            const liveLen = getDistanceInMM(currentPoints, adjustedMouse);
            if (liveLen > 0) {
                drawFixedDimensionLine(ctx, worldToScreen, currentPoints.x, currentPoints.y, adjustedMouse.x, adjustedMouse.y, `${liveLen} мм`);
            }
        }

        // Слой 4: РИСУЕМ КРАСИВЫЙ ИНДИКАТОР МАГНИТА (Как у конкурентов)
        if (snapResult.isClosingSnap) {
            const screenTarget = worldToScreen(snapResult.world.x, snapResult.world.y);
            ctx.save();
            ctx.strokeStyle = '#22c55e'; // Зеленый кружок магнита замыкания
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenTarget.x, screenTarget.y, 8, 0, 2 * Math.PI);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
            ctx.beginPath();
            ctx.arc(screenTarget.x, screenTarget.y, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
    }

    // ОТСЛЕЖИВАНИЕ ДВИЖЕНИЯ МЫШИ
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
        if (!navState.isPanning) render();
    });

    // ОБРАБОТКА КЛИКОВ МЫШИ
    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || navState.isPanning) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // ИНСТРУМЕНТ: КАРАНДАШ (НЕПРЕРЫВНОЕ ЧЕРЧЕНИЕ)
        if (currentTool === 'pencil') {
            const snapResult = getSnappedCoordinates(screenX, screenY);

            if (!currentPoints) {
                // Самая первая точка проекта (примагнитилась к сетке)
                currentPoints = { x: snapResult.world.x, y: snapResult.world.y };
            } else {
                const finalPoint = getOrthoCoordinates(currentPoints, snapResult.world);
                
                // Сохраняем готовую стену в базу
                appState.walls.push({
                    x1: currentPoints.x, y1: currentPoints.y,
                    x2: finalPoint.x, y2: finalPoint.y
                });

                if (snapResult.isClosingSnap) {
                    // Контур замкнулся на первую точку! Завершаем непрерывную цепочку
                    currentPoints = null;
                } else {
                    // НЕПРЕРЫВНОСТЬ: Следующая стена автоматом начинается из финиша текущей
                    currentPoints = { x: finalPoint.x, y: finalPoint.y };
                }
            }
            inputBuffer = ""; // Обнуляем клавиатурный буфер при клике
            render();
        }

        // ИНСТРУМЕНТ: ПРЯМОУГОЛЬНИК (БЫСТРАЯ КОРОБКА)
        if (currentTool === 'rectangle') {
            const worldCoord = screenToWorld(screenX, screenY);
            // Создаем готовую коробку стен 4x3 метра от точки клика
            appState.walls.push(
                { x1: worldCoord.x, y1: worldCoord.y, x2: worldCoord.x + 400, y2: worldCoord.y },
                { x1: worldCoord.x + 400, y1: worldCoord.y, x2: worldCoord.x + 400, y2: worldCoord.y + 300 },
                { x1: worldCoord.x + 400, y1: worldCoord.y + 300, x2: worldCoord.x, y2: worldCoord.y + 300 },
                { x1: worldCoord.x, y1: worldCoord.y + 300, x2: worldCoord.x, y2: worldCoord.y }
            );
            render();
        }
    });

    canvas.addEventListener('contextmenu', e => { if(currentTool === 'pencil') e.preventDefault(); });

    // Управление новыми кнопками инструментов
    const toolPencil = document.getElementById('tool-pencil');
    const toolRectShape = document.getElementById('tool-rect-shape');

    if (toolPencil && toolRectShape) {
        toolPencil.addEventListener('click', () => {
            currentTool = 'pencil';
            toolPencil.classList.add('active'); toolRectShape.classList.remove('active');
            canvas.style.cursor = 'crosshair';
            currentPoints = null; render();
        });
        toolRectShape.addEventListener('click', () => {
            currentTool = 'rectangle';
            toolRectShape.classList.add('active'); toolPencil.classList.remove('active');
            canvas.style.cursor = 'cell';
            currentPoints = null; render();
        });
    }

    const clearBtn = document.getElementById('btn-clear-canvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            appState.walls = []; currentPoints = null; inputBuffer = "";
            render();
        });
    }

    window.addEventListener('resize', resize);
    resize();
}
