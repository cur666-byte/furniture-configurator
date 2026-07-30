import { initEditor2D } from '../editor2d/editor2d.js';

export function initMainPage(appState) {
    // Выводим имя проекта в шапку страницы
    const projectBadge = document.getElementById('main-project-name');
    if (projectBadge) projectBadge.textContent = appState.projectName;

    // Сохраняем разметку стартовых шаблонов комнат в переменную
    const startScreenHTML = `
        <div class="templates-section">
            <div class="section-title-bar">
                <button class="plus-btn">+</button>
                <span>Начните с планирования этажа</span>
            </div>
            <div class="nobilia-grid">
                <div class="nobilia-card" data-template="rectangle">
                    <div class="card-preview-box">
                        <svg viewBox="0 0 100 100" class="shape-svg"><rect x="25" y="25" width="50" height="50" rx="2" /></svg>
                    </div>
                    <div class="card-label">Прямоугольник</div>
                </div>
                <div class="nobilia-card" data-template="free">
                    <div class="card-preview-box">
                        <svg viewBox="0 0 100 100" class="shape-svg">
                            <path d="M30 70 L45 35 L75 40 L65 75 Z" />
                            <path d="M20 80 L35 75 L30 60" style="stroke: #334155; stroke-width: 2; fill: none;" />
                        </svg>
                    </div>
                    <div class="card-label">Свободное планирование</div>
                </div>
                <div class="nobilia-card" data-template="l-shape">
                    <div class="card-preview-box">
                        <span class="badge-alert">!</span>
                        <svg viewBox="0 0 100 100" class="shape-svg"><path d="M30 25 H70 V55 H50 V75 H30 Z" /></svg>
                    </div>
                    <div class="card-label">Г-образная форма</div>
                </div>
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

    // Функция загрузки 2D-редактора
    function loadEditorInterface() {
        const workspaceArea = document.querySelector('.workspace-area');
        if (!workspaceArea) return;

        workspaceArea.innerHTML = `
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

    // Функция переключения подсветки кнопок в шапке
    function updateHeaderTabs(activeStep) {
        document.querySelectorAll('.step-item').forEach(item => {
            const stepName = item.getAttribute('data-step') || item.getAttribute('data-tab');
            if (stepName === activeStep) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Привязка кликов к стартовым карточкам
    function bindCardClicks() {
        document.querySelectorAll('.nobilia-card').forEach(card => {
            card.addEventListener('click', () => {
                appState.template = card.getAttribute('data-template');
                updateHeaderTabs('room');
                loadEditorInterface();
            });
        });
    }

    // Оживляем верхние кнопки навигации (работают по клику в любой момент)
    document.querySelectorAll('.step-item').forEach(item => {
        item.addEventListener('click', () => {
            const targetStep = item.getAttribute('data-step') || item.getAttribute('data-tab');
            const workspaceArea = document.querySelector('.workspace-area');
            if (!workspaceArea) return;

            if (targetStep === 'start') {
                updateHeaderTabs('start');
                workspaceArea.innerHTML = startScreenHTML;
                bindCardClicks(); // Перепривязываем клики к карточкам
            } else if (targetStep === 'room') {
                updateHeaderTabs('room');
                loadEditorInterface(); // Перезапускаем холст
            } else if (targetStep === 'furniture') {
                updateHeaderTabs('furniture');
                workspaceArea.innerHTML = `
                    <div style="padding:40px; color:#64748b; font-weight:600; text-align:center; width:100%;">
                        🎨 Шаг 3: Модуль 3D-обстановки (Three.js) готов к интеграции!
                    </div>
                `;
            }
        });
    });

    // Самый первый запуск приложения: вешаем обработчики на карточки
    bindCardClicks();
}
