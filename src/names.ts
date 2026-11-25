/**
 * Turns the setup textarea into a list of names: one per line, with extra
 * spaces collapsed and blank lines dropped. Duplicates are kept on purpose,
 * so the same name can appear on the wheel more than once.
 */
export function parseNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}
