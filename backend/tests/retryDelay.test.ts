import { parseRetryDelayMs } from "../src/services/aiService";

describe("parseRetryDelayMs", () => {
  it("reads the structured retryDelay field from a 429 payload", () => {
    const msg = 'blah [{"@type":"...RetryInfo","retryDelay":"21s"}]';
    // 21s + 250ms safety margin
    expect(parseRetryDelayMs(new Error(msg))).toBe(21_250);
  });

  it("falls back to the human 'retry in Xs' phrase", () => {
    const msg = "[429 Too Many Requests] Please retry in 4.5s.";
    expect(parseRetryDelayMs(new Error(msg))).toBe(4_750);
  });

  it("caps the delay at the maximum", () => {
    const msg = 'error "retryDelay":"600s"';
    expect(parseRetryDelayMs(new Error(msg))).toBe(30_000);
  });

  it("returns 0 when no delay is present", () => {
    expect(parseRetryDelayMs(new Error("some other error"))).toBe(0);
  });

  it("handles non-Error values safely", () => {
    expect(parseRetryDelayMs("retry in 2s")).toBe(2_250);
  });
});
