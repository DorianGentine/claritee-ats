import { describe, it, expect } from "vitest";
import {
  extractCityName,
  findDraftProblems,
  getLinkedInPublicIdentifier,
  mapHarvestApiProfile,
  mapSupremeCoderProfile,
  mapProficiency,
  toMonthDate,
  translateLanguageName,
  SUMMARY_MAX_LENGTH,
} from "@/lib/linkedin/profile";

const REQUESTED_URL = "https://www.linkedin.com/in/jeanne-martin";

/** Extrait d'une sortie réelle de harvestapi/linkedin-profile-scraper */
const harvestProfile = {
  id: "ACoAACLevxsB",
  publicIdentifier: "jeanne-martin",
  linkedinUrl: "https://www.linkedin.com/in/jeanne-martin",
  firstName: " Jeanne ",
  lastName: "Martin",
  headline: "Responsable RH chez Acme",
  about: "Dix ans de recrutement tech.",
  photo: "https://media.licdn.com/photo.jpg",
  location: {
    linkedinText: "Lyon, Auvergne-Rhône-Alpes, France",
    countryCode: "FR",
    parsed: { text: "Lyon, France", city: "Lyon", country: "France" },
  },
  experience: [
    {
      position: "Responsable RH",
      companyName: "Acme",
      employmentType: "Full-time",
      description: "Recrutement de 40 personnes.",
      startDate: { month: "Nov", year: 2022, text: "Nov 2022" },
      endDate: { text: "Present" },
    },
    {
      position: "Chargée de recrutement",
      companyName: "Initech",
      startDate: { month: "févr.", year: 2018, text: "févr. 2018" },
      endDate: { month: "Oct", year: 2022, text: "Oct 2022" },
    },
    // Sans date de début : ignorée (la date de début est obligatoire)
    { position: "Stage", companyName: "Globex", startDate: null },
  ],
  education: [
    {
      schoolName: "Université Lyon 2",
      degree: "Master",
      fieldOfStudy: "Ressources humaines",
      startDate: { year: 2015 },
      endDate: { month: "Jun", year: 2017 },
    },
    { schoolName: "Lycée du Parc", degree: null, fieldOfStudy: null },
  ],
  languages: [
    { name: "English", proficiency: "Full professional proficiency" },
    { name: "Français", proficiency: "Bilingue ou langue natale" },
    { name: "english", proficiency: "Elementary proficiency" },
  ],
  skills: [{ name: "Sourcing" }],
};

/** Extrait d'une sortie réelle de supreme_coder/linkedin-profile-scraper */
const supremeCoderProfile = {
  firstName: "Frédéric",
  lastName: "Mazzella",
  publicIdentifier: "fredericmazzella",
  inputUrl: "https://www.linkedin.com/in/fredericmazzella/",
  headline: "Founder & President of BlaBlaCar",
  summary: "Entrepreneur.",
  geoLocationName: "Greater Paris Metropolitan Region",
  positions: [
    {
      title: "President & Co-founder",
      locationName: "",
      description: "",
      company: { name: "Dift ", url: "https://www.linkedin.com/company/dift/" },
      timePeriod: { startDate: { month: 9, year: 2020 }, endDate: null },
    },
    {
      title: "Strategy",
      company: { name: "Acme" },
      timePeriod: { startDate: { year: 2004 }, endDate: { month: 8, year: 2006 } },
    },
    // Sans titre (poste groupé côté LinkedIn) : ignorée
    { title: null, company: { name: "Next Play Ventures" }, timePeriod: null },
  ],
  educations: [
    {
      schoolName: "Stanford University",
      degreeName: "Masters",
      fieldOfStudy: "Computer Science",
      timePeriod: { startDate: { month: 9, year: 1999 }, endDate: { month: 10, year: 2001 } },
    },
    { schoolName: "Harvard University", degreeName: "", fieldOfStudy: "", timePeriod: null },
  ],
  languages: [
    { name: "English", proficiency: "" },
    { name: "French", proficiency: "NATIVE_OR_BILINGUAL" },
  ],
  skills: [
    { name: "Business Strategy", endorsements: 47, experiences: "" },
    { name: "Start-ups", endorsements: 83, experiences: "" },
    { name: "start-ups", endorsements: 1, experiences: "" },
    { name: " ", endorsements: 0, experiences: "" },
  ],
  pictureUrl: { "200x200": "https://media.licdn.com/photo.jpg" },
};

describe("mapSupremeCoderProfile", () => {
  it("maps a full profile", () => {
    expect(mapSupremeCoderProfile(supremeCoderProfile, "https://linkedin.com/in/x")).toEqual({
      firstName: "Frédéric",
      lastName: "Mazzella",
      linkedinUrl: "https://www.linkedin.com/in/fredericmazzella",
      title: "Founder & President of BlaBlaCar",
      summary: "Entrepreneur.",
      cityName: "Paris",
      experiences: [
        {
          title: "President & Co-founder",
          company: "Dift",
          startDate: "2020-09-01",
          endDate: null,
          description: null,
        },
        {
          title: "Strategy",
          company: "Acme",
          startDate: "2004-01-01",
          endDate: "2006-08-01",
          description: null,
        },
      ],
      formations: [
        {
          degree: "Masters",
          field: "Computer Science",
          school: "Stanford University",
          startDate: "1999-09-01",
          endDate: "2001-10-01",
        },
        {
          degree: "Formation",
          field: null,
          school: "Harvard University",
          startDate: null,
          endDate: null,
        },
      ],
      languages: [
        // Niveau vide sur LinkedIn → non deviné
        { name: "Anglais", level: null },
        { name: "Français", level: "NATIVE" },
      ],
      // Ordre du profil, dédoublonné sans tenir compte de la casse
      skills: ["Business Strategy", "Start-ups"],
    });
  });

  it("keeps at most 20 skills, in profile order", () => {
    const draft = mapSupremeCoderProfile(
      {
        firstName: "Jeanne",
        lastName: "Martin",
        skills: Array.from({ length: 30 }, (_unused, index) => ({ name: `Skill ${index}` })),
      },
      "https://x"
    );
    expect(draft?.skills).toHaveLength(20);
    expect(draft?.skills[0]).toBe("Skill 0");
    expect(draft?.skills[19]).toBe("Skill 19");
  });

  it("falls back to the requested URL without public identifier", () => {
    const draft = mapSupremeCoderProfile(
      { firstName: "Jeanne", lastName: "Martin" },
      "https://www.linkedin.com/in/jeanne"
    );
    expect(draft?.linkedinUrl).toBe("https://www.linkedin.com/in/jeanne");
  });

  it("returns null for an unusable item", () => {
    expect(mapSupremeCoderProfile({ error: "not found" }, "https://x")).toBeNull();
    expect(mapSupremeCoderProfile([], "https://x")).toBeNull();
  });

  it("keeps the profile when a list has an unexpected format", () => {
    const draft = mapSupremeCoderProfile(
      { firstName: "Jeanne", lastName: "Martin", positions: "n/a", languages: [42] },
      "https://x"
    );
    expect(draft?.experiences).toEqual([]);
    expect(draft?.languages).toEqual([]);
  });
});

describe("extractCityName", () => {
  it.each([
    ["Lyon, Auvergne-Rhône-Alpes, France", "Lyon"],
    ["Greater Paris Metropolitan Region", "Paris"],
    ["Greater Lyon Area", "Lyon"],
    ["Région de Nantes", "Nantes"],
    ["Région d'Annecy", "Annecy"],
    ["Seattle, Washington, United States", "Seattle"],
    ["  ", null],
    [null, null],
  ])("%s → %s", (location, expected) => {
    expect(extractCityName(location)).toBe(expected);
  });
});

describe("mapHarvestApiProfile", () => {
  it("maps identity, title, summary and city", () => {
    const draft = mapHarvestApiProfile(harvestProfile, REQUESTED_URL);
    expect(draft).toMatchObject({
      firstName: "Jeanne",
      lastName: "Martin",
      linkedinUrl: "https://www.linkedin.com/in/jeanne-martin",
      title: "Responsable RH chez Acme",
      summary: "Dix ans de recrutement tech.",
      cityName: "Lyon",
    });
  });

  it("keeps experiences with a start date, in profile order, as month dates", () => {
    const draft = mapHarvestApiProfile(harvestProfile, REQUESTED_URL);
    expect(draft?.experiences).toEqual([
      {
        title: "Responsable RH",
        company: "Acme",
        startDate: "2022-11-01",
        endDate: null,
        description: "Recrutement de 40 personnes.",
      },
      {
        title: "Chargée de recrutement",
        company: "Initech",
        startDate: "2018-02-01",
        endDate: "2022-10-01",
        description: null,
      },
    ]);
  });

  it("maps formations, defaulting the degree when missing", () => {
    const draft = mapHarvestApiProfile(harvestProfile, REQUESTED_URL);
    expect(draft?.formations).toEqual([
      {
        degree: "Master",
        field: "Ressources humaines",
        school: "Université Lyon 2",
        startDate: "2015-01-01",
        endDate: "2017-06-01",
      },
      {
        degree: "Formation",
        field: null,
        school: "Lycée du Parc",
        startDate: null,
        endDate: null,
      },
    ]);
  });

  it("translates and deduplicates languages", () => {
    const draft = mapHarvestApiProfile(harvestProfile, REQUESTED_URL);
    expect(draft?.languages).toEqual([
      { name: "Anglais", level: "FLUENT" },
      { name: "Français", level: "NATIVE" },
    ]);
  });

  it("truncates a summary longer than the candidate limit", () => {
    const draft = mapHarvestApiProfile(
      { ...harvestProfile, about: "a".repeat(SUMMARY_MAX_LENGTH + 100) },
      REQUESTED_URL
    );
    expect(draft?.summary).toHaveLength(SUMMARY_MAX_LENGTH);
    expect(draft?.summary?.endsWith("…")).toBe(true);
  });

  it("falls back to the requested URL and the location text", () => {
    const draft = mapHarvestApiProfile(
      {
        firstName: "Jeanne",
        lastName: "Martin",
        location: { linkedinText: "Bordeaux, Nouvelle-Aquitaine, France" },
      },
      REQUESTED_URL
    );
    expect(draft).toMatchObject({
      linkedinUrl: REQUESTED_URL,
      cityName: "Bordeaux",
      title: null,
      summary: null,
      experiences: [],
      formations: [],
      languages: [],
      skills: [],
    });
  });

  it("returns null for an unusable item (error, missing name, wrong type)", () => {
    expect(mapHarvestApiProfile({ error: "Profile not found" }, REQUESTED_URL)).toBeNull();
    expect(mapHarvestApiProfile({ firstName: "Jeanne" }, REQUESTED_URL)).toBeNull();
    expect(mapHarvestApiProfile("oops", REQUESTED_URL)).toBeNull();
    expect(mapHarvestApiProfile(null, REQUESTED_URL)).toBeNull();
  });

  it("ignores malformed nested fields instead of failing", () => {
    const draft = mapHarvestApiProfile(
      { firstName: "Jeanne", lastName: "Martin", experience: "n/a", languages: 42 },
      REQUESTED_URL
    );
    expect(draft?.experiences).toEqual([]);
    expect(draft?.languages).toEqual([]);
  });
});

describe("toMonthDate", () => {
  it.each([
    [{ month: "Jan", year: 2020 }, "2020-01-01"],
    [{ month: "September", year: 2020 }, "2020-09-01"],
    [{ month: "juin", year: 2020 }, "2020-06-01"],
    [{ month: "juil.", year: 2020 }, "2020-07-01"],
    [{ month: "déc.", year: 2020 }, "2020-12-01"],
    [{ month: 3, year: 2020 }, "2020-03-01"],
    [{ month: "11", year: 2020 }, "2020-11-01"],
    [{ year: 2020 }, "2020-01-01"],
    [{ month: "Mar" }, null],
    [null, null],
  ])("%j → %s", (date, expected) => {
    expect(toMonthDate(date)).toBe(expected);
  });
});

describe("mapProficiency", () => {
  it.each([
    ["Elementary proficiency", "NOTION"],
    ["Notions", "NOTION"],
    ["Limited working proficiency", "INTERMEDIATE"],
    ["Compétence professionnelle limitée", "INTERMEDIATE"],
    ["Professional working proficiency", "FLUENT"],
    ["Full professional proficiency", "FLUENT"],
    ["Capacité professionnelle complète", "FLUENT"],
    ["Native or bilingual proficiency", "NATIVE"],
    ["NATIVE_OR_BILINGUAL", "NATIVE"],
    ["FULL_PROFESSIONAL", "FLUENT"],
    ["LIMITED_WORKING", "INTERMEDIATE"],
    ["ELEMENTARY", "NOTION"],
    ["", null],
    [null, null],
    ["Courant", null],
  ] as const)("%s → %s", (proficiency, expected) => {
    expect(mapProficiency(proficiency)).toBe(expected);
  });
});

describe("translateLanguageName", () => {
  it("translates common English names and capitalises the others", () => {
    expect(translateLanguageName("English")).toBe("Anglais");
    expect(translateLanguageName(" german ")).toBe("Allemand");
    expect(translateLanguageName("breton")).toBe("Breton");
    expect(translateLanguageName("Français")).toBe("Français");
  });
});

describe("getLinkedInPublicIdentifier", () => {
  it.each([
    ["https://www.linkedin.com/in/Jeanne-Martin/", "jeanne-martin"],
    ["http://linkedin.com/in/jeanne-martin?trk=abc", "jeanne-martin"],
    ["https://fr.linkedin.com/in/j%C3%A9r%C3%B4me", "jérôme"],
    ["https://example.com/profile", null],
  ])("%s → %s", (url, expected) => {
    expect(getLinkedInPublicIdentifier(url)).toBe(expected);
  });
});

describe("findDraftProblems", () => {
  it("accepts a complete reference profile", () => {
    expect(findDraftProblems(mapHarvestApiProfile(harvestProfile, REQUESTED_URL))).toEqual([]);
  });

  it("lists what is missing", () => {
    expect(findDraftProblems(null)).toEqual(["aucun profil exploitable dans la réponse Apify"]);
    expect(
      findDraftProblems(
        mapHarvestApiProfile({ firstName: "Jeanne", lastName: "Martin" }, REQUESTED_URL)
      )
    ).toEqual([
      "titre (headline) absent",
      "aucune expérience exploitable",
      "aucune formation exploitable",
    ]);
  });
});
