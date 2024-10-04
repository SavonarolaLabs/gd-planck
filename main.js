import { World } from 'planck/with-testbed';
import { Vec2, Circle } from 'planck';
import { renderTestbed } from './render';
import { createWalls } from './map';
const world = new World();

let player = world.createBody({
  type: 'dynamic',
  position: new Vec2(0, 0),
});

player.createFixture({
  shape: new Circle(Vec2(0, 0), 0.25),
  density: 0.5,
  friction: 0.0,
  restitution: 0.5,
});

const MAP_SIZE = 150;

createWalls(world, MAP_SIZE);

const maxSpeed = 20;

function applyMovementForceToPlayer(body, keys) {
  const str = 10;
  const force = new Vec2(keys.x * str, keys.y * str);

  body.applyForceToCenter(force);

  const velocity = body.getLinearVelocity();

  if (velocity.length() > maxSpeed) {
    body.setLinearVelocity(velocity.clone().mul(maxSpeed / velocity.length()));
  }
  console.log(velocity);
}

function reset() {
  const zeroVec2 = new Vec2(0, 0);
  player.setPosition(zeroVec2);
  player.setLinearVelocity(zeroVec2);
}

const keys = {
  x: 0,
  y: 0,
};

function addMovementControls(player, keys) {
  document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
      case 'r':
        reset();
        break;
      case 'w':
        keys.y = 1;
        break;
      case 's':
        keys.y = -1;
        break;
      case 'a':
        keys.x = -1;
        break;
      case 'd':
        keys.x = 1;
        break;
      default:
        return;
    }

    applyMovementForceToPlayer(player, keys);
  });

  document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
      case 'w':
      case 's':
        keys.y = 0;
        break;
      case 'a':
      case 'd':
        keys.x = 0;
        break;
      default:
        return;
    }
  });
}

addMovementControls(player, keys);

renderTestbed(world, MAP_SIZE, player);
