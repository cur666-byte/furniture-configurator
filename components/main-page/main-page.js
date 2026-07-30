import { initEditor2D } from '../editor2d/editor2d.js';

export function initMainPage(appState) {
    // Выводим имя проекта в шапку страницы
    const projectBadge = document.getElementById('main-project-name');
    if (projectBadge) projectBadge.textContent = appState.projectName;

    const cards = document.querySelectorAll('.nobilia-card');
    const templatesSection = document.querySelector('.templates-section');
    const workspaceArea = document.querySelector('.workspace-area');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const selectedTemplate = card.getAttribute('data-template');
            appState.template = selectedTemplate;

            console.log('Выбран шаблон помещения:', selectedTemplate);

            // 1. Переключаем визуальный шаг в шапке на "ПОМЕЩЕНИЕ"
            const stepStart = document.querySelector('[data-step="start"]');
            const stepRoom = document.querySelector('[data-step="room"]');
            if (stepStart) stepStart.classList.remove('active');
            if (stepRoom) stepRoom.classList.add('active');

            // 2. Очищаем зону шаблонов и вставляем туда разметку 2D-редактора
            if (templatesSection) templatesSection.remove();

            // Вставляем разметку полноценного 2D-редактора
            workspaceArea.innerHTML = `
                <div class="editor-2d-container">
                    <!-- Боковая панель инструментов (как у аналогов) -->
                    <aside class="editor-sidebar">
                        <h3>Инструменты 2D</h3>
                        <div class="tool-section">
                            <button class="tool-btn active" id="tool-wall">🧱 Рисовать стены</button>
                            <button class="tool-btn" id="tool-select" disabled>🎯 Выделение</button>
                        </div>
                        <div class="info-section">
                            <h4>Параметры</h4>
                            <p>Высота потолка: 2700 мм</p>
                            <p>Толщина стен: 200 мм</p>
                        </div>
                        <button class="clear-btn" id="btn-clear-canvas">🗑️ Очистить всё</button>
                        <button class="next-step-btn" id="btn-to-3d">Готово, в 3D →</button>
                    </aside>

                    <!-- Область интерактивного чертежа -->
                    <div class="canvas-wrapper">
                        <canvas id="floorplan-canvas"></canvas>
                    </div>
                </div>
            `;

            // 3. Запускаем холст и логику рисования стен
            initEditor2D(appState);
        });
    });
}
