export type WeaponHudStats = {
  cooldown: number;
  projectileCount: number;
  pulseCount: number;
  radius: number;
};

export function getWeaponIconTexture(weaponId: string): string {
  if (weaponId === "holy_candle") {
    return "weapon_holy_candle";
  }

  if (weaponId === "grave_bell") {
    return "weapon_grave_bell";
  }

  if (weaponId === "crow_swarm") {
    return "weapon_crow_swarm";
  }

  return "weapon_bone_knives";
}

export function formatWeaponName(weaponId: string): string {
  if (weaponId === "holy_candle") {
    return "Святая свеча";
  }

  if (weaponId === "grave_bell") {
    return "Могильный колокол";
  }

  if (weaponId === "crow_swarm") {
    return "Стая ворон";
  }

  return "Костяные ножи";
}

export function formatWeaponHudLine(weaponId: string, stats: WeaponHudStats): string {
  if (weaponId === "holy_candle") {
    return `Святая свеча  r${Math.round(stats.radius)}  ${stats.cooldown.toFixed(1)}с`;
  }

  if (weaponId === "grave_bell") {
    return `Могильный колокол  x${stats.pulseCount}  ${stats.cooldown.toFixed(1)}с`;
  }

  if (weaponId === "crow_swarm") {
    return `Стая ворон  x${stats.projectileCount}  ${stats.cooldown.toFixed(1)}с`;
  }

  return `Костяные ножи  x${stats.projectileCount}  ${stats.cooldown.toFixed(1)}с`;
}
