/**
 * ============================================================================
 * SPACE DEFENDER - 2D COMPUTER GRAPHICS MINI PROJECT
 * ============================================================================
 * 
 * Demonstrating Core Computer Graphics (CG) Concepts:
 * 1. 2D Coordinate System & Canvas Context Setup
 * 2. 2D Transformations: Translation (Positioning), Rotation (Asteroid Tumbling), Scaling (Particles & Thrusters)
 * 3. Animation Loop & Delta Timing (requestAnimationFrame)
 * 4. Collision Detection Algorithms:
 *    - Circle-Distance Collision Math (dx^2 + dy^2 <= (r1 + r2)^2)
 *    - Axis-Aligned Bounding Box (AABB) Collision
 * 5. Screen Boundary Clipping & Clipping Regions
 * 6. Procedural Geometry & Vector Shape Rendering (Asteroids, Ships, Stars)
 * 
 * ============================================================================
 */

// Global Game State Constants & Enums
const GAME_STATES = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

// Main Game Engine Object
class SpaceDefenderEngine {
    constructor() {
        // --------------------------------------------------------------------
        // 1. CANVAS & CONTEXT SETUP (2D Coordinate System Initialization)
        // --------------------------------------------------------------------
        this.canvas = document.getElementById('gameCanvas');
        /** @type {CanvasRenderingContext2D} */
        this.ctx = this.canvas.getContext('2d');

        // Internal Logical Resolution (Maintains crisp aspect ratio)
        this.width = 1000;
        this.height = 750;

        // Apply Logical Resolution to Canvas Buffer
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Responsive Scaling Handling
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        // Game State Machine Variables
        this.state = GAME_STATES.START;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('space_defender_highscore') || '0', 10);
        this.lives = 3;
        this.level = 1;
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.asteroidSpawnTimer = 0;

        // Input Keyboard Tracking
        this.keys = {
            left: false,
            right: false,
            shoot: false
        };

        // Game Entity Lists
        this.stars = [];
        this.bullets = [];
        this.enemies = [];
        this.asteroids = [];
        this.particles = [];
        this.player = null;

        // Dynamic UI Elements
        this.ui = {
            hud: document.getElementById('hud'),
            scoreVal: document.getElementById('scoreVal'),
            levelVal: document.getElementById('levelVal'),
            livesContainer: document.getElementById('livesContainer'),
            startScreen: document.getElementById('startScreen'),
            pauseOverlay: document.getElementById('pauseOverlay'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            finalScoreVal: document.getElementById('finalScoreVal'),
            finalLevelVal: document.getElementById('finalLevelVal'),
            highScoreVal: document.getElementById('highScoreVal')
        };

        // Initialize Background Stars & Event Listeners
        this.initStarfield();
        this.setupEventListeners();
        this.setupPlayer();

        // Start Animation Loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    /**
     * Resizes canvas style smoothly to fit window while preserving 4:3 CG ratio.
     */
    handleResize() {
        const container = document.getElementById('gameContainer');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate aspect ratio scaling
        const scale = Math.min(containerWidth / this.width, containerHeight / this.height);
        this.canvas.style.width = `${this.width * scale}px`;
        this.canvas.style.height = `${this.height * scale}px`;
    }

    /**
     * Set up keyboard listeners and button clicks.
     */
    setupEventListeners() {
        // Keydown Handler
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
            if (e.code === 'Space') {
                this.keys.shoot = true;
                // Prevent spacebar scrolling
                e.preventDefault();
            }
            if (e.code === 'KeyP') {
                this.togglePause();
            }
        });

        // Keyup Handler
        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
            if (e.code === 'Space') this.keys.shoot = false;
        });

        // Button Event Listeners
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('pauseRestartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('quitBtn').addEventListener('click', () => this.quitGame());
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: PROCEDURAL BACKGROUND & PARALLAX SCALING
     * Creates background starfield with different depths (sizes and velocities).
     * ------------------------------------------------------------------------
     */
    initStarfield() {
        this.stars = [];
        const starCount = 120;
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 1.8 + 0.5,
                speed: Math.random() * 1.5 + 0.3,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.05 + 0.01,
                color: ['#ffffff', '#00f0ff', '#ffe600', '#a0aec0'][Math.floor(Math.random() * 4)]
            });
        }
    }

    /**
     * Initialize Player Spaceship Object
     */
    setupPlayer() {
        this.player = {
            x: this.width / 2,
            y: this.height - 70,
            width: 44,
            height: 48,
            speed: 7.5,
            tiltAngle: 0,
            cooldown: 0,
            invulnerableTimer: 0,
            radius: 22 // Used for circle collision detection
        };
    }

    /**
     * Starts a new game session.
     */
    startGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.bullets = [];
        this.enemies = [];
        this.asteroids = [];
        this.particles = [];
        this.setupPlayer();

        this.updateHUD();
        this.state = GAME_STATES.PLAYING;

        // Hide screens, show HUD
        this.ui.startScreen.classList.add('hidden');
        this.ui.gameOverScreen.classList.add('hidden');
        this.ui.pauseOverlay.classList.add('hidden');
        this.ui.hud.classList.remove('hidden');
    }

    /**
     * Restarts game after Game Over.
     */
    restartGame() {
        this.startGame();
    }

    /**
     * Toggles Pause state.
     */
    togglePause() {
        if (this.state === GAME_STATES.PLAYING) {
            this.state = GAME_STATES.PAUSED;
            this.ui.pauseOverlay.classList.remove('hidden');
        } else if (this.state === GAME_STATES.PAUSED) {
            this.state = GAME_STATES.PLAYING;
            this.ui.pauseOverlay.classList.add('hidden');
        }
    }

    /**
     * Quits current game session and returns to Start Screen menu.
     */
    quitGame() {
        this.state = GAME_STATES.START;
        this.bullets = [];
        this.enemies = [];
        this.asteroids = [];
        this.particles = [];
        
        this.ui.hud.classList.add('hidden');
        this.ui.pauseOverlay.classList.add('hidden');
        this.ui.gameOverScreen.classList.add('hidden');
        this.ui.startScreen.classList.remove('hidden');
    }

    /**
     * Updates Heads-Up Display DOM elements.
     */
    updateHUD() {
        // Format Score with leading zeros
        this.ui.scoreVal.textContent = String(this.score).padStart(5, '0');
        this.ui.levelVal.textContent = this.level;

        // Render Lives Heart Icons
        const lifeIcons = this.ui.livesContainer.querySelectorAll('.life-icon');
        lifeIcons.forEach((icon, index) => {
            if (index < this.lives) {
                icon.classList.remove('lost');
            } else {
                icon.classList.add('lost');
            }
        });
    }

    /**
     * Spawns alien enemy fighters dynamically based on difficulty score.
     */
    spawnEnemy() {
        const x = Math.random() * (this.width - 60) + 30;
        const enemyType = Math.random() > 0.4 ? 'fighter' : 'interceptor';
        
        this.enemies.push({
            x: x,
            y: -40,
            width: 40,
            height: 40,
            radius: 20,
            speed: Math.random() * (1.5 + this.level * 0.4) + 1.8,
            type: enemyType,
            oscillate: Math.random() > 0.5,
            oscSpeed: Math.random() * 0.04 + 0.02,
            oscTime: 0,
            health: enemyType === 'interceptor' ? 2 : 1
        });
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: PROCEDURAL POLYGON GENERATION
     * Creates irregular space asteroids with randomized radial vertices.
     * ------------------------------------------------------------------------
     */
    spawnAsteroid() {
        const radius = Math.random() * 20 + 20; // Radius between 20 and 40
        const vertices = [];
        const numPoints = Math.floor(Math.random() * 4) + 7; // 7 to 10 sides

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const variance = Math.random() * (radius * 0.35) - (radius * 0.175);
            vertices.push({
                r: radius + variance,
                angle: angle
            });
        }

        this.asteroids.push({
            x: Math.random() * (this.width - 80) + 40,
            y: -50,
            radius: radius,
            vertices: vertices,
            speed: Math.random() * 1.5 + 1.0,
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05 // Continuous 2D Rotation speed
        });
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: PARTICLE SYSTEM (SCALING & TRANSLATION & FADING)
     * Creates explosion shockwaves and radial debris particles.
     * ------------------------------------------------------------------------
     */
    createExplosion(x, y, color = '#ff0055', count = 18) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 1.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed, // Velocity translation dx
                vy: Math.sin(angle) * speed, // Velocity translation dy
                radius: Math.random() * 4 + 2,
                color: color,
                alpha: 1.0,
                decay: Math.random() * 0.03 + 0.015,
                scale: 1.0
            });
        }
    }

    /**
     * Primary Game Engine State Update Method
     */
    update(dt) {
        if (this.state !== GAME_STATES.PLAYING) return;

        // Difficulty Progression scaling
        this.level = Math.floor(this.score / 250) + 1;

        // --------------------------------------------------------------------
        // 1. UPDATE PLAYER & APPLY 2D TRANSLATION / BOUNDARY CLIPPING
        // --------------------------------------------------------------------
        let targetTilt = 0;
        if (this.keys.left) {
            this.player.x -= this.player.speed; // Translation dx
            targetTilt = -0.18; // Banking rotation angle (Radians)
        }
        if (this.keys.right) {
            this.player.x += this.player.speed; // Translation dx
            targetTilt = 0.18; // Banking rotation angle (Radians)
        }

        // Smoothly interpolate ship banking tilt angle
        this.player.tiltAngle += (targetTilt - this.player.tiltAngle) * 0.2;

        // CG CONCEPT: SCREEN BOUNDARY CLIPPING / CONSTRAINTS
        // Restricts player center point within canvas width borders
        const halfWidth = this.player.width / 2;
        if (this.player.x - halfWidth < 0) {
            this.player.x = halfWidth;
        }
        if (this.player.x + halfWidth > this.width) {
            this.player.x = this.width - halfWidth;
        }

        // Handle Weapon Firing & Cooldown
        if (this.player.cooldown > 0) this.player.cooldown--;
        if (this.keys.shoot && this.player.cooldown === 0) {
            // Spawn Dual Plasma Laser Bullets
            this.bullets.push({
                x: this.player.x - 14,
                y: this.player.y - 20,
                width: 4,
                height: 16,
                speed: 12
            });
            this.bullets.push({
                x: this.player.x + 10,
                y: this.player.y - 20,
                width: 4,
                height: 16,
                speed: 12
            });
            this.player.cooldown = 12; // Frames between shots
        }

        // Invulnerability Flash Timer countdown
        if (this.player.invulnerableTimer > 0) {
            this.player.invulnerableTimer--;
        }

        // --------------------------------------------------------------------
        // 2. UPDATE STARFIELD (BACKGROUND SCROLLING TRANSLATION)
        // --------------------------------------------------------------------
        this.stars.forEach(star => {
            star.y += star.speed;
            star.pulse += star.pulseSpeed;
            // Wrap stars around top boundary when exiting bottom
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }
        });

        // --------------------------------------------------------------------
        // 3. UPDATE PROJECTILES & CLIP OFF-SCREEN BULLETS
        // --------------------------------------------------------------------
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.y -= bullet.speed; // Vertical translation dy

            // Boundary clipping: Purge bullets moving beyond top edge
            if (bullet.y < -20) {
                this.bullets.splice(i, 1);
            }
        }

        // --------------------------------------------------------------------
        // 4. SPAWN & UPDATE ENEMIES
        // --------------------------------------------------------------------
        this.spawnTimer++;
        const currentEnemySpawnInterval = Math.max(25, 75 - this.level * 6);
        if (this.spawnTimer >= currentEnemySpawnInterval) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.y += enemy.speed;

            // Oscillating horizontal path movement for interceptors
            if (enemy.oscillate) {
                enemy.oscTime += enemy.oscSpeed;
                enemy.x += Math.sin(enemy.oscTime) * 2.2;
            }

            // Boundary Clipping: Remove enemies reaching bottom
            if (enemy.y > this.height + 50) {
                this.enemies.splice(i, 1);
            }
        }

        // --------------------------------------------------------------------
        // 5. SPAWN & UPDATE ASTEROIDS (ROTATION & TRANSLATION)
        // --------------------------------------------------------------------
        this.asteroidSpawnTimer++;
        if (this.asteroidSpawnTimer >= 110) {
            this.spawnAsteroid();
            this.asteroidSpawnTimer = 0;
        }

        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            asteroid.y += asteroid.speed; // Translation
            asteroid.angle += asteroid.rotationSpeed; // 2D Rotation update

            // Boundary Clipping
            if (asteroid.y > this.height + 60) {
                this.asteroids.splice(i, 1);
            }
        }

        // --------------------------------------------------------------------
        // 6. UPDATE PARTICLES (TRANSLATION & FADING)
        // --------------------------------------------------------------------
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            p.scale += 0.02; // Scaling expansion effect

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // --------------------------------------------------------------------
        // 7. COLLISION DETECTION ALGORITHMS
        // --------------------------------------------------------------------
        this.checkCollisions();
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: COLLISION DETECTION MATHEMATICS
     * Implements AABB (Bounding Box) and Circle Distance collision formulas.
     * ------------------------------------------------------------------------
     */
    checkCollisions() {
        // A. BULLET vs ENEMY COLLISION (AABB / Point-in-Rect)
        for (let b = this.bullets.length - 1; b >= 0; b--) {
            const bullet = this.bullets[b];

            for (let e = this.enemies.length - 1; e >= 0; e--) {
                const enemy = this.enemies[e];

                // Circle vs Point / AABB Collision
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const distanceSquare = dx * dx + dy * dy;

                if (distanceSquare <= enemy.radius * enemy.radius) {
                    // Collision detected!
                    enemy.health--;

                    // Trigger mini impact sparks
                    this.createExplosion(bullet.x, bullet.y, '#00f0ff', 6);

                    // Remove bullet
                    this.bullets.splice(b, 1);

                    if (enemy.health <= 0) {
                        // Enemy Destroyed!
                        this.createExplosion(enemy.x, enemy.y, '#ff0055', 20);
                        this.enemies.splice(e, 1);
                        this.score += enemy.type === 'interceptor' ? 30 : 15;
                        this.updateHUD();
                    }
                    break;
                }
            }
        }

        // B. BULLET vs ASTEROID COLLISION (Circle-Distance Detection)
        for (let b = this.bullets.length - 1; b >= 0; b--) {
            const bullet = this.bullets[b];

            for (let a = this.asteroids.length - 1; a >= 0; a--) {
                const asteroid = this.asteroids[a];

                // Euclidean distance check: (x2 - x1)^2 + (y2 - y1)^2 <= (r1 + r2)^2
                const dx = bullet.x - asteroid.x;
                const dy = bullet.y - asteroid.y;
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq <= asteroid.radius * asteroid.radius) {
                    this.createExplosion(bullet.x, bullet.y, '#ffe600', 8);
                    this.bullets.splice(b, 1);

                    // Fragment or destroy asteroid
                    this.createExplosion(asteroid.x, asteroid.y, '#cbd5e0', 25);
                    this.asteroids.splice(a, 1);
                    this.score += 25;
                    this.updateHUD();
                    break;
                }
            }
        }

        // C. PLAYER vs ENEMY / ASTEROID COLLISION (Circle Distance)
        if (this.player.invulnerableTimer === 0) {
            // Check Player vs Enemies
            for (let e = this.enemies.length - 1; e >= 0; e--) {
                const enemy = this.enemies[e];
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.player.radius + enemy.radius) {
                    this.handlePlayerHit(enemy.x, enemy.y);
                    this.enemies.splice(e, 1);
                    break;
                }
            }

            // Check Player vs Asteroids
            for (let a = this.asteroids.length - 1; a >= 0; a--) {
                const asteroid = this.asteroids[a];
                const dx = this.player.x - asteroid.x;
                const dy = this.player.y - asteroid.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.player.radius + asteroid.radius) {
                    this.handlePlayerHit(asteroid.x, asteroid.y);
                    this.asteroids.splice(a, 1);
                    break;
                }
            }
        }
    }

    /**
     * Handles player collision hit, life loss, and potential Game Over.
     */
    handlePlayerHit(hitX, hitY) {
        this.lives--;
        this.createExplosion(hitX, hitY, '#ff0055', 30);
        this.createExplosion(this.player.x, this.player.y, '#00f0ff', 20);
        this.updateHUD();

        if (this.lives <= 0) {
            this.triggerGameOver();
        } else {
            // Grant temporary invulnerability flash frames
            this.player.invulnerableTimer = 90; // ~1.5 seconds at 60fps
        }
    }

    /**
     * Triggers Game Over Screen state.
     */
    triggerGameOver() {
        this.state = GAME_STATES.GAMEOVER;

        // Check High Score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('space_defender_highscore', this.highScore.toString());
        }

        // Update UI
        this.ui.finalScoreVal.textContent = String(this.score);
        this.ui.finalLevelVal.textContent = `Level ${this.level}`;
        this.ui.highScoreVal.textContent = String(this.highScore);

        this.ui.hud.classList.add('hidden');
        this.ui.gameOverScreen.classList.remove('hidden');
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: CANVAS RENDERING PIPELINE & GRAPHICS PRIMITIVES
     * Render functions utilizing 2D Transformation matrices (translate, rotate, scale).
     * ------------------------------------------------------------------------
     */
    render() {
        // Clear background frame buffer
        this.ctx.fillStyle = '#04050a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 1. Render Background Starfield with brightness pulsing
        this.renderStars();

        // 2. Render Bullets
        this.renderBullets();

        // 3. Render Enemies
        this.renderEnemies();

        // 4. Render Asteroids (2D Tumbling Rotation)
        this.renderAsteroids();

        // 5. Render Particle System (Scaling Explosions)
        this.renderParticles();

        // 6. Render Player Spaceship (Vector Paths + Banking Rotation)
        if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSED) {
            this.renderPlayer();
        }
    }

    /**
     * Render Stars with Pulsing Alpha (Scaling intensity)
     */
    renderStars() {
        this.stars.forEach(star => {
            const alpha = 0.5 + Math.sin(star.pulse) * 0.4;
            this.ctx.save();
            this.ctx.fillStyle = star.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: PLAYER VECTOR GRAPHICS & BANKING ROTATION
     * Uses ctx.save(), ctx.translate(), ctx.rotate(), and path drawing primitives.
     * ------------------------------------------------------------------------
     */
    renderPlayer() {
        // Flash ship during invulnerability frames
        if (this.player.invulnerableTimer % 10 > 5) return;

        this.ctx.save();
        // CG TRANSFORM: Translate origin (0,0) to Player position (x, y)
        this.ctx.translate(this.player.x, this.player.y);

        // CG TRANSFORM: Rotate ship based on left/right banking motion
        this.ctx.rotate(this.player.tiltAngle);

        // --- Thruster Flame (Pulsing Scale Effect) ---
        const flameLength = 15 + Math.random() * 10;
        this.ctx.beginPath();
        this.ctx.moveTo(-8, 18);
        this.ctx.lineTo(0, 18 + flameLength);
        this.ctx.lineTo(8, 18);
        this.ctx.closePath();
        this.ctx.fillStyle = '#00f0ff';
        this.ctx.shadowColor = '#00f0ff';
        this.ctx.shadowBlur = 12;
        this.ctx.fill();

        // --- Spaceship Hull Path Drawing ---
        this.ctx.beginPath();
        // Nose Cone
        this.ctx.moveTo(0, -24);
        // Right Wing tip
        this.ctx.lineTo(22, 16);
        // Right Inner Wing
        this.ctx.lineTo(12, 18);
        // Engine Center
        this.ctx.lineTo(0, 14);
        // Left Inner Wing
        this.ctx.lineTo(-12, 18);
        // Left Wing tip
        this.ctx.lineTo(-22, 16);
        this.ctx.closePath();

        // Linear Gradient Fill for Metallic Hull
        const gradient = this.ctx.createLinearGradient(0, -24, 0, 20);
        gradient.addColorStop(0, '#00f0ff');
        gradient.addColorStop(0.5, '#0a2540');
        gradient.addColorStop(1, '#0055ff');

        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#00f0ff';
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
        this.ctx.stroke();

        // Cockpit Glass Canopy (Cyan Arc)
        this.ctx.beginPath();
        this.ctx.ellipse(0, -4, 6, 10, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 10;
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * Render Plasma Laser Bullets
     */
    renderBullets() {
        this.ctx.save();
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = '#00f0ff';
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
        });
        this.ctx.restore();
    }

    /**
     * Render Alien Enemy Ships using Canvas vector primitives
     */
    renderEnemies() {
        this.enemies.forEach(enemy => {
            this.ctx.save();
            // CG TRANSFORM: Translate local coordinate space to enemy (x,y)
            this.ctx.translate(enemy.x, enemy.y);

            // Draw Enemy Shape based on type
            if (enemy.type === 'fighter') {
                this.ctx.beginPath();
                this.ctx.moveTo(0, 20); // Pointing downwards
                this.ctx.lineTo(18, -15);
                this.ctx.lineTo(8, -10);
                this.ctx.lineTo(0, -20);
                this.ctx.lineTo(-8, -10);
                this.ctx.lineTo(-18, -15);
                this.ctx.closePath();

                this.ctx.fillStyle = '#ff0055';
                this.ctx.strokeStyle = '#ff6699';
                this.ctx.lineWidth = 2;
                this.ctx.shadowColor = '#ff0055';
                this.ctx.shadowBlur = 10;
                this.ctx.fill();
                this.ctx.stroke();

                // Glowing Eye Core
                this.ctx.beginPath();
                this.ctx.arc(0, 2, 4, 0, Math.PI * 2);
                this.ctx.fillStyle = '#ffe600';
                this.ctx.fill();

            } else {
                // Interceptor Type
                this.ctx.beginPath();
                this.ctx.moveTo(0, 22);
                this.ctx.lineTo(22, -8);
                this.ctx.lineTo(0, -8);
                this.ctx.lineTo(-22, -8);
                this.ctx.closePath();

                this.ctx.fillStyle = '#9900ff';
                this.ctx.strokeStyle = '#e066ff';
                this.ctx.lineWidth = 2;
                this.ctx.shadowColor = '#9900ff';
                this.ctx.shadowBlur = 12;
                this.ctx.fill();
                this.ctx.stroke();
            }

            this.ctx.restore();
        });
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: 2D ROTATION MATRIX DEMONSTRATION (ASTEROID RENDERING)
     * Demonstrates translate(cx, cy) -> rotate(angle) -> vertex path drawing.
     * ------------------------------------------------------------------------
     */
    renderAsteroids() {
        this.asteroids.forEach(asteroid => {
            this.ctx.save();

            // STEP 1: Translate origin to Asteroid's center point
            this.ctx.translate(asteroid.x, asteroid.y);

            // STEP 2: Rotate coordinate grid around center by current angle
            this.ctx.rotate(asteroid.angle);

            // STEP 3: Draw Procedural Irregular Polygon Vertices
            this.ctx.beginPath();
            asteroid.vertices.forEach((vertex, index) => {
                const vx = Math.cos(vertex.angle) * vertex.r;
                const vy = Math.sin(vertex.angle) * vertex.r;

                if (index === 0) {
                    this.ctx.moveTo(vx, vy);
                } else {
                    this.ctx.lineTo(vx, vy);
                }
            });
            this.ctx.closePath();

            // Styling Rocky Texture with Glowing Stroke
            this.ctx.fillStyle = '#1e2638';
            this.ctx.strokeStyle = '#4a5568';
            this.ctx.lineWidth = 2;
            this.ctx.fill();
            this.ctx.stroke();

            // Internal Crater details
            this.ctx.beginPath();
            this.ctx.arc(-asteroid.radius * 0.3, -asteroid.radius * 0.2, asteroid.radius * 0.25, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#2d3748';
            this.ctx.stroke();

            this.ctx.restore();
        });
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: PARTICLE EXPANSION SCALING & ALPHA DISSIPATION
     * ------------------------------------------------------------------------
     */
    renderParticles() {
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            // Scale circle size dynamically over time
            this.ctx.arc(p.x, p.y, p.radius * p.scale, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    /**
     * ------------------------------------------------------------------------
     * CG CONCEPT: CANVAS ANIMATION LOOP (requestAnimationFrame)
     * Continuous render & state update loop executing at display refresh rate.
     * ------------------------------------------------------------------------
     */
    gameLoop(timestamp) {
        // Calculate Delta Time in seconds
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // 1. Update Game Engine Logic
        this.update(dt);

        // 2. Render Canvas Frame
        this.render();

        // 3. Request Next Frame recursively
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
}

// Instantiate Engine when DOM content is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new SpaceDefenderEngine();
});
