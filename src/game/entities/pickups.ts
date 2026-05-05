import Phaser from "phaser";
import {
  selectPickupMergeTarget,
  type PickupMergeCandidate,
  type PickupType
} from "../../domain/pickups";
import type { PickupSprite } from "./types";

export function spawnPickupEntity(input: {
  scene: Phaser.Scene;
  pickups: Phaser.Physics.Arcade.Group;
  type: PickupType;
  x: number;
  y: number;
  value: number;
}): PickupSprite | null {
  const pickup = input.pickups.get(input.x, input.y, getPickupTexture(input.type)) as PickupSprite | null;

  if (!pickup) {
    return null;
  }

  pickup.pickupType = input.type;
  pickup.value = input.value;
  pickup.setActive(true);
  pickup.setVisible(true);
  pickup.enableBody(true, input.x, input.y, true, true);
  pickup.setDepth(10);
  pickup.setScale(0.65);
  pickup.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(-40, 40));
  pickup.setDrag(260);
  input.scene.tweens.add({
    targets: pickup,
    scale: 1,
    duration: 180,
    ease: "Back.easeOut"
  });

  return pickup;
}

export function mergePickupValue(input: {
  pickups: Phaser.Physics.Arcade.Group;
  type: PickupType;
  x: number;
  y: number;
  value: number;
  onMerged: (pickup: PickupSprite) => void;
}): boolean {
  const activePickups = input.pickups
    .getChildren()
    .map((child, index) => ({ pickup: child as PickupSprite, id: String(index) }))
    .filter(({ pickup }) => pickup.active);
  const candidates: PickupMergeCandidate[] = activePickups.map(({ pickup, id }) => ({
    id,
    type: pickup.pickupType,
    x: pickup.x,
    y: pickup.y,
    value: pickup.value
  }));
  const target = selectPickupMergeTarget({
    type: input.type,
    x: input.x,
    y: input.y,
    candidates
  });

  if (!target) {
    return false;
  }

  const targetPickup = activePickups.find(({ id }) => id === target.id)?.pickup;

  if (!targetPickup) {
    return false;
  }

  targetPickup.value += input.value;
  input.onMerged(targetPickup);

  return true;
}

export function updatePickupMovement(input: {
  pickups: Phaser.Physics.Arcade.Group;
  player: Phaser.Physics.Arcade.Image;
  pickupRadius: number;
  collectRadius: number;
  dt: number;
  onCollect: (pickup: PickupSprite) => void;
}): void {
  for (const child of input.pickups.getChildren()) {
    const pickup = child as PickupSprite;

    if (!pickup.active) {
      continue;
    }

    const distance = Phaser.Math.Distance.Between(input.player.x, input.player.y, pickup.x, pickup.y);

    if (distance <= input.pickupRadius) {
      const direction = new Phaser.Math.Vector2(input.player.x - pickup.x, input.player.y - pickup.y);

      if (direction.lengthSq() > 0) {
        direction.normalize();
        pickup.x += direction.x * 320 * input.dt;
        pickup.y += direction.y * 320 * input.dt;
      }
    }

    if (distance <= input.collectRadius) {
      input.onCollect(pickup);
    }
  }
}

export function getPickupFxColor(type: PickupType): number {
  return type === "xp" ? 0x69d7ff : 0xe6d1a3;
}

function getPickupTexture(type: PickupType): "xp" | "bones" {
  return type === "xp" ? "xp" : "bones";
}
