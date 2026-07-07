import { LeadExtractor } from "../src/services/aiService";
import { extractLeads } from "../src/services/extractionService";
import { RawRecord } from "../src/types/crm";

/** In-memory extractor that echoes queued responses, for deterministic tests. */
class FakeExtractor implements LeadExtractor {
  public calls: RawRecord[][] = [];
  constructor(
    private readonly responder: (
      rows: RawRecord[],
      batchIndex: number,
    ) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>,
  ) {}

  async extractBatch(rows: RawRecord[]): Promise<Record<string, unknown>[]> {
    const index = this.calls.length;
    this.calls.push(rows);
    return this.responder(rows, index);
  }
}

describe("extractLeads", () => {
  it("imports valid records and reports totals", async () => {
    const rows: RawRecord[] = [
      { name: "John", email: "john@x.com" },
      { name: "Jane", phone: "123" },
    ];
    const extractor = new FakeExtractor((batch) =>
      batch.map((r) => ({
        name: r.name,
        email: r.email,
        mobile_without_country_code: r.phone,
      })),
    );

    const result = await extractLeads(rows, extractor, { batchSize: 10 });

    expect(result.totalRows).toBe(2);
    expect(result.totalImported).toBe(2);
    expect(result.totalSkipped).toBe(0);
  });

  it("skips records without email or mobile", async () => {
    const rows: RawRecord[] = [{ name: "NoContact" }];
    const extractor = new FakeExtractor((batch) =>
      batch.map((r) => ({ name: r.name })),
    );

    const result = await extractLeads(rows, extractor, { batchSize: 10 });

    expect(result.totalImported).toBe(0);
    expect(result.totalSkipped).toBe(1);
    expect(result.skipped[0].reason).toMatch(/neither an email nor a mobile/i);
  });

  it("splits rows into batches according to batchSize", async () => {
    const rows: RawRecord[] = Array.from({ length: 5 }, (_, i) => ({
      email: `u${i}@x.com`,
    }));
    const extractor = new FakeExtractor((batch) =>
      batch.map((r) => ({ email: r.email })),
    );

    await extractLeads(rows, extractor, { batchSize: 2 });

    expect(extractor.calls.map((c) => c.length)).toEqual([2, 2, 1]);
  });

  it("skips a whole batch's rows when the AI throws after retries", async () => {
    const rows: RawRecord[] = [
      { email: "a@x.com" },
      { email: "b@x.com" },
    ];
    const extractor = new FakeExtractor(() => {
      throw new Error("AI down");
    });

    const result = await extractLeads(rows, extractor, { batchSize: 10 });

    expect(result.totalImported).toBe(0);
    expect(result.totalSkipped).toBe(2);
    expect(result.skipped[0].reason).toMatch(/batch/i);
  });

  it("skips a row when the AI omits its record", async () => {
    const rows: RawRecord[] = [{ email: "a@x.com" }, { email: "b@x.com" }];
    const extractor = new FakeExtractor(() => [{ email: "a@x.com" }]); // only one back

    const result = await extractLeads(rows, extractor, { batchSize: 10 });

    expect(result.totalImported).toBe(1);
    expect(result.totalSkipped).toBe(1);
  });

  it("reports incremental progress via onBatch for each batch", async () => {
    const rows: RawRecord[] = Array.from({ length: 5 }, (_, i) => ({
      email: `u${i}@x.com`,
    }));
    const extractor = new FakeExtractor((batch) =>
      batch.map((r) => ({ email: r.email })),
    );
    const processed: number[] = [];
    const batchImportedCounts: number[] = [];

    const result = await extractLeads(rows, extractor, {
      batchSize: 2,
      onBatch: (p) => {
        processed.push(p.processedRows);
        batchImportedCounts.push(p.imported.length);
        expect(p.totalRows).toBe(5);
        expect(p.totalBatches).toBe(3);
      },
    });

    expect(processed).toEqual([2, 4, 5]);
    expect(batchImportedCounts).toEqual([2, 2, 1]);
    expect(result.totalImported).toBe(5);
  });

  it("reports skipped rows per batch through onBatch when a batch fails", async () => {
    const rows: RawRecord[] = [{ email: "a@x.com" }, { email: "b@x.com" }];
    const extractor = new FakeExtractor(() => {
      throw new Error("AI down");
    });
    const batchSkipped: number[] = [];

    await extractLeads(rows, extractor, {
      batchSize: 10,
      onBatch: (p) => {
        batchSkipped.push(p.skipped.length);
      },
    });

    expect(batchSkipped).toEqual([2]);
  });
});
