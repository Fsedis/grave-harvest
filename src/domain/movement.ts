export type Vector2Like = {
  x: number;
  y: number;
};

export type InputDirectionState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

export type VelocityStepInput = {
  current: Vector2Like;
  target: Vector2Like;
  acceleration: number;
  deceleration: number;
  dt: number;
};

export type ContactKnockbackInput = {
  player: Vector2Like;
  enemy: Vector2Like;
  speed: number;
};

export function getInputDirection(input: InputDirectionState): Vector2Like {
  const x = Number(input.right) - Number(input.left);
  const y = Number(input.down) - Number(input.up);
  const length = Math.hypot(x, y);

  if (length <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length
  };
}

export function stepVelocityTowardTarget({
  current,
  target,
  acceleration,
  deceleration,
  dt
}: VelocityStepInput): Vector2Like {
  const deltaX = target.x - current.x;
  const deltaY = target.y - current.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance <= 0) {
    return { ...target };
  }

  const targetHasInput = Math.hypot(target.x, target.y) > 0;
  const maxStep = Math.max(0, (targetHasInput ? acceleration : deceleration) * dt);

  if (distance <= maxStep) {
    return { ...target };
  }

  return {
    x: current.x + (deltaX / distance) * maxStep,
    y: current.y + (deltaY / distance) * maxStep
  };
}

export function getContactKnockback({ player, enemy, speed }: ContactKnockbackInput): Vector2Like {
  const offsetX = player.x - enemy.x;
  const offsetY = player.y - enemy.y;
  const length = Math.hypot(offsetX, offsetY);

  if (length <= 0) {
    return { x: speed, y: 0 };
  }

  return {
    x: (offsetX / length) * speed,
    y: (offsetY / length) * speed
  };
}

export function getSeparationPadding(enemyId: string): number {
  if (enemyId === "grave_rat") {
    return 5;
  }

  if (enemyId === "rot_walker") {
    return 11;
  }

  if (enemyId === "bone_knight") {
    return 14;
  }

  if (enemyId === "ghost") {
    return 8;
  }

  return 9;
}

export function getSeparationWeight(enemyId: string): number {
  if (enemyId === "grave_rat") {
    return 0.7;
  }

  if (enemyId === "rot_walker") {
    return 1.16;
  }

  if (enemyId === "bone_knight") {
    return 1.3;
  }

  if (enemyId === "ghost") {
    return 0.86;
  }

  return 1;
}
