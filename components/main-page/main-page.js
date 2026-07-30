export function initMainPage(appState) {
    console.log('Главная страница успешно запущена с данными:', appState);
    
    // Выводим имя проекта в шапку страницы
    document.getElementById('main-project-name').textContent = appState.projectName;

    // Сюда мы дальше повесим переключение вкладок 2D/3D внутри главной страницы
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById('editor-viewport').innerHTML = `<div class="empty-notice">Запущен режим: ${target.toUpperCase()}</div>`;
        });
    });
}
