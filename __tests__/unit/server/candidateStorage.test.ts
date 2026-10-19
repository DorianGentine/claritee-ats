import { describe, it, expect } from "vitest";
import {
  classifyCandidateFile,
  getCvStorageExt,
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

describe("getCvStorageExt", () => {
  it("returns the lowercase extension when accepted", () => {
    expect(getCvStorageExt("CV.DOCX")).toBe("docx");
  });

  it("falls back to pdf for unknown or missing extensions", () => {
    expect(getCvStorageExt("cv.txt")).toBe("pdf");
    expect(getCvStorageExt(null)).toBe("pdf");
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
