/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { api } from "@/lib/trpc/client";
import { LinkedInImportPanel } from "@/components/candidates/LinkedInImportPanel";
import { LinkedInImportPreview } from "@/components/candidates/LinkedInImportPreview";
import type { LinkedInProfileDraft } from "@/lib/linkedin/profile";

const mockPreviewMutate = vi.fn();
let mutationOptions: {
  onSuccess?: (result: unknown) => void;
  onError?: (error: { message: string }) => void;
} = {};

vi.mock("@/lib/trpc/client", () => ({
  api: {
    linkedinImport: {
      status: { useQuery: vi.fn() },
      preview: {
        useMutation: vi.fn((options) => {
          mutationOptions = options;
          return { mutate: mockPreviewMutate, isPending: false };
        }),
      },
    },
  },
}));

const draft: LinkedInProfileDraft = {
  firstName: "Jeanne",
  lastName: "Martin",
  linkedinUrl: "https://www.linkedin.com/in/jeanne-martin",
  title: "Responsable RH",
  summary: "Dix ans de recrutement tech.",
  cityName: "Lyon",
  experiences: [
    { title: "Responsable RH", company: "Acme", startDate: "2022-11-01", endDate: null, description: null },
  ],
  formations: [
    { degree: "Master", field: "RH", school: "Lyon 2", startDate: null, endDate: "2017-06-01" },
  ],
  languages: [{ name: "Anglais", level: "FLUENT" }],
  skills: ["Sourcing", "Entretiens"],
};

const mockStatus = (enabled: boolean) =>
  vi.mocked(api.linkedinImport.status.useQuery).mockReturnValue({
    data: { enabled },
  } as ReturnType<typeof api.linkedinImport.status.useQuery>);

describe("LinkedInImportPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while the import is not configured", () => {
    mockStatus(false);
    const { container } = render(<LinkedInImportPanel onImported={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("validates the URL before calling Apify", () => {
    mockStatus(true);
    render(<LinkedInImportPanel onImported={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("URL du profil LinkedIn"), {
      target: { value: "https://example.com/jeanne" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));

    expect(mockPreviewMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/URL LinkedIn invalide/);
  });

  it("imports the profile and reports an existing duplicate", () => {
    mockStatus(true);
    const handleImported = vi.fn();
    render(<LinkedInImportPanel onImported={handleImported} />);

    fireEvent.change(screen.getByLabelText("URL du profil LinkedIn"), {
      target: { value: " https://www.linkedin.com/in/jeanne-martin " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Importer" }));
    expect(mockPreviewMutate).toHaveBeenCalledWith({
      linkedinUrl: "https://www.linkedin.com/in/jeanne-martin",
    });

    act(() => {
      mutationOptions.onSuccess?.({
        draft,
        duplicate: { id: "c1", firstName: "Jeanne", lastName: "M." },
      });
    });
    expect(handleImported).toHaveBeenCalledWith(draft);
    expect(screen.getByRole("link", { name: "Jeanne M." }).getAttribute("href")).toBe(
      "/candidates/c1"
    );
  });
});

describe("LinkedInImportPreview", () => {
  const background = {
    summary: draft.summary,
    experiences: draft.experiences,
    formations: draft.formations,
    languages: draft.languages,
    skills: draft.skills,
  };

  it("lists the imported background", () => {
    render(<LinkedInImportPreview value={background} onChange={vi.fn()} />);
    expect(screen.getByText("Expériences (1)")).toBeDefined();
    expect(screen.getByText("Responsable RH · Acme")).toBeDefined();
    expect(screen.getByText(/Anglais/)).toBeDefined();
  });

  it("removes an item the recruiter does not want to keep", () => {
    const handleChange = vi.fn();
    render(<LinkedInImportPreview value={background} onChange={handleChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Retirer l'expérience Responsable RH chez Acme" })
    );
    expect(handleChange).toHaveBeenCalledWith({ ...background, experiences: [] });
  });

  it("lists skills as tags that can be removed before saving", () => {
    const handleChange = vi.fn();
    render(<LinkedInImportPreview value={background} onChange={handleChange} />);

    expect(screen.getByText("Compétences ajoutées en tags (2/20)")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Retirer le tag Sourcing" }));
    expect(handleChange).toHaveBeenCalledWith({ ...background, skills: ["Entretiens"] });
  });

  it("asks for the level when LinkedIn gives none", () => {
    render(
      <LinkedInImportPreview
        value={{ ...background, languages: [{ name: "Espagnol", level: null }] }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText(/sinon la\s+langue ne sera pas ajoutée/)).toBeDefined();
    expect(
      screen.getByRole("combobox", { name: "Niveau en Espagnol" }).textContent
    ).toContain("Niveau à préciser");
  });

  it("does not show the level hint when every level is known", () => {
    render(<LinkedInImportPreview value={background} onChange={vi.fn()} />);
    expect(screen.queryByText(/ne sera pas ajoutée/)).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Niveau en Anglais" }).textContent
    ).toContain("Courant");
  });

  it("renders nothing when everything was removed", () => {
    const { container } = render(
      <LinkedInImportPreview
        value={{ summary: null, experiences: [], formations: [], languages: [], skills: [] }}
        onChange={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });
});
