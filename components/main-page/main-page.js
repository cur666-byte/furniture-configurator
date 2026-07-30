/* components/main-page/main-page.js — Модуль Главной страницы проекта. Отвечает за рендеринг шапки шагов, сетки шаблонов в стиле Nobilia и переключение внутренних экранов. */

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

        const hasExistingWalls = appState.walls.length > 0;

        contentArea.innerHTML = `
            <div class="templates-section">
                ${hasExistingWalls ? `
                    <div class="continue-project-box">
                        <button id="btn-continue-project" class="continue-action-btn">
                            ↩️ Продолжить планирование помещения (сохранено стен: ${appState.walls.length})
                        </button>
                    </div>
                ` : ''}

                <div class="section-title-bar">
                    <button class="plus-btn">+</button>
                    <span>Выберите шаблон помещения</span>
                </div>
                
                <div class="nobilia-grid">
                    <!-- 1. Свободное планирование -->
                    <div class="nobilia-card" data-template="free">
                        <div class="card-preview-box">
                            <svg viewBox="0 0 100 100" class="shape-svg">
                                <path d="M30 70 L45 35 L75 40 L65 75 Z" />
                                <path d="M20 80 L35 75 L30 60" style="stroke: #334155; stroke-width: 2; fill: none;" />
                            </svg>
                        </div>
                        <div class="card-label">Свободное планирование помещения</div>
                    </div>

                    <!-- 2. Прямоугольник -->
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
                appState.template = newTemplate;
                appState.walls = []; // Сбрасываем старые стены при выборе нового шаблона

                updateHeaderTabsVisual('room');
                loadEditorInterface();
            });
        });

        // Оживляем кнопку продолжения проекта
        const continueBtn = document.getElementById('btn-continue-project');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                updateHeaderTabsVisual('room');
                loadEditorInterface();
            });
        }
    }

    // 3. Функция загрузки 2D-редактора стен (ИСПРАВЛЕНО: Чистый fetch разметки из родного editor2d.html)
    function loadEditorInterface() {
        const contentArea = document.getElementById('dynamic-workspace-content');
        if (!contentArea) return;

        // Скачиваем разметку из родного изолированного файла 2D-редактора
        fetch('components/editor2d/editor2d.html')
            .then(response => response.text())
            .then(html => {
                contentArea.innerHTML = html; // Вставляем разметку во фрейм рабочего пространства
                initEditor2D(appState);       // Инициализируем логику черчения из editor2d.js
            })
            .catch(err => console.error('Ошибка загрузки 2D-интерфейса:', err));
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

    // Навешиваем клики на постоянные кнопки шапки
    function bindHeaderTabs() {
        document.querySelectorAll('.step-item').forEach(item => {
            item.addEventListener('click', () => {
                const targetStep = item.getAttribute('data-step');

                if (targetStep === 'start') {
                    updateHeaderTabsVisual('start');
                    loadStartScreen(); 
                } else if (targetStep === 'room') {
                    updateHeaderTabsVisual('room');
                    loadEditorInterface(); 
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
