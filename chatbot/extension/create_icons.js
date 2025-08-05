// 简单的图标生成脚本，可以在浏览器控制台中运行

// 在浏览器控制台中执行以下代码来生成图标：

function createIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 创建渐变
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#4285f4');
    gradient.addColorStop(1, '#34a853');
    
    // 平行四边形的尺寸和偏移
    const width = size * 0.8;
    const height = size * 0.6;
    const skew = size * 0.15; // 倾斜偏移
    const startX = (size - width) / 2;
    const startY = (size - height) / 2;
    
    // 绘制平行四边形 (横向倾斜)
    ctx.beginPath();
    ctx.moveTo(startX, startY + height * 0.3);  // 左上
    ctx.lineTo(startX + width - skew, startY);   // 右上
    ctx.lineTo(startX + width, startY + height * 0.7);  // 右下
    ctx.lineTo(startX + skew, startY + height);  // 左下
    ctx.closePath();
    
    // 填充渐变
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 描边
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.stroke();
    
    // 绘制翻译箭头
    ctx.strokeStyle = 'white';
    ctx.lineWidth = Math.max(3, size * 0.06);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const centerX = size / 2;
    const centerY = size / 2;
    const arrowSize = size * 0.12;
    const arrowOffset = size * 0.15;
    
    // 左箭头 (<)
    ctx.beginPath();
    ctx.moveTo(centerX - arrowOffset + arrowSize, centerY - arrowSize * 0.7);
    ctx.lineTo(centerX - arrowOffset, centerY - arrowSize * 0.2);
    ctx.lineTo(centerX - arrowOffset + arrowSize, centerY + arrowSize * 0.3);
    ctx.stroke();
    
    // 右箭头 (>)
    ctx.beginPath();
    ctx.moveTo(centerX + arrowOffset - arrowSize, centerY + arrowSize * 0.3);
    ctx.lineTo(centerX + arrowOffset, centerY + arrowSize * 0.8);
    ctx.lineTo(centerX + arrowOffset - arrowSize, centerY + arrowSize * 1.3);
    ctx.stroke();
    
    // 中间连接线
    ctx.lineWidth = Math.max(2, size * 0.04);
    ctx.beginPath();
    ctx.moveTo(centerX - arrowOffset + arrowSize * 0.5, centerY + arrowSize * 0.1);
    ctx.lineTo(centerX + arrowOffset - arrowSize * 0.5, centerY + arrowSize * 0.6);
    ctx.stroke();
    
    return canvas;
}

function downloadIcon(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 生成并下载图标
const icon16 = createIcon(16);
const icon48 = createIcon(48);  
const icon128 = createIcon(128);

downloadIcon(icon16, 'icon16.png');
downloadIcon(icon48, 'icon48.png');
downloadIcon(icon128, 'icon128.png');

console.log('图标文件已生成并下载');