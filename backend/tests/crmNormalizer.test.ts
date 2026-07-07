import { hasContact, isValidDate, normalizeRecord } from "../src/utils/crmNormalizer";

describe("normalizeRecord", () => {
  it("keeps only known CRM fields and drops unknown keys", () => {
    const result = normalizeRecord({ name: "John", unknown_field: "x" } as never);
    expect(result.name).toBe("John");
    expect((result as Record<string, unknown>).unknown_field).toBeUndefined();
  });

  it("restricts crm_status to allowed values (case/format insensitive)", () => {
    expect(normalizeRecord({ crm_status: "sale done" }).crm_status).toBe("SALE_DONE");
    expect(normalizeRecord({ crm_status: "unknown" }).crm_status).toBeUndefined();
  });

  it("restricts data_source to allowed values", () => {
    expect(normalizeRecord({ data_source: "Eden Park" }).data_source).toBe("eden_park");
    expect(normalizeRecord({ data_source: "random" }).data_source).toBeUndefined();
  });

  it("drops unparseable created_at and preserves it in crm_note", () => {
    const result = normalizeRecord({ created_at: "not-a-date", email: "a@b.com" });
    expect(result.created_at).toBeUndefined();
    expect(result.crm_note).toMatch(/Original date: not-a-date/);
  });

  it("keeps the first email and moves the rest to crm_note", () => {
    const result = normalizeRecord({ email: "a@b.com, c@d.com" });
    expect(result.email).toBe("a@b.com");
    expect(result.crm_note).toMatch(/Additional emails: c@d.com/);
  });

  it("keeps the first mobile and moves the rest to crm_note", () => {
    const result = normalizeRecord({ mobile_without_country_code: "111; 222 / 333" });
    expect(result.mobile_without_country_code).toBe("111");
    expect(result.crm_note).toMatch(/Additional numbers: 222, 333/);
  });

  it("escapes newlines so records stay single CSV rows", () => {
    const result = normalizeRecord({ email: "a@b.com", crm_note: "line1\nline2" });
    expect(result.crm_note).toBe("line1\\nline2");
  });

  it("treats 'null'/'undefined'/empty strings as absent", () => {
    const result = normalizeRecord({ name: "null", email: "", company: "  " });
    expect(result.name).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.company).toBeUndefined();
  });
});

describe("hasContact", () => {
  it("is true when email is present", () => {
    expect(hasContact({ email: "a@b.com" })).toBe(true);
  });
  it("is true when mobile is present", () => {
    expect(hasContact({ mobile_without_country_code: "123" })).toBe(true);
  });
  it("is false when neither is present", () => {
    expect(hasContact({ name: "John" })).toBe(false);
  });
});

describe("isValidDate", () => {
  it("accepts ISO-like dates", () => {
    expect(isValidDate("2026-05-13 14:20:48")).toBe(true);
  });
  it("rejects gibberish", () => {
    expect(isValidDate("not-a-date")).toBe(false);
  });
});
