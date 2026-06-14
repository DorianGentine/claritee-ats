import type { PrismaClient } from "@prisma/client";

const PHOTON_BASE_URL = "https://photon.komoot.io/api";
const PHOTON_BBOX = "-10,35,40,72"; // Europe

const CITY_LIST = [
  // France — grandes villes
  "Paris",
  "Lyon",
  "Marseille",
  "Toulouse",
  "Bordeaux",
  "Lille",
  "Nantes",
  "Strasbourg",
  "Nice",
  "Rennes",
  "Grenoble",
  "Montpellier",
  "Reims",
  "Tours",
  "Saint-Étienne",
  "Dijon",
  "Angers",
  "Nîmes",
  "Le Havre",
  "Brest",
  "Limoges",
  "Clermont-Ferrand",
  "Toulon",
  "Amiens",
  "Metz",
  "Nancy",
  "Caen",
  "Orléans",
  "Rouen",
  "Mulhouse",
  "Perpignan",
  "Besançon",
  "Valenciennes",
  "Pau",
  "Bayonne",
  "Cannes",
  "Ajaccio",
  "Dunkerque",
  "Annecy",
  "Chambéry",
  "Biarritz",
  "La Rochelle",
  "Poitiers",
  "Roubaix",
  "Tourcoing",
  "Villeurbanne",
  "Avignon",
  "Saint-Denis",
  "Argenteuil",
  "Montreuil",
  "Aix-en-Provence",
  "Versailles",
  "Nanterre",
  "Créteil",
  "Mérignac",
  "Pessac",
  // Belgique
  "Bruxelles",
  "Liège",
  "Anvers",
  "Gand",
  "Bruges",
  "Namur",
  "Leuven",
  // Suisse
  "Genève",
  "Zurich",
  "Berne",
  "Lausanne",
  "Bâle",
  "Lucerne",
  "Saint-Gall",
  // Luxembourg
  "Luxembourg",
];

interface PhotonFeature {
  properties: {
    name: string;
    state?: string;
    country?: string;
  };
  geometry: {
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const fetchCityFromPhoton = async (
  cityName: string
): Promise<{
  name: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
} | null> => {
  const url = `${PHOTON_BASE_URL}/?q=${encodeURIComponent(cityName)}&lang=fr&limit=1&layer=city&bbox=${PHOTON_BBOX}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Photon HTTP ${response.status} pour "${cityName}"`);
  }

  const data = (await response.json()) as PhotonResponse;

  if (!data.features || data.features.length === 0) {
    return null;
  }

  const feature = data.features[0];
  const { name, state, country } = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;

  if (!name || !country) {
    return null;
  }

  return {
    name,
    region: state ?? null,
    country,
    latitude,
    longitude,
  };
};

export const seedCities = async (prisma: PrismaClient): Promise<void> => {
  console.warn(`\n🌍 Seed des villes — ${CITY_LIST.length} villes cibles\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const cityName of CITY_LIST) {
    try {
      const cityData = await fetchCityFromPhoton(cityName);

      if (!cityData) {
        console.warn(`[SKIP] ${cityName} — aucun résultat Photon`);
        skipped++;
        await sleep(200);
        continue;
      }

      await prisma.city.upsert({
        where: {
          name_country: {
            name: cityData.name,
            country: cityData.country,
          },
        },
        create: {
          name: cityData.name,
          region: cityData.region,
          country: cityData.country,
          latitude: cityData.latitude,
          longitude: cityData.longitude,
        },
        update: {},
      });

      console.warn(
        `[OK] ${cityData.name}${cityData.region ? `, ${cityData.region}` : ""} (${cityData.country})`
      );
      created++;
    } catch (err) {
      console.error(
        `[ERR] ${cityName} — ${err instanceof Error ? err.message : String(err)}`
      );
      errors++;
    }

    await sleep(200);
  }

  console.warn(
    `\n✅ Seed terminé : ${created} créées/mises à jour, ${skipped} ignorées (Photon vide), ${errors} erreurs\n`
  );
};
