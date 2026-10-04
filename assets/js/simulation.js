const canvas = document.getElementById('collision-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let protons = [];
let animationId;
let isRunning = true;
let collisionActive = false;

// Golden ratio phi = 1.61803398875
const phi = 1.61803398875;

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    // Very elongated landscape using golden ratio squared (~2.618)
    canvas.height = canvas.width / (phi * phi); 
}

window.addEventListener('resize', resize);

class Proton {
    constructor(direction) {
        this.direction = direction; // 1 for left-to-right, -1 for right-to-left
        this.y = canvas.height / 2;
        this.x = direction === 1 ? 0 : canvas.width;
        this.speed = 10;
        this.color = '#ff0000'; // Red protons
    }
    
    update() {
        this.x += this.speed * this.direction;
    }
    
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Draw a small tail
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - (this.speed * 3 * this.direction), this.y);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

class Particle {
    constructor(x, y) {
        this.originX = x;
        this.originY = y;
        this.x = x;
        this.y = y;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.curvature = (Math.random() - 0.5) * 0.05;
        this.life = 0;
        this.maxLife = Math.random() * 100 + 50;
        this.path = [{x: this.x, y: this.y}];
        
        // Using grey background, so darker/visible track colors
        const colors = ['#b8860b', '#cd853f', '#a0522d', '#8b0000', '#00008b', '#006400'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        const currentAngle = Math.atan2(this.vy, this.vx);
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const newAngle = currentAngle + this.curvature;
        
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
        
        this.x += this.vx;
        this.y += this.vy;
        
        this.path.push({x: this.x, y: this.y});
        if (this.path.length > 50) this.path.shift();
        
        this.life++;
    }

    draw() {
        if (this.path.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        const alpha = 1 - (this.life / this.maxLife);
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha > 0 ? alpha : 0;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

function initProtons() {
    protons = [new Proton(1), new Proton(-1)];
    collisionActive = false;
    particles = [];
}

function explode(x, y) {
    const numParticles = Math.floor(Math.random() * 50) + 50;
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(x, y));
    }
    // Visual flash
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function animate() {
    // Grey background
    ctx.fillStyle = 'rgba(224, 224, 224, 0.4)'; // light grey trail effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!collisionActive) {
        // Move and draw protons
        let collided = false;
        protons.forEach(p => {
            p.update();
            p.draw();
        });
        
        // Check if they met in the middle
        if (protons.length > 1 && protons[0].x >= protons[1].x) {
            collided = true;
        }
        
        if (collided) {
            collisionActive = true;
            explode(canvas.width / 2, canvas.height / 2);
            protons = [];
        }
    } else {
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            
            if (particles[i].life >= particles[i].maxLife || 
                particles[i].x < 0 || particles[i].x > canvas.width || 
                particles[i].y < 0 || particles[i].y > canvas.height) {
                particles.splice(i, 1);
            }
        }
        
        // Restart cycle if all particles are dead
        if (particles.length === 0) {
            initProtons();
        }
    }
    
    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

resize();
initProtons();
animate();

canvas.addEventListener('click', () => {
    initProtons();
});
