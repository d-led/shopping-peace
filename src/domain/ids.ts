/** Identifiers are only ever compared inside one browser, never sent anywhere. */
export function newId(): string {
  return crypto.randomUUID();
}
