import { initEditor2D } from '../editor2d/editor2d.js';

export function initMainPage(appState) {
    const mainPageContainer = document.getElementById('main-page-step');
    if (!mainPageContainer) return;

    // Вставляем базовый шаблон главной страницы
    mainPageContainer.innerHTML = `
        <div class="main-page-layout">
            <header class="main-header">
                <div class="logo">📐 FurnitureCAD</div>
                <nav class="steps-nav">
                    <div class="step-item active" data-step="start">
                        <span class="step-num">🏠</span> STAPT
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
            </div>
        </div>
    `;

    // Выводим имя проекта в шапку страницы
    document.getElementById('main-project-name').textContent = appState.projectName;

    const cards = document.querySelectorAll('.nobilia-card');
    const templatesSection = document.querySelector('.templates-section');
    const workspaceArea = document.querySelector('.workspace-area');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            appState.template = card.getAttribute('data-template');

            // 1. Переключаем шаг на "ПОМЕЩЕНИЕ"
            const stepStart = document.querySelector('[data-step="start"]');
            const stepRoom = document.querySelector('[data-step="room"]');
            if (stepStart) stepStart.classList.remove('active');
            if (stepRoom) stepRoom.classList.add('active');

            // 2. Убираем сетку шаблонов
            if (templatesSection) templatesSection.remove();

            // 3. Вставляем разметку 2D-редактора
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

            // 4. Запускаем холст и логику рисования
            initEditor2D(appState);
        });
    });
}
