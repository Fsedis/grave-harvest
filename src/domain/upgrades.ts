export type Rarity = "common" | "uncommon" | "rare";

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
  upgrades: Record<string, number>;
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
      state.areaMultiplier *= 1.2;
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
  }
}
