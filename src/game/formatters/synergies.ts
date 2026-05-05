export function formatSynergyHudLines(names: string[]): string[] {
  const visibleNames = names.slice(0, 3);

  if (names.length > visibleNames.length) {
    visibleNames.push(`+${names.length - visibleNames.length}`);
  }

  return visibleNames;
}
