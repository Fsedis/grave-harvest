import { getWeaponDefinition, type WeaponDefinition } from "../data/weapons";

export type Rarity = "common" | "uncommon" | "rare";

export type WeaponStatOverrides = {
  damageMultiplier: number;
  cooldownMultiplier: number;
  areaMultiplier: number;
  projectileBonus: number;
  extraPulses: number;
  burn: boolean;
  bleed: boolean;
};

export type UpgradeState = {
  maxHp: number;
  moveSpeed: number;
  pickupRadius: number;
  damageMultiplier: number;
  attackSpeedMultiplier: number;
  cooldownReduction: number;
  areaMultiplier: number;
  projectileBonus: number;
  critChance: number;
  critDamage: number;
  weapons: string[];
  weaponStats: Record<string, WeaponStatOverrides>;
  upgrades: Record<string, number>;
};

export type DerivedWeaponStats = WeaponDefinition & {
  damage: number;
  cooldown: number;
  radius: number;
  projectileCount: number;
  pulseCount: number;
  burn: boolean;
  bleed: boolean;
};

export type UpgradeDefinition = {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  maxStacks: number;
  requirements?: {
    weaponOwned?: string;
    weaponNotOwned?: string;
    maxWeaponsNotReached?: boolean;
  };
  apply: (state: UpgradeState) => void;
};

const GAMEPLAY_IMPLEMENTED_WEAPONS = new Set([
  "bone_knives",
  "holy_candle",
  "grave_bell",
  "crow_swarm"
]);

export function createInitialUpgradeState(): UpgradeState {
  return {
    maxHp: 100,
    moveSpeed: 180,
    pickupRadius: 70,
    damageMultiplier: 1,
    attackSpeedMultiplier: 1,
    cooldownReduction: 0,
    areaMultiplier: 1,
    projectileBonus: 0,
    critChance: 0.05,
    critDamage: 1.5,
    weapons: ["bone_knives"],
    weaponStats: {
      bone_knives: createWeaponStatOverrides()
    },
    upgrades: {}
  };
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "damage_up",
    name: "Grave Strength",
    description: "+15% global damage.",
    rarity: "common",
    maxStacks: 5,
    apply: (state) => {
      state.damageMultiplier *= 1.15;
    }
  },
  {
    id: "attack_speed_up",
    name: "Faster Rites",
    description: "+12% attack speed.",
    rarity: "common",
    maxStacks: 5,
    apply: (state) => {
      state.attackSpeedMultiplier *= 1.12;
    }
  },
  {
    id: "move_speed_up",
    name: "Restless Feet",
    description: "+10% movement speed.",
    rarity: "common",
    maxStacks: 3,
    apply: (state) => {
      state.moveSpeed *= 1.1;
    }
  },
  {
    id: "max_hp_up",
    name: "Grave Flesh",
    description: "+20 max HP.",
    rarity: "common",
    maxStacks: 5,
    apply: (state) => {
      state.maxHp += 20;
    }
  },
  {
    id: "pickup_radius_up",
    name: "Soul Magnet",
    description: "+25% pickup radius.",
    rarity: "common",
    maxStacks: 4,
    apply: (state) => {
      state.pickupRadius *= 1.25;
    }
  },
  {
    id: "area_up",
    name: "Wider Curse",
    description: "+15% area size.",
    rarity: "common",
    maxStacks: 4,
    apply: (state) => {
      state.areaMultiplier *= 1.15;
    }
  },
  {
    id: "cooldown_down",
    name: "Shorter Prayers",
    description: "-10% weapon cooldowns.",
    rarity: "uncommon",
    maxStacks: 4,
    apply: (state) => {
      state.cooldownReduction = Math.min(0.6, state.cooldownReduction + 0.1);
    }
  },
  {
    id: "crit_chance_up",
    name: "Death's Luck",
    description: "+7% crit chance.",
    rarity: "uncommon",
    maxStacks: 4,
    apply: (state) => {
      state.critChance += 0.07;
    }
  },
  {
    id: "knife_projectile",
    name: "Extra Bone Knife",
    description: "Bone Knives fire +1 projectile.",
    rarity: "uncommon",
    maxStacks: 3,
    requirements: {
      weaponOwned: "bone_knives"
    },
    apply: (state) => {
      state.projectileBonus += 1;
      ensureWeaponStats(state, "bone_knives").projectileBonus += 1;
    }
  },
  {
    id: "candle_area",
    name: "Bigger Flame",
    description: "Holy Candle +20% radius.",
    rarity: "common",
    maxStacks: 4,
    requirements: {
      weaponOwned: "holy_candle"
    },
    apply: (state) => {
      ensureWeaponStats(state, "holy_candle").areaMultiplier *= 1.2;
    }
  },
  {
    id: "candle_damage",
    name: "Hotter Flame",
    description: "Holy Candle +20% damage.",
    rarity: "common",
    maxStacks: 4,
    requirements: {
      weaponOwned: "holy_candle"
    },
    apply: (state) => {
      ensureWeaponStats(state, "holy_candle").damageMultiplier *= 1.2;
    }
  },
  {
    id: "candle_burn",
    name: "Unholy Burn",
    description: "Holy Candle scorches enemies it touches.",
    rarity: "uncommon",
    maxStacks: 1,
    requirements: {
      weaponOwned: "holy_candle"
    },
    apply: (state) => {
      ensureWeaponStats(state, "holy_candle").burn = true;
    }
  },
  {
    id: "bell_cooldown",
    name: "Faster Bell",
    description: "Grave Bell -20% cooldown.",
    rarity: "common",
    maxStacks: 3,
    requirements: {
      weaponOwned: "grave_bell"
    },
    apply: (state) => {
      ensureWeaponStats(state, "grave_bell").cooldownMultiplier *= 0.8;
    }
  },
  {
    id: "bell_area",
    name: "Deeper Toll",
    description: "Grave Bell +25% radius.",
    rarity: "common",
    maxStacks: 3,
    requirements: {
      weaponOwned: "grave_bell"
    },
    apply: (state) => {
      ensureWeaponStats(state, "grave_bell").areaMultiplier *= 1.25;
    }
  },
  {
    id: "bell_double_pulse",
    name: "Second Toll",
    description: "Grave Bell triggers a second delayed pulse.",
    rarity: "rare",
    maxStacks: 1,
    requirements: {
      weaponOwned: "grave_bell"
    },
    apply: (state) => {
      ensureWeaponStats(state, "grave_bell").extraPulses += 1;
    }
  },
  {
    id: "crow_extra",
    name: "More Crows",
    description: "Crow Swarm sends +1 crow.",
    rarity: "uncommon",
    maxStacks: 3,
    requirements: {
      weaponOwned: "crow_swarm"
    },
    apply: (state) => {
      ensureWeaponStats(state, "crow_swarm").projectileBonus += 1;
    }
  },
  {
    id: "crow_damage",
    name: "Sharper Beaks",
    description: "Crow Swarm +20% damage.",
    rarity: "common",
    maxStacks: 4,
    requirements: {
      weaponOwned: "crow_swarm"
    },
    apply: (state) => {
      ensureWeaponStats(state, "crow_swarm").damageMultiplier *= 1.2;
    }
  },
  {
    id: "crow_bleed",
    name: "Carrion Mark",
    description: "Crows leave a bleeding wound.",
    rarity: "rare",
    maxStacks: 1,
    requirements: {
      weaponOwned: "crow_swarm"
    },
    apply: (state) => {
      ensureWeaponStats(state, "crow_swarm").bleed = true;
    }
  },
  {
    id: "unlock_candle",
    name: "Unlock Holy Candle",
    description: "Adds Holy Candle.",
    rarity: "common",
    maxStacks: 1,
    requirements: {
      weaponNotOwned: "holy_candle",
      maxWeaponsNotReached: true
    },
    apply: (state) => {
      addWeapon(state, "holy_candle");
    }
  },
  {
    id: "unlock_bell",
    name: "Unlock Grave Bell",
    description: "Adds Grave Bell.",
    rarity: "common",
    maxStacks: 1,
    requirements: {
      weaponNotOwned: "grave_bell",
      maxWeaponsNotReached: true
    },
    apply: (state) => {
      addWeapon(state, "grave_bell");
    }
  },
  {
    id: "unlock_crows",
    name: "Unlock Crow Swarm",
    description: "Adds Crow Swarm.",
    rarity: "common",
    maxStacks: 1,
    requirements: {
      weaponNotOwned: "crow_swarm",
      maxWeaponsNotReached: true
    },
    apply: (state) => {
      addWeapon(state, "crow_swarm");
    }
  }
];

export function getAvailableUpgrades(state: UpgradeState): UpgradeDefinition[] {
  return UPGRADE_DEFINITIONS.filter((upgrade) => {
    if ((state.upgrades[upgrade.id] ?? 0) >= upgrade.maxStacks) {
      return false;
    }

    if (upgrade.requirements?.weaponOwned && !state.weapons.includes(upgrade.requirements.weaponOwned)) {
      return false;
    }

    if (
      upgrade.requirements?.weaponNotOwned &&
      state.weapons.includes(upgrade.requirements.weaponNotOwned)
    ) {
      return false;
    }

    if (
      upgrade.requirements?.weaponNotOwned &&
      !GAMEPLAY_IMPLEMENTED_WEAPONS.has(upgrade.requirements.weaponNotOwned)
    ) {
      return false;
    }

    if (upgrade.requirements?.maxWeaponsNotReached && state.weapons.length >= 4) {
      return false;
    }

    return true;
  });
}

export function selectUpgradeOptions(
  state: UpgradeState,
  rng: () => number = Math.random,
  count = 3
): UpgradeDefinition[] {
  const pool = [...getAvailableUpgrades(state)];
  const options: UpgradeDefinition[] = [];

  while (pool.length > 0 && options.length < count) {
    const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    const [upgrade] = pool.splice(index, 1);
    options.push(upgrade);
  }

  if (options.length === 0) {
    const fallback = UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === "damage_up");

    if (fallback) {
      options.push(fallback);
    }
  }

  return options;
}

export function applyUpgrade(state: UpgradeState, upgradeId: string): void {
  const upgrade = UPGRADE_DEFINITIONS.find((definition) => definition.id === upgradeId);

  if (!upgrade) {
    throw new Error(`Unknown upgrade: ${upgradeId}`);
  }

  upgrade.apply(state);
  state.upgrades[upgradeId] = (state.upgrades[upgradeId] ?? 0) + 1;
}

function addWeapon(state: UpgradeState, weaponId: string): void {
  if (!state.weapons.includes(weaponId) && state.weapons.length < 4) {
    state.weapons.push(weaponId);
    ensureWeaponStats(state, weaponId);
  }
}

export function getDerivedWeaponStats(state: UpgradeState, weaponId: string): DerivedWeaponStats {
  const definition = getWeaponDefinition(weaponId);
  const overrides = ensureWeaponStats(state, weaponId);
  const globalCooldownMultiplier = Math.max(
    0.25,
    1 / state.attackSpeedMultiplier - state.cooldownReduction
  );
  const baseProjectileCount = definition.projectileCount ?? 1;
  const projectileBonus = weaponId === "bone_knives" ? state.projectileBonus : overrides.projectileBonus;

  return {
    ...definition,
    damage: definition.baseDamage * state.damageMultiplier * overrides.damageMultiplier,
    cooldown: definition.cooldown * globalCooldownMultiplier * overrides.cooldownMultiplier,
    radius: (definition.radius ?? definition.range) * state.areaMultiplier * overrides.areaMultiplier,
    projectileCount: baseProjectileCount + projectileBonus,
    pulseCount: 1 + overrides.extraPulses,
    burn: overrides.burn,
    bleed: overrides.bleed
  };
}

function ensureWeaponStats(state: UpgradeState, weaponId: string): WeaponStatOverrides {
  state.weaponStats[weaponId] ??= createWeaponStatOverrides();

  return state.weaponStats[weaponId];
}

function createWeaponStatOverrides(): WeaponStatOverrides {
  return {
    damageMultiplier: 1,
    cooldownMultiplier: 1,
    areaMultiplier: 1,
    projectileBonus: 0,
    extraPulses: 0,
    burn: false,
    bleed: false
  };
}
