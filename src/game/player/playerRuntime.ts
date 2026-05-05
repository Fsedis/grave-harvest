import Phaser from "phaser";
import {
  getContactKnockback,
  getInputDirection,
  stepVelocityTowardTarget
} from "../../domain/movement";

export const PLAYER_RADIUS = 16;
export const PLAYER_INVULNERABILITY_SECONDS = 0.45;

const PLAYER_ACCELERATION = 1550;
const PLAYER_DECELERATION = 2200;
const PLAYER_CONTACT_KNOCKBACK_SPEED = 260;
const PLAYER_CONTACT_KNOCKBACK_SECONDS = 0.16;
const PLAYER_DEPTH = 20;
const PLAYER_BODY_SIZE = 28;
const CAMERA_FOLLOW_LERP = 0.14;

export type PlayerInputState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

export type PlayerWasdKeys = Record<"w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

export type PlayerKnockbackState = {
  until: number;
  velocity: {
    x: number;
    y: number;
  };
};

export function createIdlePlayerKnockback(): PlayerKnockbackState {
  return {
    until: 0,
    velocity: { x: 0, y: 0 }
  };
}

export function createPlayer(scene: Phaser.Scene, mapSize: number): Phaser.Physics.Arcade.Image {
  const player = scene.physics.add.image(mapSize / 2, mapSize / 2, "player");
  player.setDepth(PLAYER_DEPTH);
  player.setCollideWorldBounds(true);
  player.setSize(PLAYER_BODY_SIZE, PLAYER_BODY_SIZE);
  scene.cameras.main.startFollow(player, true, CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_LERP);

  return player;
}

export function resetPlayerForRun(
  scene: Phaser.Scene,
  player: Phaser.Physics.Arcade.Image,
  mapSize: number
): PlayerKnockbackState {
  player.enableBody(true, mapSize / 2, mapSize / 2, true, true);
  player.clearTint();
  player.setVelocity(0, 0);
  scene.cameras.main.startFollow(player, true, CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_LERP);

  return createIdlePlayerKnockback();
}

export function stopPlayer(player: Phaser.Physics.Arcade.Image): PlayerKnockbackState {
  player.setVelocity(0, 0);

  return createIdlePlayerKnockback();
}

export function readPlayerInput(
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  wasd: PlayerWasdKeys
): PlayerInputState {
  return {
    left: Boolean(cursors.left?.isDown || wasd.a.isDown),
    right: Boolean(cursors.right?.isDown || wasd.d.isDown),
    up: Boolean(cursors.up?.isDown || wasd.w.isDown),
    down: Boolean(cursors.down?.isDown || wasd.s.isDown)
  };
}

export function updatePlayerMovement(input: {
  player: Phaser.Physics.Arcade.Image;
  controls: PlayerInputState;
  moveSpeed: number;
  timeElapsed: number;
  knockback: PlayerKnockbackState;
  dt: number;
}): PlayerKnockbackState {
  const direction = getInputDirection(input.controls);
  const targetVelocity = {
    x: direction.x * input.moveSpeed,
    y: direction.y * input.moveSpeed
  };
  const body = input.player.body as Phaser.Physics.Arcade.Body | null;
  const knockbackActive = input.timeElapsed < input.knockback.until;
  const activeKnockback = knockbackActive ? input.knockback.velocity : { x: 0, y: 0 };
  const currentVelocity = body
    ? {
        x: body.velocity.x - activeKnockback.x,
        y: body.velocity.y - activeKnockback.y
      }
    : {
        x: 0,
        y: 0
      };
  const nextVelocity = stepVelocityTowardTarget({
    current: currentVelocity,
    target: targetVelocity,
    acceleration: PLAYER_ACCELERATION,
    deceleration: PLAYER_DECELERATION,
    dt: input.dt
  });

  if (knockbackActive) {
    nextVelocity.x += activeKnockback.x;
    nextVelocity.y += activeKnockback.y;
  }

  input.player.setVelocity(nextVelocity.x, nextVelocity.y);

  return knockbackActive ? input.knockback : createIdlePlayerKnockback();
}

export function applyPlayerHitFeedback(input: {
  scene: Phaser.Scene;
  player: Phaser.Physics.Arcade.Image;
  currentKnockback: PlayerKnockbackState;
  timeElapsed: number;
  source?: { x: number; y: number };
  isPlaying: () => boolean;
  shakeCamera: (durationMs: number, intensity: number) => void;
  playSfx: () => void;
  createBurst: (
    x: number,
    y: number,
    color: number,
    count: number,
    distance: number,
    duration: number
  ) => void;
  createRingBurst: (x: number, y: number, color: number, radius: number) => void;
}): PlayerKnockbackState {
  const nextKnockback = input.source
    ? {
        until: input.timeElapsed + PLAYER_CONTACT_KNOCKBACK_SECONDS,
        velocity: getContactKnockback({
          player: {
            x: input.player.x,
            y: input.player.y
          },
          enemy: input.source,
          speed: PLAYER_CONTACT_KNOCKBACK_SPEED
        })
      }
    : input.currentKnockback;

  input.player.setTintFill(0xff5a54);
  input.shakeCamera(120, 0.006);
  input.playSfx();
  input.createBurst(input.player.x, input.player.y, 0xff5a54, 5, 22, 150);
  input.createRingBurst(input.player.x, input.player.y, 0xff5a54, PLAYER_RADIUS + 14);
  input.scene.time.delayedCall(90, () => {
    if (input.isPlaying()) {
      input.player.clearTint();
    }
  });

  return nextKnockback;
}
