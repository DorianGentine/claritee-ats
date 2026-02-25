import { describe, it, expect } from "vitest";
import { createInvitationSchema } from "@/lib/validations/invitation";

describe("invitation validations", () => {
  describe("createInvitationSchema", () => {
    it("accepts valid email", () => {
      const data = { email: "collegue@example.com" };
      expect(createInvitationSchema.parse(data)).toEqual(data);
    });

    it("rejects invalid email format", () => {
      expect(() =>
        createInvitationSchema.parse({ email: "not-an-email" })
      ).toThrow();
      expect(() =>
        createInvitationSchema.parse({ email: "missing@" })
      ).toThrow();
    });

    it("rejects empty email", () => {
      expect(() => createInvitationSchema.parse({ email: "" })).toThrow();
    });

    it("returns message for invalid email", () => {
      const result = createInvitationSchema.safeParse({ email: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("email valide");
      }
    });
  });
});
