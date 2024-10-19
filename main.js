import { World, Vec2, Circle } from 'planck';

// Canvas setup
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

// Fullscreen canvas and resizing
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Physics world setup
const world = World();
const scale = 30; // pixels per meter

// Player
const player = {
  body: world.createBody({
    type: 'dynamic',
    position: Vec2(window.innerWidth / 2 / scale, window.innerHeight / 2 / scale),
    fixedRotation: true,
  }),
  radius: 15,
  speed: 5,
  bullets: [],
};

player.body.createFixture(Circle(player.radius / scale));

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
let shooting = false;
let lastShotTime = 0;
const shotInterval = 100; // Cooldown in milliseconds

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

// Update mouse position
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

shooting = true;

// Start shooting on mousedown
canvas.addEventListener('mousedown', () => {
  shooting = !shooting;
});

// Stop shooting on mouseup
canvas.addEventListener('mouseup', () => {
  //shooting = false;
});

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
  });

  bullet.createFixture(Circle(5 / scale), {
    density: 1,
    friction: 0,
    restitution: 0, // No bouncing!
  });

  const velocity = Vec2(Math.cos(angle) * 10, Math.sin(angle) * 10);
  bullet.setLinearVelocity(velocity);
  bullets.push(bullet);
}

// Spawn enemies periodically with health
function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;

  switch (side) {
    case 0: // top
      x = Math.random() * canvas.width;
      y = -20;
      break;
    case 1: // right
      x = canvas.width + 20;
      y = Math.random() * canvas.height;
      break;
    case 2: // bottom
      x = Math.random() * canvas.width;
      y = canvas.height + 20;
      break;
    case 3: // left
      x = -20;
      y = Math.random() * canvas.height;
      break;
  }

  const enemy = {
    body: world.createBody({
      type: 'dynamic',
      position: Vec2(x / scale, y / scale),
    }),
    health: 100, // Max health of the enemy
    maxHealth: 100,
  };

  enemy.body.createFixture(Circle(15 / scale), {
    density: 1,
    friction: 0.3,
    restitution: 0.0, // No bouncing!
  });

  enemies.push(enemy);
}

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
    direction.mul(2); // Enemy speed
    enemy.body.setLinearVelocity(direction);
  });

  // Update physics
  world.step(1 / 60);

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw player
  const pos = player.body.getPosition();
  ctx.beginPath();
  ctx.arc(pos.x * scale, pos.y * scale, player.radius, 0, Math.PI * 2);
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
  // Ensure enemies are red
  enemies.forEach((enemy) => {
    ctx.fillStyle = 'gray';
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

  // Collision detection
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bulletPos = bullets[i].getPosition();

    // Remove bullets that are off screen
    if (bulletPos.x < -1 || bulletPos.x > canvas.width / scale + 1 || bulletPos.y < -1 || bulletPos.y > canvas.height / scale + 1) {
      world.destroyBody(bullets[i]);
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
        world.destroyBody(bullets[i]);
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
