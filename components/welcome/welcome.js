export function initWelcome(appState, onComplete) {
    const cards = document.querySelectorAll('.template-card');
    const startBtn = document.getElementById('start-project-btn');
    
    // По умолчанию выберем первую карточку
    let selectedTemplate = 'empty';
    const defaultCard = document.querySelector('[data-template="empty"]');
    if (defaultCard) defaultCard.classList.add('selected');

    // Навешиваем клики на карточки выбора шаблона комнаты
    cards.forEach(card => {
        card.addEventListener('click', () => {
            // Снимаем выделение со всех карточек
            cards.forEach(c => c.classList.remove('selected'));
            
            // Добавляем выделение текущей
            card.classList.add('selected');
            selectedTemplate = card.getAttribute('data-template');
        });
    });

    // Клик по главной кнопке "Начать"
    startBtn.addEventListener('click', () => {
        // Записываем данные в глобальное состояние приложения
        appState.projectName = document.getElementById('project-name').value || 'Новый проект';
        appState.roomHeight = parseInt(document.getElementById('room-height').value) || 2700;
        appState.wallThickness = parseInt(document.getElementById('wall-thickness').value) || 200;
        appState.template = selectedTemplate;

        // Если выбран готовый шаблон "Прямоугольник", сразу генерируем базовые стены!
        if (selectedTemplate === 'rectangle') {
            // Создаем коробку 4000мм на 3000мм (в условных координатах холста, например центр экрана)
            appState.walls = [
                { x1: 100, y1: 100, x2: 500, y2: 100 }, // Верхняя стена
                { x1: 500, y1: 100, x2: 500, y2: 400 }, // Правая
                { x1: 500, y1: 400, x2: 100, y2: 400 }, // Нижня
                { x1: 100, y1: 400, x2: 100, y2: 100 }  // Левая
            ];
        }

        console.log('Проект запущен с параметрами:', appState);
        
        // Сигнализируем главному модулю о переходе на шаг 2
        onComplete();
    });
}
