import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyCandidateFile,
  createCandidateFilePath,
  getCandidateFilePathFromUrl,
  parseCandidateFilePath,
  removeCandidateFiles,
  type StoredCandidate,
} from "@/server/candidateStorage";

const COMPANY_ID = "company-a";
const CANDIDATE_ID = "candidate-1";
const PREFIX = `${COMPANY_ID}/candidates/${CANDIDATE_ID}`;

const buildCandidates = (overrides: Partial<StoredCandidate> = {}) =>
  new Map<string, StoredCandidate>([
    [
      CANDIDATE_ID,
      {
        id: CANDIDATE_ID,
        companyId: COMPANY_ID,
        photoUrl: `https://storage.example.com/storage/v1/object/public/photos/${PREFIX}/photo.jpg`,
        cvUrl: `https://storage.example.com/storage/v1/object/public/cvs/${PREFIX}/cv.pdf`,
        cvFileName: "Mon CV.pdf",
        ...overrides,
      },
    ],
  ]);

const UPLOAD_ID = "3f2b8c1e-9a4d-4e7b-8c6f-1d2e3f4a5b6c";

describe("createCandidateFilePath", () => {
  it("builds a unique path per upload that parses back", () => {
    const firstPath = createCandidateFilePath(
      COMPANY_ID,
      CANDIDATE_ID,
      "cvs",
      "pdf"
    );
    const secondPath = createCandidateFilePath(
      COMPANY_ID,
      CANDIDATE_ID,
      "cvs",
      "pdf"
    );

    expect(firstPath).not.toBe(secondPath);
    expect(firstPath).toMatch(new RegExp(`^${PREFIX}/cv-[0-9a-f-]{36}\\.pdf$`));
    expect(parseCandidateFilePath("cvs", firstPath)).toEqual({
      companyId: COMPANY_ID,
      candidateId: CANDIDATE_ID,
      extension: "pdf",
    });
  });
});

describe("parseCandidateFilePath", () => {
  it("accepts legacy paths without upload id", () => {
    expect(
      parseCandidateFilePath("photos", `${PREFIX}/photo.png`)
    ).toMatchObject({
      extension: "png",
    });
  });

  it("rejects another bucket's name, an unknown extension or a nested path", () => {
    expect(
      parseCandidateFilePath("photos", `${PREFIX}/cv-${UPLOAD_ID}.pdf`)
    ).toBeNull();
    expect(
      parseCandidateFilePath("cvs", `${PREFIX}/cv-${UPLOAD_ID}.txt`)
    ).toBeNull();
    expect(parseCandidateFilePath("cvs", `${PREFIX}/../cv.pdf`)).toBeNull();
  });
});

describe("getCandidateFilePathFromUrl", () => {
  const cvPath = `${PREFIX}/cv-${UPLOAD_ID}.docx`;

  it("extracts the stored path from a public URL", () => {
    expect(
      getCandidateFilePathFromUrl(
        "cvs",
        COMPANY_ID,
        CANDIDATE_ID,
        `https://storage.example.com/storage/v1/object/public/cvs/${cvPath}`
      )
    ).toBe(cvPath);
  });

  it("returns null for a missing URL or another candidate's file", () => {
    expect(
      getCandidateFilePathFromUrl("cvs", COMPANY_ID, CANDIDATE_ID, null)
    ).toBeNull();
    expect(
      getCandidateFilePathFromUrl(
        "cvs",
        COMPANY_ID,
        "candidate-2",
        `https://storage.example.com/storage/v1/object/public/cvs/${cvPath}`
      )
    ).toBeNull();
  });
});

describe("removeCandidateFiles", () => {
  const buildSupabase = (fileNames: string[]) => {
    const remove = vi.fn((_paths: string[]) =>
      Promise.resolve({ error: null })
    );
    const supabase = {
      storage: {
        from: () => ({
          list: () =>
            Promise.resolve({
              data: fileNames.map((name) => ({ name })),
              error: null,
            }),
          remove,
        }),
      },
    } as unknown as SupabaseClient;
    return { supabase, remove };
  };

  it("removes every conventional file of the candidate except the kept one", async () => {
    const keptPath = `${PREFIX}/cv-${UPLOAD_ID}.pdf`;
    const { supabase, remove } = buildSupabase([
      "cv.doc",
      `cv-${UPLOAD_ID}.pdf`,
      "cv-11111111-2222-4333-8444-555555555555.docx",
      "notes.txt",
    ]);

    await removeCandidateFiles(
      supabase,
      COMPANY_ID,
      CANDIDATE_ID,
      "cvs",
      keptPath
    );

    expect(remove).toHaveBeenCalledWith([
      `${PREFIX}/cv.doc`,
      `${PREFIX}/cv-11111111-2222-4333-8444-555555555555.docx`,
    ]);
  });

  it("does not call remove when nothing matches", async () => {
    const { supabase, remove } = buildSupabase(["notes.txt"]);

    expect(
      await removeCandidateFiles(supabase, COMPANY_ID, CANDIDATE_ID, "cvs")
    ).toBeNull();
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("classifyCandidateFile", () => {
  it("keeps the files referenced by the candidate", () => {
    const candidates = buildCandidates();
    expect(
      classifyCandidateFile("photos", `${PREFIX}/photo.jpg`, candidates).status
    ).toBe("current");
    expect(
      classifyCandidateFile("cvs", `${PREFIX}/cv.pdf`, candidates).status
    ).toBe("current");
  });

  it("flags files of a deleted candidate", () => {
    expect(
      classifyCandidateFile("cvs", `${PREFIX}/cv.pdf`, new Map())
    ).toMatchObject({ status: "orphan", reason: "candidat supprimé" });
  });

  it("flags files stored under another company prefix", () => {
    expect(
      classifyCandidateFile(
        "cvs",
        `company-b/candidates/${CANDIDATE_ID}/cv.pdf`,
        buildCandidates()
      )
    ).toMatchObject({
      status: "orphan",
      reason: "candidat d'un autre cabinet",
    });
  });

  it("flags a replaced photo with another extension", () => {
    expect(
      classifyCandidateFile("photos", `${PREFIX}/photo.png`, buildCandidates())
        .status
    ).toBe("orphan");
  });

  it("flags a replaced CV with another extension", () => {
    expect(
      classifyCandidateFile("cvs", `${PREFIX}/cv.doc`, buildCandidates()).status
    ).toBe("orphan");
  });

  it("keeps the CV referenced by cvUrl even when cvFileName has another extension", () => {
    const candidates = buildCandidates({
      cvUrl: `https://storage.example.com/storage/v1/object/public/cvs/${PREFIX}/cv.docx`,
      cvFileName: "CV",
    });
    expect(
      classifyCandidateFile("cvs", `${PREFIX}/cv.docx`, candidates).status
    ).toBe("current");
  });

  it("keeps a uniquely named file referenced by the candidate and flags the others", () => {
    const candidates = buildCandidates({
      photoUrl: `https://storage.example.com/storage/v1/object/public/photos/${PREFIX}/photo-${UPLOAD_ID}.webp`,
    });
    expect(
      classifyCandidateFile(
        "photos",
        `${PREFIX}/photo-${UPLOAD_ID}.webp`,
        candidates
      ).status
    ).toBe("current");
    expect(
      classifyCandidateFile("photos", `${PREFIX}/photo.jpg`, candidates).status
    ).toBe("orphan");
  });

  it("flags a CV removed from the candidate", () => {
    expect(
      classifyCandidateFile(
        "cvs",
        `${PREFIX}/cv.pdf`,
        buildCandidates({ cvUrl: null, cvFileName: null })
      ).status
    ).toBe("orphan");
  });

  it("never flags paths outside the naming convention", () => {
    const candidates = buildCandidates();
    expect(
      classifyCandidateFile("photos", `${PREFIX}/cv.pdf`, candidates).status
    ).toBe("unexpected");
    expect(classifyCandidateFile("photos", "logo.png", candidates).status).toBe(
      "unexpected"
    );
    expect(
      classifyCandidateFile("cvs", `${PREFIX}/cv.txt`, candidates).status
    ).toBe("unexpected");
  });
});
