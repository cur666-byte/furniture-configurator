// Импортируем HTML-код как чистые текстовые строки (флаг ?raw)
import welcomeHTML from './components/welcome/welcome.html?raw';
import mainPageHTML from './components/main-page/main-page.html?raw';

// Импортируем логику инициализации скриптов
import { initWelcome } from './components/welcome/welcome.js';
import { initMainPage } from './components/main-page/main-page.js';

// Глобальное состояние сессии
const appState = {
    projectName: '',
    template: 'empty',
    walls: [],
    furniture: []
};

const welcomeContainer = document.getElementById('welcome-step');
const mainPageContainer = document.getElementById('main-page-step');

function startApp() {
    if (!welcomeContainer || !mainPageContainer) return;

    // 1. Вставляем разметку приветствия из родного файла и запускаем скрипт
    welcomeContainer.innerHTML = welcomeHTML;
    
    initWelcome(appState, () => {
        // Логика, которая сработает ПОСЛЕ создания проекта:
        
        // Переносим разметку главной страницы из её файла в контейнер
        mainPageContainer.innerHTML = mainPageHTML;
        
        // Скрываем приветствие, показываем рабочую зону
        welcomeContainer.classList.add('hidden');
        mainPageContainer.classList.remove('hidden');
        
        // Активируем логику главной страницы и сетки карточек
        initMainPage(appState);
    });
}

document.addEventListener('DOMContentLoaded', startApp);
