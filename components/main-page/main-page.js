export function initMainPage(appState) {
    const mainPageContainer = document.getElementById('main-page-step');
    if (!mainPageContainer) return;

    // Вставляем структуру главной страницы со всеми карточками шаблонов комнат
    mainPageContainer.innerHTML = `
        <div class="main-page-layout">
            <!-- Верхняя панель шагов в стиле Nobilia -->
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

            <!-- Основная рабочая зона выбора шаблонов -->
            <div class="workspace-area">
                <div class="templates-section">
                    <div class="section-title-bar">
                        <button class="plus-btn">+</button>
                        <span>Начните с планирования этажа</span>
                    </div>
                    
                    <!-- Сетка крупных карточек с формами комнат -->
                    <div class="nobilia-grid">
                        
                        <!-- Карточка 1: Прямоугольник -->
                        <div class="nobilia-card" data-template="rectangle">
                            <div class="card-preview-box">
                                <svg viewBox="0 0 100 100" class="shape-svg">
                                    <rect x="25" y="25" width="50" height="50" rx="2" />
                                </svg>
                            </div>
                            <div class="card-label">Прямоугольник</div>
                        </div>

                        <!-- Карточка 2: Свободное планирование -->
                        <div class="nobilia-card" data-template="free">
                            <div class="card-preview-box">
                                <svg viewBox="0 0 100 100" class="shape-svg">
                                    <path d="M30 70 L45 35 L75 40 L65 75 Z" />
                                    <path d="M20 80 L35 75 L30 60" class="pencil-draw" />
                                </svg>
                            </div>
                            <div class="card-label">Свободное планирование помещения</div>
                        </div>

                        <!-- Карточка 3: Г-образная форма -->
                        <div class="nobilia-card" data-template="l-shape">
                            <div class="card-preview-box">
                                <span class="badge-alert">!</span>
                                <svg viewBox="0 0 100 100" class="shape-svg">
                                    <path d="M30 25 H70 V55 H50 V75 H30 Z" />
                                </svg>
                            </div>
                            <div class="card-label">Г-образная форма</div>
                        </div>

                        <!-- Карточка 4: 5-угольная форма -->
                        <div class="nobilia-card" data-template="polygon">
                            <div class="card-preview-box">
                                <span class="badge-alert">!</span>
                                <svg viewBox="0 0 100 100" class="shape-svg">
                                    <path d="M30 25 H60 L75 45 V75 H30 Z" />
                                </svg>
                            </div>
                            <div class="card-label">5-угольная форма</div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    `;

    // Выводим имя проекта в правый угол шапки
    document.getElementById('main-project-name').textContent = appState.projectName;

    // Вешаем обработчики кликов на карточки шаблонов
    const cards = document.querySelectorAll('.nobilia-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const selectedTemplate = card.getAttribute('data-template');
            appState.template = selectedTemplate;
            
            alert(`Выбран шаблон: ${selectedTemplate.toUpperCase()}\nНа следующем шаге мы откроем соответствующий редактор!`);
            console.log('Текущее состояние проекта:', appState);
        });
    });
}
