import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.colors import LinearSegmentedColormap

# Setup the figure and axis
fig, ax = plt.subplots(figsize=(8, 8), facecolor='#0a0f1e')
ax.set_facecolor('#0a0f1e')
ax.set_xlim(-10, 10)
ax.set_ylim(-10, 10)
ax.axis('off')

# Particle properties
num_particles = 100
origins = np.zeros((num_particles, 2))
positions = np.zeros((num_particles, 2))
angles = np.random.uniform(0, 2 * np.pi, num_particles)
speeds = np.random.uniform(0.1, 0.5, num_particles)
velocities = np.column_stack((np.cos(angles) * speeds, np.sin(angles) * speeds))
curvatures = np.random.uniform(-0.05, 0.05, num_particles)
lifetimes = np.zeros(num_particles)
max_lifetimes = np.random.uniform(20, 100, num_particles)

# Tracks and scatter plot
tracks_x = [[] for _ in range(num_particles)]
tracks_y = [[] for _ in range(num_particles)]
colors = ['#FFD700', '#FFA500', '#FF8C00', '#FF4500']
particle_colors = np.random.choice(colors, num_particles)

lines = []
for i in range(num_particles):
    line, = ax.plot([], [], color=particle_colors[i], lw=1.5, alpha=0.8)
    lines.append(line)

def init():
    for line in lines:
        line.set_data([], [])
    return lines

def update(frame):
    global positions, velocities, lifetimes
    
    # Trigger new collision occasionally
    if np.random.random() < 0.02 or frame == 0:
        for i in range(num_particles):
            if lifetimes[i] >= max_lifetimes[i]:
                positions[i] = [0, 0]
                angles[i] = np.random.uniform(0, 2 * np.pi)
                speeds[i] = np.random.uniform(0.1, 0.5)
                velocities[i] = [np.cos(angles[i]) * speeds[i], np.sin(angles[i]) * speeds[i]]
                lifetimes[i] = 0
                tracks_x[i] = []
                tracks_y[i] = []
    
    # Update particles
    for i in range(num_particles):
        if lifetimes[i] < max_lifetimes[i]:
            # Apply magnetic field curvature
            current_angle = np.arctan2(velocities[i, 1], velocities[i, 0])
            new_angle = current_angle + curvatures[i]
            speed = np.linalg.norm(velocities[i])
            velocities[i] = [np.cos(new_angle) * speed, np.sin(new_angle) * speed]
            
            positions[i] += velocities[i]
            tracks_x[i].append(positions[i, 0])
            tracks_y[i].append(positions[i, 1])
            
            # Keep tail length bounded
            if len(tracks_x[i]) > 30:
                tracks_x[i].pop(0)
                tracks_y[i].pop(0)
                
            lifetimes[i] += 1
            
            lines[i].set_data(tracks_x[i], tracks_y[i])
            
            # Fade out
            alpha = max(0, 1 - (lifetimes[i] / max_lifetimes[i]))
            lines[i].set_alpha(alpha)
            
    return lines

ani = animation.FuncAnimation(fig, update, frames=200, init_func=init, blit=True, interval=30)
plt.title("PP Collision Simulation", color="white")
plt.show()
