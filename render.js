import { Testbed } from 'planck/with-testbed';

export function renderTestbed(world, MAP_SIZE, player) {
  const testbed = Testbed.mount();

  testbed.width = MAP_SIZE;
  testbed.height = MAP_SIZE;
  testbed.start(world);

  const helperCircleRadius = 10;
  const helperCircleColor = testbed.color(0, 255, 0);

  testbed.step = function () {
    // Get player's position
    const position = player.getPosition();

    // Draw a circle around the player
    testbed.drawCircle(position, helperCircleRadius, helperCircleColor);
  };
}
