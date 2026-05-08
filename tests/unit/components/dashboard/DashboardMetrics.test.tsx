/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";

const makeStats = (overrides = {}) => ({
  totalCandidates: 5,
  activeOffers: 3,
  totalClients: 2,
  recentCandidates: [
    { id: "c1", firstName: "Alice", lastName: "Martin", createdAt: new Date("2026-05-01") },
    { id: "c2", firstName: "Bob", lastName: "Dupont", createdAt: new Date("2026-04-28") },
  ],
  recentOffers: [
    { id: "o1", title: "Dev Senior", status: "IN_PROGRESS", createdAt: new Date("2026-05-01") },
    { id: "o2", title: "Chef de projet", status: "TODO", createdAt: new Date("2026-04-20") },
  ],
  recentNotes: [
    {
      id: "n1",
      title: "Note entretien",
      createdAt: new Date("2026-05-02"),
      candidateId: "c1",
      offerId: null,
      candidate: { firstName: "Alice", lastName: "Martin" },
      jobOffer: null,
    },
  ],
  ...overrides,
});

const mockUseQuery = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  api: {
    dashboard: {
      getStats: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
      },
    },
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DashboardMetrics", () => {
  it("affiche les skeletons pendant le chargement (isLoading)", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<DashboardMetrics />);

    expect(screen.queryByText("5")).toBeNull();
    expect(screen.queryByText("Alice Martin")).toBeNull();
  });

  it("affiche les cards de métriques avec les bons counts", () => {
    mockUseQuery.mockReturnValue({ data: makeStats(), isLoading: false });
    render(<DashboardMetrics />);

    const indicateurs = screen.getByLabelText("Indicateurs clés");
    expect(indicateurs.textContent).toContain("5");
    expect(indicateurs.textContent).toContain("3");
    expect(indicateurs.textContent).toContain("2");
  });

  it("les liens des cards pointent vers /candidates, /offers, /clients", () => {
    mockUseQuery.mockReturnValue({ data: makeStats(), isLoading: false });
    render(<DashboardMetrics />);

    const links = screen.getAllByRole("link") as HTMLAnchorElement[];
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/candidates");
    expect(hrefs).toContain("/offers");
    expect(hrefs).toContain("/clients");
  });

  it("affiche le message onboarding quand tous les counts sont à 0", () => {
    mockUseQuery.mockReturnValue({
      data: makeStats({
        totalCandidates: 0,
        activeOffers: 0,
        totalClients: 0,
        recentCandidates: [],
        recentOffers: [],
        recentNotes: [],
      }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    expect(screen.getByText("Bienvenue sur Claritee !")).toBeDefined();
  });

  it("le message onboarding est absent quand au moins un count > 0", () => {
    mockUseQuery.mockReturnValue({ data: makeStats(), isLoading: false });
    render(<DashboardMetrics />);

    expect(screen.queryByText("Bienvenue sur Claritee !")).toBeNull();
  });

  it("les boutons onboarding pointent vers /candidates/new et /offers/new", () => {
    mockUseQuery.mockReturnValue({
      data: makeStats({
        totalCandidates: 0,
        activeOffers: 0,
        totalClients: 0,
        recentCandidates: [],
        recentOffers: [],
        recentNotes: [],
      }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    const links = screen.getAllByRole("link") as HTMLAnchorElement[];
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/candidates/new");
    expect(hrefs).toContain("/offers/new");
  });

  it("section candidats récents vide → message neutre", () => {
    mockUseQuery.mockReturnValue({
      data: makeStats({ recentCandidates: [] }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    expect(screen.getByText("Aucun candidat pour le moment.")).toBeDefined();
  });

  it("section offres récentes vide → message neutre", () => {
    mockUseQuery.mockReturnValue({
      data: makeStats({ recentOffers: [] }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    expect(screen.getByText("Aucune offre pour le moment.")).toBeDefined();
  });

  it("section notes récentes vide → message neutre", () => {
    mockUseQuery.mockReturnValue({
      data: makeStats({ recentNotes: [] }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    expect(screen.getByText("Aucune note pour le moment.")).toBeDefined();
  });

  it("useQuery appelé avec staleTime 10min", () => {
    mockUseQuery.mockReturnValue({ data: makeStats(), isLoading: false });
    render(<DashboardMetrics />);

    expect(mockUseQuery).toHaveBeenCalledWith(undefined, {
      staleTime: 10 * 60 * 1000,
    });
  });

  it("affiche les candidats récents avec lien vers leur profil", () => {
    mockUseQuery.mockReturnValue({ data: makeStats(), isLoading: false });
    render(<DashboardMetrics />);

    const link = screen.getByText("Alice Martin").closest("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/candidates/c1");
  });

  it("affiche les offres récentes avec badge de statut", () => {
    mockUseQuery.mockReturnValue({ data: makeStats(), isLoading: false });
    render(<DashboardMetrics />);

    expect(screen.getByText("Dev Senior")).toBeDefined();
    expect(screen.getByText("En cours")).toBeDefined();
    expect(screen.getByText("Chef de projet")).toBeDefined();
    expect(screen.getByText("À traiter")).toBeDefined();
  });

  it("lien note vers candidat si candidateId présent", () => {
    mockUseQuery.mockReturnValue({ data: makeStats(), isLoading: false });
    render(<DashboardMetrics />);

    const noteLink = screen.getByText("Note entretien").closest("a") as HTMLAnchorElement;
    expect(noteLink.getAttribute("href")).toBe("/candidates/c1");
  });

  it("lien note vers offre si offerId présent", () => {
    mockUseQuery.mockReturnValue({
      data: makeStats({
        recentNotes: [{
          id: "n2",
          title: "Note offre",
          createdAt: new Date("2026-05-03"),
          candidateId: null,
          offerId: "o1",
          candidate: null,
          jobOffer: { title: "Dev Senior" },
        }],
      }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    const noteLink = screen.getByText("Note offre").closest("a") as HTMLAnchorElement;
    expect(noteLink.getAttribute("href")).toBe("/offers/o1");
  });

  it("lien note vers /notes si note libre (ni candidat ni offre)", () => {
    mockUseQuery.mockReturnValue({
      data: makeStats({
        recentNotes: [{
          id: "n3",
          title: null,
          createdAt: new Date("2026-05-04"),
          candidateId: null,
          offerId: null,
          candidate: null,
          jobOffer: null,
        }],
      }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    const noteLink = screen.getByText("Note libre").closest("a") as HTMLAnchorElement;
    expect(noteLink.getAttribute("href")).toBe("/notes");
  });

  it("dérive le label d'une note sans titre depuis la relation candidat", () => {
    mockUseQuery.mockReturnValue({
      data: makeStats({
        recentNotes: [{
          id: "n4",
          title: null,
          createdAt: new Date("2026-05-03"),
          candidateId: "c1",
          offerId: null,
          candidate: { firstName: "Alice", lastName: "Martin" },
          jobOffer: null,
        }],
      }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    expect(screen.getByText("Note sur Alice Martin")).toBeDefined();
  });

  it("bouton 'Voir plus' absent si ≤ 5 items", () => {
    mockUseQuery.mockReturnValue({ data: makeStats(), isLoading: false });
    render(<DashboardMetrics />);

    expect(screen.queryByText("Voir plus")).toBeNull();
  });

  it("bouton 'Voir plus' visible si > 5 candidats, expand/collapse fonctionne", () => {
    const candidates = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      firstName: `Prénom${i}`,
      lastName: `Nom${i}`,
      createdAt: new Date("2026-05-01"),
    }));
    mockUseQuery.mockReturnValue({
      data: makeStats({ recentCandidates: candidates }),
      isLoading: false,
    });
    render(<DashboardMetrics />);

    // Initially shows 5
    expect(screen.getByText("Prénom0 Nom0")).toBeDefined();
    expect(screen.queryByText("Prénom5 Nom5")).toBeNull();

    // Expand
    fireEvent.click(screen.getByText("Voir plus"));
    expect(screen.getByText("Prénom5 Nom5")).toBeDefined();
    expect(screen.getByText("Voir moins")).toBeDefined();

    // Collapse
    fireEvent.click(screen.getByText("Voir moins"));
    expect(screen.queryByText("Prénom5 Nom5")).toBeNull();
  });
});
