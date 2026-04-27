export type WeaponDefinition = {
  id: string;
  name: string;
  type: "projectile" | "aura" | "pulse" | "summon";
  baseDamage: number;
  cooldown: number;
  range: number;
  radius?: number;
  projectileSpeed?: number;
  projectileCount?: number;
  pierce?: number;
  tickRate?: number;
};

export const WEAPON_DEFINITIONS: WeaponDefinition[] = [
  {
    id: "bone_knives",
    name: "Bone Knives",
    type: "projectile",
    baseDamage: 10,
    cooldown: 0.8,
    range: 550,
    projectileSpeed: 420,
    projectileCount: 1,
    pierce: 0
  },
  {
    id: "holy_candle",
    name: "Holy Candle",
    type: "aura",
    baseDamage: 4,
    cooldown: 0.5,
    range: 110,
    radius: 110,
    tickRate: 0.5
  },
  {
    id: "grave_bell",
    name: "Grave Bell",
    type: "pulse",
    baseDamage: 18,
    cooldown: 4,
    range: 180,
    radius: 180
  },
  {
    id: "crow_swarm",
    name: "Crow Swarm",
    type: "summon",
    baseDamage: 12,
    cooldown: 1.2,
    range: 650,
    projectileCount: 1
  }
];

export function getWeaponDefinition(id: string): WeaponDefinition {
  const weapon = WEAPON_DEFINITIONS.find((definition) => definition.id === id);

  if (!weapon) {
    throw new Error(`Unknown weapon definition: ${id}`);
  }

  return weapon;
}
