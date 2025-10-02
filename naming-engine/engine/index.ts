import namingMapJson from '../naming.schema.json' assert { type: 'json' };

export type NamingMap = Record<string, string>;

type NormalisedLookup = {
  readonly shortToFull: NamingMap;
  readonly fullToShort: Map<string, string>;
};

const { shortToFull, fullToShort } = initialiseLookups(namingMapJson as NamingMap);

function initialiseLookups(map: NamingMap): NormalisedLookup {
  const shortEntries = Object.entries(map);
  const shortToFull: NamingMap = {};
  const fullToShort = new Map<string, string>();

  for (const [short, full] of shortEntries) {
    const trimmedShort = short.trim();
    const trimmedFull = full.trim();

    if (!trimmedShort || !trimmedFull) {
      continue;
    }

    shortToFull[trimmedShort] = trimmedFull;
    fullToShort.set(normaliseFullName(trimmedFull), trimmedShort);
  }

  return { shortToFull, fullToShort };
}

function normaliseFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getShortName(fullName: string): string | null {
  if (!fullName) return null;
  return fullToShort.get(normaliseFullName(fullName)) ?? null;
}

export function getFullName(shortName: string): string | null {
  if (!shortName) return null;
  return shortToFull[shortName.trim()] ?? null;
}

export function hasShortName(shortName: string): boolean {
  return getFullName(shortName) !== null;
}

export function hasFullName(fullName: string): boolean {
  return getShortName(fullName) !== null;
}

export function getAllMappings(): ReadonlyArray<{ short: string; full: string }> {
  return Object.entries(shortToFull).map(([short, full]) => ({ short, full }));
}
