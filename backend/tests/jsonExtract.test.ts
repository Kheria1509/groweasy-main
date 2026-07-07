import { extractJsonArray } from "../src/utils/jsonExtract";

describe("extractJsonArray", () => {
  it("parses a plain JSON array", () => {
    expect(extractJsonArray('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  it("strips ```json code fences", () => {
    const text = '```json\n[{"a":1}]\n```';
    expect(extractJsonArray(text)).toEqual([{ a: 1 }]);
  });

  it("slices an array out of surrounding prose", () => {
    const text = 'Here is your data: [{"a":1},{"b":2}] Thanks!';
    expect(extractJsonArray(text)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("throws when the payload is not an array", () => {
    expect(() => extractJsonArray('{"a":1}')).toThrow();
  });
});
