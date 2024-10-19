import { World, Vec2, Circle, Edge } from 'planck';

// Canvas setup
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

// Constants for configuration
const SCALE = 30; // Pixels per meter
const WORLD_SCALE = 2; // World is 2x larger than canvas
const PLAYER_RADIUS = 15; // Player radius in pixels
const PLAYER_SPEED = 20; // Player speed
const BULLET_RADIUS = 5; // Bullet radius in pixels
const BULLET_SPEED = 40; // Bullet speed
const BULLET_DAMAGE = 50; // Damage dealt by bullets
const BULLET_MAX_DISTANCE_FACTOR = 2; // Multiplier for bullet max distance
const ENEMY_RADIUS = 15; // Enemy radius in pixels
const ENEMY_SPEED = 10; // Enemy speed
const ENEMY_HEALTH = 100; // Enemy health
const MAX_ENEMIES = 10; // Maximum number of enemies
const GRID_SIZE = 50; // Size of the grid squares
const SHOT_INTERVAL = 50; // Time between shots in milliseconds
const MELEE_DAMAGE = 50; // Damage dealt by melee attacks
const MELEE_RANGE = (PLAYER_RADIUS + ENEMY_RADIUS) / SCALE; // Melee range in meters

// Collision categories
const CATEGORY_PLAYER = 0x0001;
const CATEGORY_BULLET = 0x0002;
const CATEGORY_ENEMY = 0x0004;
const CATEGORY_WALL = 0x0008;

// Variables that depend on canvas dimensions
let WORLD_WIDTH;
let WORLD_HEIGHT;
let BULLET_MAX_DISTANCE;

// Physics world setup
const world = World();

// Player and other game objects
let player;
const bullets = [];
const enemies = [];
const walls = [];

// Arrays to hold bodies to be destroyed after physics step
const bodiesToDestroy = [];
const bulletsToRemove = [];
const enemiesToRemove = [];

// Camera position
let cameraX = 0;
let cameraY = 0;

// Mouse position
let mouseX = 0;
let mouseY = 0;

// Game state
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

// Shooting state
let shooting = false;
let lastShotTime = 0;

// Define static spawn points within walls
let spawnPoints = [];

// Fullscreen canvas and resizing
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Recalculate world dimensions
  WORLD_WIDTH = canvas.width * WORLD_SCALE;
  WORLD_HEIGHT = canvas.height * WORLD_SCALE;
  BULLET_MAX_DISTANCE = (canvas.width * BULLET_MAX_DISTANCE_FACTOR) / SCALE;

  // Recreate walls and update game objects
  recreateWorld();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Function to recreate the world
function recreateWorld() {
  // Remove all bodies from the world
  for (let body = world.getBodyList(); body; ) {
    const nextBody = body.getNext();
    world.destroyBody(body);
    body = nextBody;
  }

  // Clear arrays without changing references
  bullets.length = 0;
  enemies.length = 0;
  walls.length = 0;

  // Recreate walls
  createWalls();

  // Recreate player
  createPlayer();

  // Recreate spawn points
  createSpawnPoints();
}

// Create walls with collision filters
function createWalls() {
  // Left wall
  walls.push(
    world.createBody().createFixture(Edge(Vec2(0, 0), Vec2(0, WORLD_HEIGHT / SCALE)), {
      userData: 'wall',
      filterCategoryBits: CATEGORY_WALL,
      filterMaskBits: CATEGORY_PLAYER | CATEGORY_ENEMY | CATEGORY_BULLET,
    })
  );

  // Right wall
  walls.push(
    world.createBody().createFixture(Edge(Vec2(WORLD_WIDTH / SCALE, 0), Vec2(WORLD_WIDTH / SCALE, WORLD_HEIGHT / SCALE)), {
      userData: 'wall',
      filterCategoryBits: CATEGORY_WALL,
      filterMaskBits: CATEGORY_PLAYER | CATEGORY_ENEMY | CATEGORY_BULLET,
    })
  );

  // Top wall
  walls.push(
    world.createBody().createFixture(Edge(Vec2(0, 0), Vec2(WORLD_WIDTH / SCALE, 0)), {
      userData: 'wall',
      filterCategoryBits: CATEGORY_WALL,
      filterMaskBits: CATEGORY_PLAYER | CATEGORY_ENEMY | CATEGORY_BULLET,
    })
  );

  // Bottom wall
  walls.push(
    world.createBody().createFixture(Edge(Vec2(0, WORLD_HEIGHT / SCALE), Vec2(WORLD_WIDTH / SCALE, WORLD_HEIGHT / SCALE)), {
      userData: 'wall',
      filterCategoryBits: CATEGORY_WALL,
      filterMaskBits: CATEGORY_PLAYER | CATEGORY_ENEMY | CATEGORY_BULLET,
    })
  );
}

// Create player
function createPlayer() {
  player = {
    body: world.createBody({
      type: 'dynamic',
      position: Vec2(WORLD_WIDTH / 2 / SCALE, WORLD_HEIGHT / 2 / SCALE),
      fixedRotation: true,
    }),
    radius: PLAYER_RADIUS,
    speed: PLAYER_SPEED,
  };

  player.body.createFixture(Circle(PLAYER_RADIUS / SCALE), {
    density: 1,
    friction: 0.3,
    restitution: 0.0,
    userData: 'player',
    filterCategoryBits: CATEGORY_PLAYER,
    filterMaskBits: CATEGORY_ENEMY | CATEGORY_WALL,
  });
}

// Create spawn points
function createSpawnPoints() {
  spawnPoints = [
    { x: 200, y: 200 },
    { x: WORLD_WIDTH - 200, y: 200 },
    { x: 200, y: WORLD_HEIGHT - 200 },
    { x: WORLD_WIDTH - 200, y: WORLD_HEIGHT - 200 },
    { x: WORLD_WIDTH / 2, y: 200 },
    { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 200 },
    { x: 200, y: WORLD_HEIGHT / 2 },
    { x: WORLD_WIDTH - 200, y: WORLD_HEIGHT / 2 },
  ];
}

// Initial world creation
recreateWorld();

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
  shooting = true;
});

// Stop shooting on mouseup
canvas.addEventListener('mouseup', () => {
  shooting = false;
});

// Shooting function
function shoot() {
  const playerPos = player.body.getPosition();
  const angle = Math.atan2(mouseY - playerPos.y * SCALE, mouseX - playerPos.x * SCALE);

  // Check for enemies within melee range
  let enemyInRange = null;
  for (let enemy of enemies) {
    const enemyPos = enemy.body.getPosition();
    const dx = enemyPos.x - playerPos.x;
    const dy = enemyPos.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= MELEE_RANGE) {
      enemyInRange = enemy;
      break;
    }
  }

  if (enemyInRange) {
    // Perform melee attack
    enemyInRange.health -= MELEE_DAMAGE;
    if (enemyInRange.health <= 0) {
      bodiesToDestroy.push(enemyInRange.body);
      enemiesToRemove.push(enemyInRange);
    }
  } else {
    // Spawn the bullet slightly in front of the player
    const bulletSpawnDistance = (PLAYER_RADIUS + BULLET_RADIUS + 1) / SCALE;
    let bulletX = playerPos.x + Math.cos(angle) * bulletSpawnDistance;
    let bulletY = playerPos.y + Math.sin(angle) * bulletSpawnDistance;

    // Ensure bullet spawns within world boundaries
    bulletX = Math.min(Math.max(bulletX, BULLET_RADIUS / SCALE), WORLD_WIDTH / SCALE - BULLET_RADIUS / SCALE);
    bulletY = Math.min(Math.max(bulletY, BULLET_RADIUS / SCALE), WORLD_HEIGHT / SCALE - BULLET_RADIUS / SCALE);

    const bullet = world.createBody({
      type: 'dynamic',
      position: Vec2(bulletX, bulletY),
      bullet: true,
      fixedRotation: true,
    });

    bullet.createFixture(Circle(BULLET_RADIUS / SCALE), {
      density: 1,
      friction: 0,
      restitution: 0, // No bouncing!
      userData: 'bullet',
      filterCategoryBits: CATEGORY_BULLET,
      filterMaskBits: CATEGORY_ENEMY | CATEGORY_WALL, // Bullets collide with enemies and walls only
    });

    const velocity = Vec2(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);
    bullet.setLinearVelocity(velocity);

    // Add a custom property to track bullet distance traveled
    bullet.startPosition = bullet.getPosition().clone();

    bullets.push(bullet);
  }
}

// Spawn enemies periodically with health
function spawnEnemy() {
  // Limit the number of enemies
  if (enemies.length >= MAX_ENEMIES) {
    return;
  }

  // Choose a random spawn point
  const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  const x = spawnPoint.x;
  const y = spawnPoint.y;

  const enemy = {
    body: world.createBody({
      type: 'dynamic',
      position: Vec2(x / SCALE, y / SCALE),
    }),
    health: ENEMY_HEALTH,
    maxHealth: ENEMY_HEALTH,
    speed: ENEMY_SPEED,
  };

  enemy.body.createFixture(Circle(ENEMY_RADIUS / SCALE), {
    density: 1,
    friction: 0.3,
    restitution: 0.0, // No bouncing!
    userData: 'enemy',
    filterCategoryBits: CATEGORY_ENEMY,
    filterMaskBits: CATEGORY_PLAYER | CATEGORY_WALL | CATEGORY_BULLET,
  });

  // Make sure enemies are affected by walls
  enemy.body.setLinearDamping(0.5); // Add some damping

  enemies.push(enemy);
}

// Collision handling using Planck.js collision callbacks
world.on('begin-contact', (contact) => {
  const fixtureA = contact.getFixtureA();
  const fixtureB = contact.getFixtureB();

  const userDataA = fixtureA.getUserData();
  const userDataB = fixtureB.getUserData();

  // Bullet hits wall
  if ((userDataA === 'bullet' && userDataB === 'wall') || (userDataA === 'wall' && userDataB === 'bullet')) {
    let bulletFixture = userDataA === 'bullet' ? fixtureA : fixtureB;
    let bulletBody = bulletFixture.getBody();

    // Mark bullet for destruction
    bodiesToDestroy.push(bulletBody);
    bulletsToRemove.push(bulletBody);
  }

  // Bullet hits enemy
  if ((userDataA === 'bullet' && userDataB === 'enemy') || (userDataA === 'enemy' && userDataB === 'bullet')) {
    let bulletFixture = userDataA === 'bullet' ? fixtureA : fixtureB;
    let enemyFixture = userDataA === 'enemy' ? fixtureA : fixtureB;

    let bulletBody = bulletFixture.getBody();
    let enemyBody = enemyFixture.getBody();

    // Find the enemy in the enemies array
    let enemy = enemies.find((e) => e.body === enemyBody);
    if (enemy) {
      // Reduce enemy's health
      enemy.health -= BULLET_DAMAGE;
      if (enemy.health <= 0) {
        // Mark enemy for destruction
        bodiesToDestroy.push(enemyBody);
        enemiesToRemove.push(enemy);
      }
    }

    // Mark bullet for destruction
    bodiesToDestroy.push(bulletBody);
    bulletsToRemove.push(bulletBody);
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
  if (shooting && timestamp - lastShotTime > SHOT_INTERVAL) {
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

  // Destroy bodies that were marked for destruction
  for (let body of bodiesToDestroy) {
    world.destroyBody(body);
  }
  bodiesToDestroy.length = 0;

  // Remove bullets from bullets array
  for (let bulletBody of bulletsToRemove) {
    let index = bullets.findIndex((b) => b === bulletBody);
    if (index !== -1) {
      bullets.splice(index, 1);
    }
  }
  bulletsToRemove.length = 0;

  // Remove enemies from enemies array
  for (let enemy of enemiesToRemove) {
    let index = enemies.indexOf(enemy);
    if (index !== -1) {
      enemies.splice(index, 1);
    }
  }
  enemiesToRemove.length = 0;

  // Remove bullets that have traveled max distance
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const bulletPos = bullet.getPosition();

    const startPos = bullet.startPosition;
    const distanceTraveled = bulletPos.clone().sub(startPos).length();

    if (distanceTraveled > BULLET_MAX_DISTANCE) {
      bodiesToDestroy.push(bullet);
      bulletsToRemove.push(bullet);
      continue;
    }

    // Remove bullets that are off world
    if (bulletPos.x < -1 || bulletPos.x > WORLD_WIDTH / SCALE + 1 || bulletPos.y < -1 || bulletPos.y > WORLD_HEIGHT / SCALE + 1) {
      bodiesToDestroy.push(bullet);
      bulletsToRemove.push(bullet);
      continue;
    }
  }

  // Update camera position to center on player, clamped to level boundaries
  cameraX = playerPos.x * SCALE - canvas.width / 2;
  cameraY = playerPos.y * SCALE - canvas.height / 2;

  // Clamp camera to level boundaries
  cameraX = Math.max(0, Math.min(cameraX, WORLD_WIDTH - canvas.width));
  cameraY = Math.max(0, Math.min(cameraY, WORLD_HEIGHT - canvas.height));

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Save context and translate
  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // Draw ground grid
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;

  for (let x = 0; x <= WORLD_WIDTH; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= WORLD_HEIGHT; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }

  // Draw level walls
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 5;

  // Left wall
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, WORLD_HEIGHT);
  ctx.stroke();

  // Right wall
  ctx.beginPath();
  ctx.moveTo(WORLD_WIDTH, 0);
  ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
  ctx.stroke();

  // Top wall
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(WORLD_WIDTH, 0);
  ctx.stroke();

  // Bottom wall
  ctx.beginPath();
  ctx.moveTo(0, WORLD_HEIGHT);
  ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
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
  ctx.arc(playerPos.x * SCALE, playerPos.y * SCALE, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();

  // Draw bullets
  ctx.fillStyle = '#eee';
  bullets.forEach((bullet) => {
    const pos = bullet.getPosition();
    ctx.beginPath();
    ctx.arc(pos.x * SCALE, pos.y * SCALE, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw enemies and their health bars
  enemies.forEach((enemy) => {
    ctx.fillStyle = 'red';
    const pos = enemy.body.getPosition();
    ctx.beginPath();
    ctx.arc(pos.x * SCALE, pos.y * SCALE, ENEMY_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Draw health bar above enemy
    const healthBarWidth = 40;
    const healthBarHeight = 5;
    const healthPercentage = enemy.health / enemy.maxHealth;
    const healthBarX = pos.x * SCALE - healthBarWidth / 2;
    const healthBarY = pos.y * SCALE - ENEMY_RADIUS - 20;

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

  // Spawn new enemies
  if (Math.random() < 0.02) {
    spawnEnemy();
  }

  requestAnimationFrame(update);
}

// Start the game loop
update();
