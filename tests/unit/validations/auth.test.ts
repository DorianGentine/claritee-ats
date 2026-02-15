import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSchema,
  sirenSchema,
  registerFormSchema,
  loginFormSchema,
} from "@/lib/validations/auth";

describe("auth validations", () => {
  describe("emailSchema", () => {
    it("accepts valid email", () => {
      expect(emailSchema.parse("user@example.com")).toBe("user@example.com");
    });

    it("rejects invalid email format", () => {
      expect(() => emailSchema.parse("not-an-email")).toThrow();
      expect(() => emailSchema.parse("missing@")).toThrow();
      expect(() => emailSchema.parse("@nodomain.com")).toThrow();
    });

    it("returns message 'Veuillez entrer une adresse email valide.' for invalid", () => {
      const result = emailSchema.safeParse("invalid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("email valide");
      }
    });
  });

  describe("passwordSchema", () => {
    it("accepts password with 8+ chars", () => {
      expect(passwordSchema.parse("password")).toBe("password");
      expect(passwordSchema.parse("12345678")).toBe("12345678");
    });

    it("rejects password with less than 8 chars", () => {
      expect(() => passwordSchema.parse("short")).toThrow();
      expect(() => passwordSchema.parse("7chars!")).toThrow();
    });
  });

  describe("sirenSchema", () => {
    it("accepts exactly 9 digits", () => {
      expect(sirenSchema.parse("123456789")).toBe("123456789");
    });

    it("rejects non-9-digit SIREN", () => {
      expect(() => sirenSchema.parse("12345678")).toThrow();
      expect(() => sirenSchema.parse("1234567890")).toThrow();
      expect(() => sirenSchema.parse("12345678a")).toThrow();
      expect(() => sirenSchema.parse("")).toThrow();
    });

    it("returns message 'Le SIREN doit contenir exactement 9 chiffres.' for invalid", () => {
      const result = sirenSchema.safeParse("12345");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("9 chiffres");
      }
    });
  });

  describe("registerFormSchema", () => {
    it("accepts valid full registration data", () => {
      const data = {
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean@example.com",
        password: "password123",
        companyName: "Acme",
        siren: "123456789",
      };
      expect(registerFormSchema.parse(data)).toEqual(data);
    });

    it("rejects invalid email in full form", () => {
      const data = {
        firstName: "Jean",
        lastName: "Dupont",
        email: "invalid",
        password: "password123",
        companyName: "Acme",
        siren: "123456789",
      };
      expect(() => registerFormSchema.parse(data)).toThrow();
    });

    it("rejects short password in full form", () => {
      const data = {
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean@example.com",
        password: "short",
        companyName: "Acme",
        siren: "123456789",
      };
      expect(() => registerFormSchema.parse(data)).toThrow();
    });

    it("rejects invalid SIREN in full form", () => {
      const data = {
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean@example.com",
        password: "password123",
        companyName: "Acme",
        siren: "12345",
      };
      expect(() => registerFormSchema.parse(data)).toThrow();
    });
  });

  describe("loginFormSchema", () => {
    it("accepts valid email and password", () => {
      const data = { email: "user@example.com", password: "password123" };
      expect(loginFormSchema.parse(data)).toEqual(data);
    });

    it("rejects invalid email format", () => {
      expect(() =>
        loginFormSchema.parse({ email: "invalid", password: "password123" }),
      ).toThrow();
    });

    it("rejects empty password", () => {
      expect(() =>
        loginFormSchema.parse({ email: "user@example.com", password: "" }),
      ).toThrow();
    });

    it("returns message for invalid email", () => {
      const result = loginFormSchema.safeParse({
        email: "bad",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("email valide");
      }
    });
  });
});
