export function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}
