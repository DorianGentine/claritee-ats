/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { CandidateIdentityDialog } from "@/components/candidates/CandidateIdentityDialog"

const { mockUpdate, mockUpload } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockUpload: vi.fn(),
}))

vi.mock("@/lib/trpc/client", () => ({
  api: {
    useUtils: () => ({
      candidate: {
        getById: { invalidate: vi.fn() },
        list: { invalidate: vi.fn() },
      },
    }),
    candidate: {
      update: { useMutation: () => ({ mutateAsync: mockUpdate, isPending: false }) },
      uploadPhoto: { useMutation: () => ({ mutateAsync: mockUpload, isPending: false }) },
    },
    city: {
      autocomplete: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
    },
  },
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const candidate = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  firstName: "Camille",
  lastName: "Laurent",
  email: "camille@example.com",
  phone: null,
  linkedinUrl: null,
  title: "Lead dev",
  photoUrl: null,
  cities: [{ id: "550e8400-e29b-41d4-a716-446655440010", name: "Lyon", region: "Auvergne-Rhône-Alpes", country: "France" }],
}

describe("CandidateIdentityDialog", () => {
  beforeAll(() => {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    Element.prototype.scrollIntoView = vi.fn()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockResolvedValue({})
  })

  afterEach(() => cleanup())

  it("préremplit le formulaire et envoie une chaîne vide pour effacer un champ", async () => {
    const onOpenChange = vi.fn()
    render(<CandidateIdentityDialog open onOpenChange={onOpenChange} candidate={candidate} />)

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement
    expect(emailInput.value).toBe("camille@example.com")
    expect((screen.getByLabelText(/Prénom/) as HTMLInputElement).value).toBe("Camille")

    fireEvent.change(emailInput, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: candidate.id,
        firstName: "Camille",
        email: "",
        phone: "",
        title: "Lead dev",
        cities: [{ cityId: candidate.cities[0].id, order: 0 }],
      })
    )
    expect(mockUpload).not.toHaveBeenCalled()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("bloque l'envoi si le prénom est vide", async () => {
    render(<CandidateIdentityDialog open onOpenChange={vi.fn()} candidate={candidate} />)

    fireEvent.change(screen.getByLabelText(/Prénom/), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(await screen.findByText("Le prénom est requis")).toBeDefined()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
