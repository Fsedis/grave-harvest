import Phaser from "phaser";

export function clearPhysicsGroups(groups: Phaser.Physics.Arcade.Group[]): void {
  groups.forEach((group) => group.clear(true, true));
}
