/* components/editor2d/drawer.js — Модуль отрисовки графических элементов холста. Отвечает за рендеринг динамической измерительной сетки, цветных осей координат и фиксированных стрелок размеров стен. */

// УМНАЯ СЕТКА С РАЗРЕЖЕНИЕМ И ЦВЕТНЫМИ ОСЯМИ
export function drawGrid(ctx, canvas, zoom, screenToWorld, worldToScreen, SCALE) {
    let worldStep = 50; // 500 мм базовый шаг
    
    if (worldStep * zoom < 50) worldStep = 100; // 1 метр
    if (worldStep * zoom < 50) worldStep = 200; // 2 метра
    if (worldStep * zoom > 150) worldStep = 10; // 100 мм

    const step = worldStep * zoom;

    ctx.save();
    ctx.font = '10px monospace';

    const topLeftWorld = screenToWorld(0, 0);
    const bottomRightWorld = screenToWorld(canvas.width, canvas.height);

    const startX = Math.floor(topLeftWorld.x / worldStep) * worldStep;
    const endX = Math.ceil(bottomRightWorld.x / worldStep) * worldStep;
    const startY = Math.floor(bottomRightWorld.y / worldStep) * worldStep;
    const endY = Math.ceil(topLeftWorld.y / worldStep) * worldStep;

    // 1. Линии сетки
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.5;
    
    for (let wx = startX; wx <= endX; wx += worldStep) {
        if (Math.round(wx) === 0) continue; 
        const sCoord = worldToScreen(wx, 0);
        ctx.beginPath(); ctx.moveTo(sCoord.x, 0); ctx.lineTo(sCoord.x, canvas.height); ctx.stroke();
    }
    for (let wy = startY; wy <= endY; wy += worldStep) {
        if (Math.round(wy) === 0) continue;
        const sCoord = worldToScreen(0, wy);
        ctx.beginPath(); ctx.moveTo(0, sCoord.y); ctx.lineTo(canvas.width, sCoord.y); ctx.stroke();
    }

    // 2. Цветные полупрозрачные оси координат
    const zeroScreen = worldToScreen(0, 0);

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)'; ctx.lineWidth = 2.5; // Ось Y (Зеленая)
    ctx.beginPath(); ctx.moveTo(zeroScreen.x, 0); ctx.lineTo(zeroScreen.x, canvas.height); ctx.stroke();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; ctx.lineWidth = 2.5; // Ось X (Красная)
    ctx.beginPath(); ctx.moveTo(0, zeroScreen.y); ctx.lineTo(canvas.width, zeroScreen.y); ctx.stroke();

    // 3. Подписи шкал миллиметров
    ctx.fillStyle = '#475569';
    for (let wx = startX; wx <= endX; wx += worldStep) {
        if (Math.round(wx) === 0) continue;
        const sCoord = worldToScreen(wx, 0);
        ctx.fillText(`${wx * SCALE}мм`, sCoord.x + 4, canvas.height - 12);
    }
    for (let wy = startY; wy <= endY; wy += worldStep) {
        if (Math.round(wy) === 0) continue;
        const sCoord = worldToScreen(0, wy);
        ctx.fillText(`${wy * SCALE}мм`, 12, sCoord.y - 4);
    }

    // Маркер центра координат (0,0)
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(zeroScreen.x, zeroScreen.y, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.font = 'bold 11px monospace';
    ctx.fillText("ЦЕНТР (0,0)", zeroScreen.x + 8, zeroScreen.y - 8);
    ctx.restore();
}

// ПРОФЕССИОНАЛЬНЫЕ РАЗМЕРНЫЕ ЛИНИИ (Вынесены наружу!)
export function drawFixedDimensionLine(ctx, worldToScreen, wx1, wy1, wx2, wy2, valueText) {
    const s1 = worldToScreen(wx1, wy1);
    const s2 = worldToScreen(wx2, wy2);

    const offset = 25; 
    let angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
    
    // ИСПРАВЛЕНО: Изменили знак перпендикуляра с минуса на плюс, чтобы вынос шел вверх/наружу при рисовании слева направо
    const pX = Math.sin(angle) * offset;
    const pY = -Math.cos(angle) * offset;

    const rx1 = s1.x + pX; const ry1 = s1.y + pY;
    const rx2 = s2.x + pX; const ry2 = s2.y + pY;

    ctx.save();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(rx1, ry1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s2.x, s2.y); ctx.lineTo(rx2, ry2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();

    const tickLen = 5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx1 - Math.cos(angle + Math.PI/4) * tickLen, ry1 - Math.sin(angle + Math.PI/4) * tickLen);
    ctx.lineTo(rx1 + Math.cos(angle + Math.PI/4) * tickLen, ry1 + Math.sin(angle + Math.PI/4) * tickLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rx2 - Math.cos(angle + Math.PI/4) * tickLen, ry2 - Math.sin(angle + Math.PI/4) * tickLen);
    ctx.lineTo(rx2 + Math.cos(angle + Math.PI/4) * tickLen, ry2 + Math.sin(angle + Math.PI/4) * tickLen);
    ctx.stroke();

    const midX = (rx1 + rx2) / 2; const midY = (ry1 + ry2) / 2;
    ctx.translate(midX, midY);
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle -= Math.PI;
    ctx.rotate(angle);

    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const textWidth = ctx.measureText(valueText).width + 6;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-textWidth / 2, -13, textWidth, 12);
    ctx.fillStyle = '#0f172a'; ctx.fillText(valueText, 0, -2);
    ctx.restore();
}


// ПРОФЕССИОНАЛЬНЫЕ РАЗМЕРНЫЕ ЛИНИИ (Фиксированный размер на экране)
export function drawFixedDimensionLine(ctx, worldToScreen, wx1, wy1, wx2, wy2, valueText) {
    const s1 = worldToScreen(wx1, wy1);
    const s2 = worldToScreen(wx2, wy2);

    const offset = 25; 
    let angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
    
    const pX = -Math.sin(angle) * offset;
    const pY = Math.cos(angle) * offset;

    const rx1 = s1.x + pX; const ry1 = s1.y + pY;
    const rx2 = s2.x + pX; const ry2 = s2.y + pY;

    ctx.save();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(rx1, ry1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s2.x, s2.y); ctx.lineTo(rx2, ry2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();

    const tickLen = 5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx1 - Math.cos(angle + Math.PI/4) * tickLen, ry1 - Math.sin(angle + Math.PI/4) * tickLen);
    ctx.lineTo(rx1 + Math.cos(angle + Math.PI/4) * tickLen, ry1 + Math.sin(angle + Math.PI/4) * tickLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rx2 - Math.cos(angle + Math.PI/4) * tickLen, ry2 - Math.sin(angle + Math.PI/4) * tickLen);
    ctx.lineTo(rx2 + Math.cos(angle + Math.PI/4) * tickLen, ry2 + Math.sin(angle + Math.PI/4) * tickLen);
    ctx.stroke();

    const midX = (rx1 + rx2) / 2; const midY = (ry1 + ry2) / 2;
    ctx.translate(midX, midY);
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle -= Math.PI;
    ctx.rotate(angle);

    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const textWidth = ctx.measureText(valueText).width + 6;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-textWidth / 2, -13, textWidth, 12);
    ctx.fillStyle = '#0f172a'; ctx.fillText(valueText, 0, -2);
    ctx.restore();
}
