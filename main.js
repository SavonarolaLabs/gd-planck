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
    position: Vec2(400 / scale, 300 / scale),
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

// Shooting mechanics
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const playerPos = player.body.getPosition();
  const angle = Math.atan2(mouseY - playerPos.y * scale, mouseX - playerPos.x * scale);

  const bullet = world.createBody({
    type: 'dynamic',
    position: Vec2(playerPos.x, playerPos.y),
    bullet: true,
  });

  bullet.createFixture(Circle(5 / scale), {
    density: 1,
    friction: 0,
    restitution: 0,
  });

  const velocity = Vec2(Math.cos(angle) * 10, Math.sin(angle) * 10);
  bullet.setLinearVelocity(velocity);
  bullets.push(bullet);
});

// Spawn enemies periodically
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

  const enemy = world.createBody({
    type: 'dynamic',
    position: Vec2(x / scale, y / scale),
  });

  enemy.createFixture(Circle(15 / scale), {
    density: 1,
    friction: 0.3,
    restitution: 0.2,
  });

  enemies.push(enemy);
}

// Game loop
function update() {
  // Player movement
  const velocity = Vec2(0, 0);
  if (keys.up) velocity.y -= player.speed;
  if (keys.down) velocity.y += player.speed;
  if (keys.left) velocity.x -= player.speed;
  if (keys.right) velocity.x += player.speed;
  player.body.setLinearVelocity(velocity);

  // Move enemies towards player
  const playerPos = player.body.getPosition();
  enemies.forEach((enemy) => {
    const enemyPos = enemy.getPosition();
    const direction = Vec2(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
    direction.normalize();
    direction.mul(2); // Enemy speed
    enemy.setLinearVelocity(direction);
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
  ctx.fillStyle = 'blue';
  ctx.fill();

  // Draw bullets
  ctx.fillStyle = 'yellow';
  bullets.forEach((bullet) => {
    const pos = bullet.getPosition();
    ctx.beginPath();
    ctx.arc(pos.x * scale, pos.y * scale, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw enemies
  ctx.fillStyle = 'red';
  enemies.forEach((enemy) => {
    const pos = enemy.getPosition();
    ctx.beginPath();
    ctx.arc(pos.x * scale, pos.y * scale, 15, 0, Math.PI * 2);
    ctx.fill();
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
      const enemyPos = enemies[j].getPosition();
      const dx = bulletPos.x - enemyPos.x;
      const dy = bulletPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (15 + 5) / scale) {
        world.destroyBody(bullets[i]);
        bullets.splice(i, 1);
        world.destroyBody(enemies[j]);
        enemies.splice(j, 1);
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
