const canvas = document.getElementById('collision-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animationId;
let isRunning = true;

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 300; // Fixed height or adjust based on need
}

window.addEventListener('resize', resize);

class Particle {
    constructor(x, y) {
        this.originX = x;
        this.originY = y;
        this.x = x;
        this.y = y;
        
        // Random angle for isotropic emission
        const angle = Math.random() * Math.PI * 2;
        // Random speed, favoring high speeds for jets
        const speed = Math.random() * 5 + 2;
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Add a slight curvature (magnetic field effect)
        this.curvature = (Math.random() - 0.5) * 0.05;
        
        // Lifetime
        this.life = 0;
        this.maxLife = Math.random() * 100 + 50;
        
        // Path for drawing trails
        this.path = [{x: this.x, y: this.y}];
        
        // Color - mostly yellow/orange like CMS/ATLAS event displays
        const colors = ['#FFD700', '#FFA500', '#FF8C00', '#FF4500', '#f4f4f4', '#87CEFA'];
        // 80% chance of being yellow-ish
        this.color = Math.random() > 0.2 ? colors[Math.floor(Math.random() * 4)] : colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        // Apply curvature
        const currentAngle = Math.atan2(this.vy, this.vx);
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const newAngle = currentAngle + this.curvature;
        
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
        
        this.x += this.vx;
        this.y += this.vy;
        
        this.path.push({x: this.x, y: this.y});
        
        // Keep path from getting too long for performance
        if (this.path.length > 50) {
            this.path.shift();
        }
        
        this.life++;
    }

    draw() {
        if (this.path.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        // Fade out based on life
        const alpha = 1 - (this.life / this.maxLife);
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha > 0 ? alpha : 0;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

function collide() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Generate new particles for a collision event
    const numParticles = Math.floor(Math.random() * 50) + 50; // 50-100 particles
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(centerX, centerY));
    }
}

function animate() {
    // Dark background for event display
    ctx.fillStyle = 'rgba(10, 15, 30, 0.3)'; // Trail effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Randomly trigger new collisions
    if (Math.random() < 0.02) {
        collide();
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        
        if (particles[i].life >= particles[i].maxLife || 
            particles[i].x < 0 || particles[i].x > canvas.width || 
            particles[i].y < 0 || particles[i].y > canvas.height) {
            particles.splice(i, 1);
        }
    }
    
    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

// Initial setup
resize();
// Trigger first collision
collide();
animate();

// Optional interactive part: click to collide
canvas.addEventListener('click', () => {
    collide();
});
