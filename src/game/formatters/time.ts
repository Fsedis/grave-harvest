export function formatTimer(timeElapsed: number): string {
  const totalSeconds = Math.floor(timeElapsed);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
