import { initWelcome } from './components/welcome/welcome.js';
import { initMainPage } from './components/main-page/main-page.js';

// Глобальное состояние (убрали лишние свойства)
const appState = {
    projectName: '',
    template: 'empty'
};

// Проверяем наличие элементов перед запуском, чтобы избежать падения скрипта
const welcomeStep = document.getElementById('welcome-step');
const mainPageStep = document.getElementById('main-page-step');

function startApp() {
    if (!welcomeStep || !mainPageStep) {
        console.error("Критическая ошибка: Корневые контейнеры не найдены в index.html!");
        return;
    }

    // Запускаем окно приветствия
    initWelcome(appState, () => {
        // Логика, которая сработает ПОСЛЕ нажатия кнопки "Создать проект"
        welcomeStep.classList.add('hidden');     // Прячем окно приветствия
        mainPageStep.classList.remove('hidden'); // Показываем Главную страницу
        
        // Передаем управление главной странице
        initMainPage(appState);
    });
}

// Запускаем приложение, когда структура страницы полностью готова
document.addEventListener('DOMContentLoaded', startApp);
