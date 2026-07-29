// Находим все элементы интерфейса
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const depthInput = document.getElementById('depth');
const materialSelect = document.getElementById('material');
const calculateBtn = document.getElementById('calculate-btn');
const priceResult = document.getElementById('result-price');
const previewArea = document.getElementById('furniture-preview');

// Базовая функция расчета стоимости шкафа
function calculatePrice() {
    const width = parseFloat(widthInput.value) / 1000; // переводим в метры
    const height = parseFloat(heightInput.value) / 1000;
    const depth = parseFloat(depthInput.value) / 1000;
    
    // Считаем условную площадь панелей шкафа (передняя, задняя, боковые, верх, низ)
    const surfaceArea = 2 * (width * height) + 2 * (height * depth) + 2 * (width * depth);
    
    // Задаем стоимость квадратного метра в зависимости от материала
    let materialPricePerMeter = 1500; // Белый базовый
    if (materialSelect.value === 'oak') materialPricePerMeter = 2500;
    if (materialSelect.value === 'wenge') materialPricePerMeter = 3000;
    
    // Рассчитываем итоговую стоимость с округлением
    const totalPrice = Math.round(surfaceArea * materialPricePerMeter + 5000); // 5000 — базовая стоимость сборки/фурнитуры
    
    // Выводим результат на экран
    priceResult.textContent = `Стоимость: ${totalPrice.toLocaleString('ru-RU')} ₽`;
}

// Навешиваем событие клика на кнопку
calculateBtn.addEventListener('click', calculatePrice);

// Считаем цену сразу при загрузке страницы
calculatePrice();
