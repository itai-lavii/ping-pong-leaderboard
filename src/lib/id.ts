export function makeId(name: string, existingIds: string[]): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let id = base;
  let suffix = 1;
  while (existingIds.includes(id)) {
    id = `${base}-${suffix++}`;
  }
  return id;
}
