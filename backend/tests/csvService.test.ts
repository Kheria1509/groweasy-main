import { chunk, parseCsv } from "../src/services/csvService";

describe("parseCsv", () => {
  it("parses CSV with headers into trimmed string rows", () => {
    const csv = "name, email ,phone\nJohn, john@x.com ,123\n";
    const { headers, rows } = parseCsv(Buffer.from(csv));
    expect(headers).toEqual(["name", "email", "phone"]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: "John", email: "john@x.com", phone: "123" });
  });

  it("keeps phone-like numbers as strings", () => {
    const csv = "mobile\n9876543210\n";
    const { rows } = parseCsv(Buffer.from(csv));
    expect(rows[0].mobile).toBe("9876543210");
  });

  it("strips a UTF-8 BOM from the first header", () => {
    const csv = "\uFEFFname,email\nJane,jane@x.com\n";
    const { headers } = parseCsv(Buffer.from(csv));
    expect(headers[0]).toBe("name");
  });

  it("skips fully empty rows", () => {
    const csv = "name,email\nJohn,john@x.com\n,\nJane,jane@x.com\n";
    const { rows } = parseCsv(Buffer.from(csv));
    expect(rows).toHaveLength(2);
  });

  it("throws on an empty file", () => {
    expect(() => parseCsv(Buffer.from("   "))).toThrow(/empty/i);
  });

  it("throws when there are headers but no data rows", () => {
    expect(() => parseCsv(Buffer.from("name,email\n"))).toThrow(/data rows/i);
  });
});

describe("chunk", () => {
  it("splits an array into fixed-size batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single batch when size covers everything", () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });
});
