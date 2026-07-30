import { initWelcome } from './components/welcome/welcome.js';
import { initEditor2D } from './components/editor2d/editor2d.js';

// Глобальное состояние приложения
const appState = {
    projectName: '',
    roomHeight: 2700,
    wallThickness: 200,
    template: 'empty',
    walls: [],
    furniture: []
};

const viewport = document.getElementById('app-viewport');
const welcomeOverlay = document.getElementById('welcome-overlay');
const projectTitleDisplay = document.getElementById('project-title');

// Инициализация приложения
function initApp() {
    // 1. Сразу загружаем 2D редактор в рабочую область на задний план
    fetch('components/editor2d/editor2d.html')
        .then(res => res.text())
        .then(html => {
            viewport.innerHTML = html;
            initEditor2D(appState);
            
            // 2. Параллельно открываем поверх модальное окно приветствия
            loadWelcomeModal();
        });
}

// Загрузка приветственного окна-анкеты
function loadWelcomeModal() {
    fetch('components/welcome/welcome.html')
        .then(response => response.text())
        .then(html => {
            welcomeOverlay.innerHTML = html;
            
            // Запускаем сбор анкетных данных
            initWelcome(appState, () => {
                onWelcomeComplete();
            });
        });
}

// Что происходит, когда пользователь заполнил анкету и нажал "Начать":
function onWelcomeComplete() {
    // Обновляем название в шапке
    projectTitleDisplay.textContent = appState.projectName;
    
    // Скрываем модальное окно (удаляем его из HTML)
    welcomeOverlay.style.opacity = '0';
    setTimeout(() => {
        welcomeOverlay.remove();
    }, 300);
    
    // Переинициализируем 2D-редактор, чтобы он отрисовал шаблон (если выбран прямоугольник)
    initEditor2D(appState);
}

// Навигация по вкладкам (между 2D и будущим 3D)
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (!tab.hasAttribute('disabled')) {
            const target = tab.getAttribute('data-target');
            
            // Переключаем активную кнопку в меню
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Логика переключения
            if (target === 'editor2d') {
                initApp(); // Перезапустит редактор с текущим стейтом
            } else if (target === 'editor3d') {
                viewport.innerHTML = `<div style="padding:40px; color:#64748b;">🎨 Здесь скоро будет Three.js 3D-сцена!</div>`;
            }
        }
    });
});

// Запуск всего приложения при загрузке страницы
initApp();
