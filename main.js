import { World, Vec2, Circle, Edge } from 'planck';

// Canvas setup
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

// Fullscreen canvas and resizing
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Physics world setup
const world = World();
const scale = 30; // pixels per meter

// Define game world size (5x larger than canvas)
const worldWidth = canvas.width * 1.5;
const worldHeight = canvas.height * 1.5;

// Define level boundaries (walls)
const walls = [];

// Left wall
const leftWall = world.createBody().createFixture(Edge(Vec2(0, 0), Vec2(0, worldHeight / scale)), { userData: 'wall' });
walls.push(leftWall);

// Right wall
const rightWall = world.createBody().createFixture(Edge(Vec2(worldWidth / scale, 0), Vec2(worldWidth / scale, worldHeight / scale)), { userData: 'wall' });
walls.push(rightWall);

// Top wall
const topWall = world.createBody().createFixture(Edge(Vec2(0, 0), Vec2(worldWidth / scale, 0)), { userData: 'wall' });
walls.push(topWall);

// Bottom wall
const bottomWall = world.createBody().createFixture(Edge(Vec2(0, worldHeight / scale), Vec2(worldWidth / scale, worldHeight / scale)), { userData: 'wall' });
walls.push(bottomWall);

// Player
const player = {
  body: world.createBody({
    type: 'dynamic',
    position: Vec2(worldWidth / 2 / scale, worldHeight / 2 / scale),
    fixedRotation: true,
  }),
  radius: 15,
  speed: 15, // Increased speed from 5 to 15
  bullets: [],
};

player.body.createFixture(Circle(player.radius / scale), {
  density: 1,
  friction: 0.3,
  restitution: 0.0,
  userData: 'player',
});

// Game state
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const bullets = [];
const enemies = [];

// Shooting state
let shooting = true;
let lastShotTime = 0;
const shotInterval = 50; // Cooldown in milliseconds

// Mouse position
let mouseX = 0;
let mouseY = 0;

// Input handling
document.addEventListener('keydown', (e) => {
  switch (e.key.toLowerCase()) {
    case 'w':
      keys.up = true;
      break;
    case 's':
      keys.down = true;
      break;
    case 'a':
      keys.left = true;
      break;
    case 'd':
      keys.right = true;
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.key.toLowerCase()) {
    case 'w':
      keys.up = false;
      break;
    case 's':
      keys.down = false;
      break;
    case 'a':
      keys.left = false;
      break;
    case 'd':
      keys.right = false;
      break;
  }
});

// Update mouse position relative to the game world
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left + cameraX;
  mouseY = e.clientY - rect.top + cameraY;
});

// Start shooting on mousedown
canvas.addEventListener('mousedown', () => {
  shooting = !shooting;
});

// Stop shooting on mouseup
canvas.addEventListener('mouseup', () => {
  //shooting = false;
});

// Camera position
let cameraX = 0;
let cameraY = 0;

// Define static spawn points within walls
const spawnPoints = [
  { x: 200, y: 200 },
  { x: worldWidth - 200, y: 200 },
  { x: 200, y: worldHeight - 200 },
  { x: worldWidth - 200, y: worldHeight - 200 },
  { x: worldWidth / 2, y: 200 },
  { x: worldWidth / 2, y: worldHeight - 200 },
  { x: 200, y: worldHeight / 2 },
  { x: worldWidth - 200, y: worldHeight / 2 },
];

// Max number of enemies
const maxEnemies = 10;

// Shooting function
function shoot() {
  const playerPos = player.body.getPosition();
  const angle = Math.atan2(mouseY - playerPos.y * scale, mouseX - playerPos.x * scale);

  // Spawn the bullet slightly in front of the player
  const bulletSpawnDistance = (player.radius + 5) / scale;
  const bulletX = playerPos.x + Math.cos(angle) * bulletSpawnDistance;
  const bulletY = playerPos.y + Math.sin(angle) * bulletSpawnDistance;

  const bullet = world.createBody({
    type: 'dynamic',
    position: Vec2(bulletX, bulletY),
    bullet: true,
    fixedRotation: true,
  });

  bullet.createFixture(Circle(5 / scale), {
    density: 1,
    friction: 0,
    restitution: 0, // No bouncing!
    userData: 'bullet',
  });

  const velocity = Vec2(Math.cos(angle) * 20, Math.sin(angle) * 20); // Increased bullet speed
  bullet.setLinearVelocity(velocity);

  // Add a custom property to track bullet distance traveled
  bullet.startPosition = bullet.getPosition().clone();

  bullets.push(bullet);
}

// Spawn enemies periodically with health
function spawnEnemy() {
  // Limit the number of enemies
  if (enemies.length >= maxEnemies) {
    return;
  }

  // Choose a random spawn point
  const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  const x = spawnPoint.x;
  const y = spawnPoint.y;

  const enemy = {
    body: world.createBody({
      type: 'dynamic',
      position: Vec2(x / scale, y / scale),
    }),
    health: 100, // Max health of the enemy
    maxHealth: 100,
    speed: 10, // Increased enemy speed
  };

  enemy.body.createFixture(Circle(15 / scale), {
    density: 1,
    friction: 0.3,
    restitution: 0.0, // No bouncing!
    userData: 'enemy',
  });

  // Make sure enemies are affected by walls
  enemy.body.setLinearDamping(0.5); // Add some damping

  enemies.push(enemy);
}

// Collision handling
world.on('begin-contact', (contact) => {
  const fixtureA = contact.getFixtureA();
  const fixtureB = contact.getFixtureB();

  const userDataA = fixtureA.getUserData();
  const userDataB = fixtureB.getUserData();

  // Bullet hits wall
  if ((userDataA === 'bullet' && userDataB === 'wall') || (userDataA === 'wall' && userDataB === 'bullet')) {
    let bulletFixture = userDataA === 'bullet' ? fixtureA : fixtureB;
    let bulletBody = bulletFixture.getBody();

    // Remove bullet
    world.destroyBody(bulletBody);
    bullets.splice(bullets.indexOf(bulletBody), 1);
  }
});

// Game loop
function update(timestamp) {
  // Player movement
  const velocity = Vec2(0, 0);
  if (keys.up) velocity.y -= player.speed;
  if (keys.down) velocity.y += player.speed;
  if (keys.left) velocity.x -= player.speed;
  if (keys.right) velocity.x += player.speed;
  player.body.setLinearVelocity(velocity);

  // Handle shooting with cooldown
  if (shooting && timestamp - lastShotTime > shotInterval) {
    shoot();
    lastShotTime = timestamp;
  }

  // Move enemies towards player
  const playerPos = player.body.getPosition();
  enemies.forEach((enemy) => {
    const enemyPos = enemy.body.getPosition();
    const direction = Vec2(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
    direction.normalize();
    direction.mul(enemy.speed); // Use enemy's speed
    enemy.body.setLinearVelocity(direction);
  });

  // Update physics
  world.step(1 / 60);

  // Update camera position to center on player, clamped to level boundaries
  cameraX = playerPos.x * scale - canvas.width / 2;
  cameraY = playerPos.y * scale - canvas.height / 2;

  // Clamp camera to level boundaries
  cameraX = Math.max(0, Math.min(cameraX, worldWidth - canvas.width));
  cameraY = Math.max(0, Math.min(cameraY, worldHeight - canvas.height));

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Save context and translate
  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // Draw ground grid
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  const gridSize = 50;

  for (let x = 0; x <= worldWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, worldHeight);
    ctx.stroke();
  }

  for (let y = 0; y <= worldHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(worldWidth, y);
    ctx.stroke();
  }

  // Draw level walls
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 5;

  // Left wall
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, worldHeight);
  ctx.stroke();

  // Right wall
  ctx.beginPath();
  ctx.moveTo(worldWidth, 0);
  ctx.lineTo(worldWidth, worldHeight);
  ctx.stroke();

  // Top wall
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(worldWidth, 0);
  ctx.stroke();

  // Bottom wall
  ctx.beginPath();
  ctx.moveTo(0, worldHeight);
  ctx.lineTo(worldWidth, worldHeight);
  ctx.stroke();

  // Draw spawn points
  ctx.fillStyle = 'yellow';
  spawnPoints.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw player
  ctx.beginPath();
  ctx.arc(playerPos.x * scale, playerPos.y * scale, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();

  // Draw bullets
  ctx.fillStyle = '#eee';
  bullets.forEach((bullet) => {
    const pos = bullet.getPosition();
    ctx.beginPath();
    ctx.arc(pos.x * scale, pos.y * scale, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw enemies and their health bars
  enemies.forEach((enemy) => {
    ctx.fillStyle = 'red';
    const pos = enemy.body.getPosition();
    ctx.beginPath();
    ctx.arc(pos.x * scale, pos.y * scale, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw health bar above enemy
    const healthBarWidth = 40;
    const healthBarHeight = 5;
    const healthPercentage = enemy.health / enemy.maxHealth;
    const healthBarX = pos.x * scale - healthBarWidth / 2;
    const healthBarY = pos.y * scale - 25; // Position above the enemy

    // Draw health bar background
    ctx.fillStyle = 'gray';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    // Draw health bar foreground
    ctx.fillStyle = 'green';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
  });

  // Restore context
  ctx.restore();

  // Draw object counter at top right
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Enemies: ${enemies.length}  Bullets: ${bullets.length}`, canvas.width - 10, 20);

  // Collision detection
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const bulletPos = bullet.getPosition();

    // Remove bullets that have traveled max distance
    const maxBulletDistance = canvas.width / scale; // Max distance bullets can travel
    const startPos = bullet.startPosition;
    const distanceTraveled = bulletPos.clone().sub(startPos).length();

    if (distanceTraveled > maxBulletDistance) {
      world.destroyBody(bullet);
      bullets.splice(i, 1);
      continue;
    }

    // Remove bullets that are off world
    if (bulletPos.x < -1 || bulletPos.x > worldWidth / scale + 1 || bulletPos.y < -1 || bulletPos.y > worldHeight / scale + 1) {
      world.destroyBody(bullet);
      bullets.splice(i, 1);
      continue;
    }

    // Check bullet-enemy collisions
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemyPos = enemies[j].body.getPosition();
      const dx = bulletPos.x - enemyPos.x;
      const dy = bulletPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (15 + 5) / scale) {
        // Damage the enemy
        enemies[j].health -= 50;

        // Remove the bullet even if the enemy doesn't die
        world.destroyBody(bullet);
        bullets.splice(i, 1);

        // Remove enemy if health <= 0
        if (enemies[j].health <= 0) {
          world.destroyBody(enemies[j].body);
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  // Spawn new enemies
  if (Math.random() < 0.02) {
    spawnEnemy();
  }

  requestAnimationFrame(update);
}

// Start the game
update();
