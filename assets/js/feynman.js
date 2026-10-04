const fCanvas = document.getElementById('feynman-canvas');
const fCtx = fCanvas.getContext('2d');

function drawWavyLine(ctx, x1, y1, x2, y2, amplitude, frequency) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    
    for (let i = 0; i < length; i++) {
        const x = i;
        const y = Math.sin(i * frequency) * amplitude;
        ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    ctx.restore();
}

function drawCurlyLine(ctx, x1, y1, x2, y2, radius, loops) {
    // A simplified curly line for gluons
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    
    ctx.beginPath();
    const step = length / loops;
    for (let i = 0; i <= loops; i++) {
        const x = i * step;
        ctx.arc(x - step/2, 0, step/2, 0, Math.PI, false);
    }
    
    ctx.stroke();
    ctx.restore();
}

function generateRandomDiagram() {
    fCtx.clearRect(0, 0, fCanvas.width, fCanvas.height);
    fCtx.lineWidth = 2;
    fCtx.strokeStyle = '#333';
    
    const types = ['s-channel', 't-channel', 'loop'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const w = fCanvas.width;
    const h = fCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    
    // Draw incoming fermions (straight lines with arrows)
    const drawArrowLine = (x1, y1, x2, y2) => {
        fCtx.beginPath();
        fCtx.moveTo(x1, y1);
        fCtx.lineTo(x2, y2);
        fCtx.stroke();
        
        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        
        fCtx.beginPath();
        fCtx.moveTo(mx, my);
        fCtx.lineTo(mx - 8 * Math.cos(angle - Math.PI/6), my - 8 * Math.sin(angle - Math.PI/6));
        fCtx.lineTo(mx - 8 * Math.cos(angle + Math.PI/6), my - 8 * Math.sin(angle + Math.PI/6));
        fCtx.fill();
    };

    if (type === 's-channel') {
        // e+ e- -> mu+ mu-
        drawArrowLine(cx - 100, cy + 80, cx - 40, cy);
        drawArrowLine(cx - 40, cy, cx - 100, cy - 80);
        
        drawWavyLine(fCtx, cx - 40, cy, cx + 40, cy, 5, 0.2); // Photon
        
        drawArrowLine(cx + 40, cy, cx + 100, cy + 80);
        drawArrowLine(cx + 100, cy - 80, cx + 40, cy);
    } else if (type === 't-channel') {
        // e- e- -> e- e-
        drawArrowLine(cx - 80, cy - 80, cx, cy - 40);
        drawArrowLine(cx, cy - 40, cx + 80, cy - 80);
        
        drawArrowLine(cx - 80, cy + 80, cx, cy + 40);
        drawArrowLine(cx, cy + 40, cx + 80, cy + 80);
        
        drawWavyLine(fCtx, cx, cy - 40, cx, cy + 40, 5, 0.2);
    } else {
        // Self-energy / loop
        drawArrowLine(cx - 100, cy, cx - 40, cy);
        drawArrowLine(cx + 40, cy, cx + 100, cy);
        
        // Loop
        fCtx.beginPath();
        fCtx.arc(cx, cy, 40, 0, Math.PI * 2);
        fCtx.stroke();
        
        // Photon inside
        drawWavyLine(fCtx, cx - 40, cy, cx + 40, cy, 5, 0.2);
    }
}

// Ensure golden ratio for this canvas too
function resizeFeynman() {
    fCanvas.width = fCanvas.parentElement.clientWidth;
    fCanvas.height = fCanvas.width / 1.61803398875;
    generateRandomDiagram();
}

window.addEventListener('resize', resizeFeynman);
resizeFeynman();
fCanvas.addEventListener('click', generateRandomDiagram);
