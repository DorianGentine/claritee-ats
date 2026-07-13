/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import { ShareLinkDialog } from "@/components/candidates/ShareLinkDialog"

const mockCreate = vi.fn()
const mockInvalidate = vi.fn()

const existingLinks = [
  {
    id: "link-1",
    candidateId: "cand-1",
    token: "abc123",
    type: "NORMAL" as const,
    expiresAt: new Date("2026-04-30"),
    createdAt: new Date("2026-03-31"),
  },
  {
    id: "link-2",
    candidateId: "cand-1",
    token: "def456",
    type: "ANONYMOUS" as const,
    expiresAt: null,
    createdAt: new Date("2026-03-30"),
  },
]

vi.mock("@/lib/trpc/client", () => ({
  api: {
    shareLink: {
      listByCandidate: {
        useQuery: () => ({ data: existingLinks }),
      },
      create: {
        useMutation: ({ onSuccess, onError: _onError }: { onSuccess?: (link: { token: string; [key: string]: unknown }) => void; onError?: (err: { message?: string }) => void }) => ({
          mutate: (input: unknown) => {
            mockCreate(input)
            onSuccess?.({ token: "newtoken123", candidateId: "cand-1", id: "new-id", type: "NORMAL", expiresAt: null, createdAt: new Date() })
          },
          isPending: false,
          error: null,
        }),
      },
    },
    useUtils: () => ({
      shareLink: {
        listByCandidate: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  candidateId: "cand-1",
}

describe("ShareLinkDialog", () => {
  it("renders dialog with type and expiration selectors", () => {
    render(<ShareLinkDialog {...defaultProps} />)

    expect(screen.getByText("Partager la fiche candidat")).toBeDefined()
    expect(screen.getByLabelText("Type de fiche")).toBeDefined()
    expect(screen.getByLabelText("Expiration")).toBeDefined()
    expect(screen.getByText("Générer un lien")).toBeDefined()
  })

  it("type selector defaults to Fiche complète", () => {
    render(<ShareLinkDialog {...defaultProps} />)

    // The trigger displays the currently selected value
    const trigger = screen.getByLabelText("Type de fiche")
    expect(trigger.textContent).toContain("Fiche complète")
  })

  it("expiration selector defaults to 30 jours", () => {
    render(<ShareLinkDialog {...defaultProps} />)

    const trigger = screen.getByLabelText("Expiration")
    expect(trigger.textContent).toContain("30 jours")
  })

  it("calls create mutation with correct params when generate is clicked", () => {
    render(<ShareLinkDialog {...defaultProps} />)

    fireEvent.click(screen.getByText("Générer un lien"))

    expect(mockCreate).toHaveBeenCalledWith({
      candidateId: "cand-1",
      type: "NORMAL",
      expiration: "30d",
    })
  })

  it("shows generated URL after successful creation", async () => {
    render(<ShareLinkDialog {...defaultProps} />)

    fireEvent.click(screen.getByText("Générer un lien"))

    await waitFor(() => {
      expect(screen.getByLabelText("URL de partage générée")).toBeDefined()
      expect(
        (screen.getByLabelText("URL de partage générée") as HTMLElement).textContent
      ).toContain("newtoken123")
    })
  })

  it("shows copy button for generated URL", async () => {
    render(<ShareLinkDialog {...defaultProps} />)

    fireEvent.click(screen.getByText("Générer un lien"))

    await waitFor(() => {
      expect(screen.getByLabelText("Copier le lien")).toBeDefined()
    })
  })

  it("displays list of existing links", () => {
    render(<ShareLinkDialog {...defaultProps} />)

    expect(screen.getByText("Liens existants")).toBeDefined()
    // First link: NORMAL
    expect(screen.getAllByText("Fiche complète").length).toBeGreaterThanOrEqual(1)
    // Second link: ANONYMOUS
    expect(screen.getByText("Fiche anonymisée")).toBeDefined()
    // Never expiration label (text split across nodes: "Expire : " + "Jamais")
    expect(screen.getByText(/Expire.*Jamais/)).toBeDefined()
  })

  it("copy button for existing link calls clipboard", async () => {
    render(<ShareLinkDialog {...defaultProps} />)

    const copyButtons = screen.getAllByLabelText(/Copier le lien/)
    fireEvent.click(copyButtons[0])

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })

  it("does not render when open=false", () => {
    render(<ShareLinkDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("Partager la fiche candidat")).toBeNull()
  })
})
