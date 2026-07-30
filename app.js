import { initWelcome } from './components/welcome/welcome.js';
import { initMainPage } from './components/main-page/main-page.js';

const appState = {
    projectName: '',
    roomHeight: 2700,
};

const welcomeStep = document.getElementById('welcome-step');
const mainPageStep = document.getElementById('main-page-step');

function startApp() {
    // Инициализируем микро-окно приветствия
    initWelcome(appState, () => {
        // Когда анкета заполнена:
        welcomeStep.classList.add('hidden');     // Прячем окно приветствия
        mainPageStep.classList.remove('hidden'); // Показываем Главную страницу
        
        // Запускаем логику Главной Страницы
        initMainPage(appState);
    });
}

startApp();
