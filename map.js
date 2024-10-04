import { Box, Vec2 } from 'planck';

export function createWalls(world, size) {
  const halfSize = size / 2;
  const thickness = 1;

  const wallLeft = world.createBody({ type: 'static' });
  wallLeft.createFixture({ shape: new Box(thickness, halfSize, Vec2(-halfSize, 0), 0) });
  const wallRight = world.createBody({ type: 'static' });
  wallRight.createFixture({ shape: new Box(thickness, halfSize, Vec2(halfSize, 0), 0) });
  const wallTop = world.createBody({ type: 'static' });
  wallTop.createFixture({ shape: new Box(halfSize, thickness, Vec2(0, halfSize), 0) });
  const wallBottom = world.createBody({ type: 'static' });
  wallBottom.createFixture({ shape: new Box(halfSize, thickness, Vec2(0, -halfSize), 0) });
}
