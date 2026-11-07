import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, loginSchema, registerSchema } from "@/lib/validations/auth";
import { applicationSchema, branchSchema, decisionSchema } from "@/lib/validations/onboarding";

const validApplication = {
  shopName: "  Smart Mobile Hub  ",
  slug: "  Smart-Mobile-Hub ",
  ownerName: "Ali Khan",
  phone: "+92 300 1234567",
  city: "Lahore",
  address: "Hall Road, Lahore",
  expectedBranches: "2",
};

const ok = (schema, value) => schema.safeParse(value).success;

describe("applicationSchema", () => {
  it("accepts a valid application and normalises it", () => {
    const result = applicationSchema.safeParse(validApplication);
    expect(result.success).toBe(true);
    expect(result.data.shopName).toBe("Smart Mobile Hub");
    expect(result.data.slug).toBe("smart-mobile-hub");
    expect(result.data.expectedBranches).toBe(2);
  });

  it("rejects reserved or malformed slugs", () => {
    for (const slug of ["admin", "platform", "ab", "bad slug", "UPPER_case", "a--b", "../etc"]) {
      expect(ok(applicationSchema, { ...validApplication, slug })).toBe(false);
    }
  });

  it("rejects missing or too-short text fields", () => {
    expect(ok(applicationSchema, { ...validApplication, shopName: "A" })).toBe(false);
    expect(ok(applicationSchema, { ...validApplication, ownerName: "" })).toBe(false);
    expect(ok(applicationSchema, { ...validApplication, city: " " })).toBe(false);
    expect(ok(applicationSchema, { ...validApplication, address: "x" })).toBe(false);
  });

  it("rejects invalid phone numbers", () => {
    for (const phone of ["abc", "123", "", "++92300", "0300-ABC-1234"]) {
      expect(ok(applicationSchema, { ...validApplication, phone })).toBe(false);
    }
    expect(ok(applicationSchema, { ...validApplication, phone: "0300-1234567" })).toBe(true);
  });

  it("limits expected branches to whole numbers between 1 and 50", () => {
    for (const expectedBranches of [0, 51, 1.5, "abc", -1]) {
      expect(ok(applicationSchema, { ...validApplication, expectedBranches })).toBe(false);
    }
    expect(ok(applicationSchema, { ...validApplication, expectedBranches: 1 })).toBe(true);
    expect(ok(applicationSchema, { ...validApplication, expectedBranches: 50 })).toBe(true);
  });

  it("does not let a client smuggle an applicant identity or status through", () => {
    const result = applicationSchema.safeParse({
      ...validApplication,
      applicantUid: "someone-else",
      status: "APPROVED",
    });
    expect(result.success).toBe(true);
    expect("applicantUid" in result.data).toBe(false);
    expect("status" in result.data).toBe(false);
  });
});

describe("decisionSchema", () => {
  it("accepts APPROVE without a reason", () => {
    expect(ok(decisionSchema, { decision: "APPROVE" })).toBe(true);
  });

  it("requires a real reason to REJECT", () => {
    expect(ok(decisionSchema, { decision: "REJECT" })).toBe(false);
    expect(ok(decisionSchema, { decision: "REJECT", reason: "no" })).toBe(false);
    expect(ok(decisionSchema, { decision: "REJECT", reason: "   " })).toBe(false);
    expect(ok(decisionSchema, { decision: "REJECT", reason: "Phone number could not be verified" })).toBe(true);
  });

  it("rejects unknown decisions", () => {
    expect(ok(decisionSchema, { decision: "DELETE" })).toBe(false);
    expect(ok(decisionSchema, {})).toBe(false);
  });
});

describe("branchSchema", () => {
  it("defaults optional fields to empty strings", () => {
    const result = branchSchema.safeParse({ name: "Second Branch" });
    expect(result.success).toBe(true);
    expect(result.data.address).toBe("");
    expect(result.data.phone).toBe("");
  });

  it("validates name and phone", () => {
    expect(ok(branchSchema, { name: "A" })).toBe(false);
    expect(ok(branchSchema, { name: "Branch", phone: "not a phone" })).toBe(false);
    expect(ok(branchSchema, { name: "Branch", phone: "+92 321 7654321" })).toBe(true);
  });
});

describe("auth schemas", () => {
  const validRegistration = {
    displayName: "Ali Khan",
    email: "  ALI@Example.TEST ",
    password: "Passw0rdOK",
    confirmPassword: "Passw0rdOK",
  };

  it("normalises the email and accepts a valid registration", () => {
    const result = registerSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
    expect(result.data.email).toBe("ali@example.test");
  });

  it("rejects mismatched, short and letter-only/digit-only passwords", () => {
    expect(ok(registerSchema, { ...validRegistration, confirmPassword: "different1" })).toBe(false);
    expect(ok(registerSchema, { ...validRegistration, password: "Ab1", confirmPassword: "Ab1" })).toBe(false);
    expect(ok(registerSchema, { ...validRegistration, password: "onlyletters", confirmPassword: "onlyletters" })).toBe(false);
    expect(ok(registerSchema, { ...validRegistration, password: "12345678", confirmPassword: "12345678" })).toBe(false);
  });

  it("reports the password mismatch on the confirmation field", () => {
    const result = registerSchema.safeParse({ ...validRegistration, confirmPassword: "different1" });
    const paths = result.error.issues.map((issue) => issue.path.join("."));
    expect(paths).toContain("confirmPassword");
  });

  it("validates login and forgot-password emails", () => {
    expect(ok(loginSchema, { email: "not-an-email", password: "x" })).toBe(false);
    expect(ok(loginSchema, { email: "a@b.co", password: "" })).toBe(false);
    expect(ok(loginSchema, { email: "a@b.co", password: "x" })).toBe(true);
    expect(ok(forgotPasswordSchema, { email: "nope" })).toBe(false);
    expect(ok(forgotPasswordSchema, { email: "a@b.co" })).toBe(true);
  });
});
