// Импортируем логику экранов
import { initWelcome } from './components/welcome/welcome.js';
import { initEditor2D } from './components/editor2d/editor2d.js';

// Глобальная база данных текущей сессии (состояние приложения)
const appState = {
    projectName: '',
    roomHeight: 2700,
    wallThickness: 200,
    template: 'rectangle',
    walls: [],    // геометрия комнаты
    furniture: [] // расставленные модули
};

const viewport = document.getElementById('app-viewport');
const projectTitleDisplay = document.getElementById('project-title');

// Функция загрузки приветственного экрана
function loadWelcomeScreen() {
    fetch('components/welcome/welcome.html')
        .then(response => response.text())
        .then(html => {
            viewport.innerHTML = html;
            
            // Запускаем форму приветствия
            initWelcome(appState, () => {
                onWelcomeComplete();
            });
        });
}

// Что происходит, когда сбор данных завершен:
function onWelcomeComplete() {
    // 1. Обновляем имя проекта в шапке
    projectTitleDisplay.textContent = appState.projectName;
    
    // 2. Разблокируем вкладку 2D редактора
    const tab2d = document.getElementById('tab-2d');
    tab2d.removeAttribute('disabled');
    
    // 3. Автоматически переключаем пользователя на экран 2D редактора
    switchScreen('editor2d');
}

// Универсальная функция переключения экранов (вкладок)
function switchScreen(screenId) {
    // Меняем активный класс у кнопок в шапке
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.getAttribute('data-target') === screenId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Динамически подгружаем контент в зависимости от вкладки
    if (screenId === 'welcome') {
        loadWelcomeScreen();
    } 
    else if (screenId === 'editor2d') {
        fetch('components/editor2d/editor2d.html')
            .then(res => res.text())
            .then(html => {
                viewport.innerHTML = html;
                initEditor2D(appState); // запускаем холст и черчение
            });
    }
}

// Настраиваем клики по вкладкам навигации
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Переключаем экран, только если кнопка не заблокирована (not disabled)
        if (!tab.hasAttribute('disabled')) {
            const target = tab.getAttribute('data-target');
            switchScreen(target);
        }
    });
});

// Старт приложения: загружаем экран приветствия
loadWelcomeScreen();
