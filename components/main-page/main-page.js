import { initEditor2D } from '../editor2d/editor2d.js';

export function initMainPage(appState) {
    const mainPageContainer = document.getElementById('main-page-step');
    if (!mainPageContainer) return;

    // Главная функция рендеринга всего каркаса страницы
    function renderMainLayout() {
        mainPageContainer.innerHTML = `
            <div class="main-page-layout">
                <header class="main-header">
                    <div class="logo">📐 FurnitureCAD</div>
                    <nav class="steps-nav">
                        <!-- Поменяли START на НАЧАЛО -->
                        <div class="step-item active" data-step="start">
                            <span class="step-num">🏠</span> НАЧАЛО
                        </div>
                        <div class="step-arrow"></div>
                        <div class="step-item" data-step="room">
                            <span class="step-num">1</span> ПОМЕЩЕНИЕ
                        </div>
                        <div class="step-arrow"></div>
                        <div class="step-item" data-step="furniture">
                            <span class="step-num">2</span> ОБСТАНОВКА
                        </div>
                    </nav>
                    <div class="project-badge" id="main-project-name">Проект</div>
                </header>

                <div class="workspace-area">
                    <!-- Сюда динамически подгружаем либо шаблоны, либо холст -->
                    <div id="dynamic-workspace-content" style="width: 100%; height: 100%;"></div>
                </div>
            </div>
        `;
        
        // Выводим имя проекта в шапку страницы
        const projectBadge = document.getElementById('main-project-name');
        if (projectBadge) projectBadge.textContent = appState.projectName;

        // Навешиваем клики на верхние вкладки навигации
        bindHeaderTabs();
    }

    // Функция отрисовки экрана "НАЧАЛО" с карточками
    function loadStartScreen() {
        const contentArea = document.getElementById('dynamic-workspace-content');
        if (!contentArea) return;

        // Проверяем, есть ли уже созданные стены в проекте
        const hasExistingWalls = appState.walls.length > 0;

        contentArea.innerHTML = `
            <div class="templates-section">
                <!-- Кнопка "Продолжить", если проект уже начат -->
                ${hasExistingWalls ? `
                    <div class="continue-project-box">
                        <button id="btn-continue-project" class="continue-action-btn">
                            ↩️ Продолжить планирование помещения (сохранено стен: ${appState.walls.length})
                        </button>
                    </div>
                ` : ''}

                <div class="section-title-bar">
                    <button class="plus-btn">+</button>
                    <!-- Поменяли заголовок текста -->
                    <span>Выберите шаблон помещения</span>
                </div>
                
                <div class="nobilia-grid">
                    <!-- ПОМЕНЯЛИ МЕСТАМИ: 1. Свободное планирование -->
                    <div class="nobilia-card" data-template="free">
                        <div class="card-preview-box">
                            <svg viewBox="0 0 100 100" class="shape-svg">
                                <path d="M30 70 L45 35 L75 40 L65 75 Z" />
                                <path d="M20 80 L35 75 L30 60" style="stroke: #334155; stroke-width: 2; fill: none;" />
                            </svg>
                        </div>
                        <div class="card-label">Свободное планирование помещения</div>
                    </div>

                    <!-- ПОМЕНЯЛИ МЕСТАМИ: 2. Прямоугольник -->
                    <div class="nobilia-card" data-template="rectangle">
                        <div class="card-preview-box">
                            <svg viewBox="0 0 100 100" class="shape-svg"><rect x="25" y="25" width="50" height="50" rx="2" /></svg>
                        </div>
                        <div class="card-label">Прямоугольник</div>
                    </div>

                    <!-- 3. Г-образная форма -->
                    <div class="nobilia-card" data-template="l-shape">
                        <div class="card-preview-box">
                            <span class="badge-alert">!</span>
                            <svg viewBox="0 0 100 100" class="shape-svg"><path d="M30 25 H70 V55 H50 V75 H30 Z" /></svg>
                        </div>
                        <div class="card-label">Г-образная форма</div>
                    </div>

                    <!-- 4. 5-угольная форма -->
                    <div class="nobilia-card" data-template="polygon">
                        <div class="card-preview-box">
                            <span class="badge-alert">!</span>
                            <svg viewBox="0 0 100 100" class="shape-svg"><path d="M30 25 H60 L75 45 V75 H30 Z" /></svg>
                        </div>
                        <div class="card-label">5-угольная форма</div>
                    </div>
                </div>
            </div>
        `;

        // Оживляем клики по карточкам шаблонов
        document.querySelectorAll('.nobilia-card').forEach(card => {
            card.addEventListener('click', () => {
                const newTemplate = card.getAttribute('data-template');
                
                // Если пользователь выбирает НОВЫЙ шаблон, мы полностью очищаем старые стены
                appState.template = newTemplate;
                appState.walls = []; 

                updateHeaderTabsVisual('room');
                loadEditorInterface();
            });
        });

        // Оживляем кнопку продолжения проекта (если она отрендерилась)
        const continueBtn = document.getElementById('btn-continue-project');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                updateHeaderTabsVisual('room');
                loadEditorInterface(); // Просто возвращаем на холст без затирания стен
            });
        }
    }

    // Функция загрузки 2D-редактора стен
    function loadEditorInterface() {
        const contentArea = document.getElementById('dynamic-workspace-content');
        if (!contentArea) return;

        contentArea.innerHTML = `
            <div class="editor-2d-container">
                <aside class="editor-sidebar">
                    <h3>Инструменты 2D</h3>
                    <div class="tool-section">
                        <button class="tool-btn active" id="tool-wall">🧱 Рисовать стены</button>
                        <button class="tool-btn" id="tool-select">🎯 Режим осмотра</button>
                    </div>
                    <div class="info-section">
                        <h4>Параметры комнаты</h4>
                        <p>Высота потолка: <span class="highlight">2700 мм</span></p>
                        <p>Толщина стен: <span class="highlight">200 мм</span></p>
                        <p id="wall-len-info">Длина стены: <span class="highlight">—</span></p>
                    </div>
                    <button class="clear-btn" id="btn-clear-canvas">🗑️ Очистить всё</button>
                    <button class="next-step-btn" id="btn-to-3d">Готово, в 3D →</button>
                </aside>
                <div class="canvas-wrapper">
                    <canvas id="floorplan-canvas"></canvas>
                </div>
            </div>
        `;
        initEditor2D(appState);
    }

    // Функция обновления визуального стиля вкладок в шапке
    function updateHeaderTabsVisual(activeStep) {
        document.querySelectorAll('.step-item').forEach(item => {
            if (item.getAttribute('data-step') === activeStep) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Функция оживления кликов по верхним вкладкам
    function bindHeaderTabs() {
        document.querySelectorAll('.step-item').forEach(item => {
            item.addEventListener('click', () => {
                const targetStep = item.getAttribute('data-step');

                if (targetStep === 'start') {
                    updateHeaderTabsVisual('start');
                    loadStartScreen(); // Возвращает меню карточек (+ кнопку продолжить)
                } else if (targetStep === 'room') {
                    updateHeaderTabsVisual('room');
                    loadEditorInterface(); // Возвращает на холст
                } else if (targetStep === 'furniture') {
                    updateHeaderTabsVisual('furniture');
                    const contentArea = document.getElementById('dynamic-workspace-content');
                    if (contentArea) {
                        contentArea.innerHTML = `
                            <div style="padding:40px; color:#64748b; font-weight:600; text-align:center; width:100%;">
                                🎨 Шаг 3: Модуль 3D-обстановки (Three.js) готов к интеграции!
                            </div>
                        `;
                    }
                }
            });
        });
    }

    // Инициализация при первом запуске главной страницы
    renderMainLayout();
    loadStartScreen();
}
