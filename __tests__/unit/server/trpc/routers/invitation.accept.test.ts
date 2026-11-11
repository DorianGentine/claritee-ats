import { randomUUID } from "crypto";
import { describe, it, expect, vi } from "vitest";
import { invitationRouter } from "@/server/trpc/routers/invitation";
import { RATE_LIMITS } from "@/lib/rate-limit";
import type { Context } from "@/server/trpc/context";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const acceptInput = {
  token: randomUUID(),
  email: "invite@example.com",
  firstName: "Jean",
  lastName: "Dupont",
  password: "Motdepasse123!",
};

describe("invitation.accept", () => {
  it("rejects an IP once AUTH_PER_IP is exceeded, before touching the DB", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const caller = invitationRouter.createCaller({
      db: { invitation: { findUnique } },
      user: null,
      companyId: null,
      headers: new Headers({ "x-forwarded-for": `invite-${randomUUID()}` }),
    } as unknown as Context);

    for (let call = 0; call < RATE_LIMITS.AUTH_PER_IP.limit; call++) {
      await caller.accept(acceptInput).catch(() => undefined);
    }
    findUnique.mockClear();

    await expect(caller.accept(acceptInput)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
