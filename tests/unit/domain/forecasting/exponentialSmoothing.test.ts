import { describe, expect, it } from "vitest";
import { exponentialSmoothingForecast } from "@/lib/domain/forecasting/exponentialSmoothing";

// series[i] for i = 0..5: 10, 20, 30, 40, 50, 60
const SERIES = [10, 20, 30, 40, 50, 60];

describe("exponentialSmoothingForecast", () => {
  it("seeds the level with series[0] for targetIndex=1", () => {
    // No iterations run (loop is t=1; t<1), so the forecast is just the seed.
    expect(exponentialSmoothingForecast(SERIES, 1, 0.5)).toBe(10);
  });

  it("folds in one more period per step of targetIndex", () => {
    // level=10; t=1: level = 0.5*20 + 0.5*10 = 15
    expect(exponentialSmoothingForecast(SERIES, 2, 0.5)).toBe(15);

    // continuing: t=2: level = 0.5*30 + 0.5*15 = 22.5
    expect(exponentialSmoothingForecast(SERIES, 3, 0.5)).toBe(22.5);
  });

  it("at alpha=1, reduces to a naive forecast (last known actual)", () => {
    // level = 1*series[t] + 0*level = series[t] every step -> forecast for
    // targetIndex is just series[targetIndex - 1].
    expect(exponentialSmoothingForecast(SERIES, 3, 1)).toBe(SERIES[2]);
    expect(exponentialSmoothingForecast(SERIES, 5, 1)).toBe(SERIES[4]);
  });

  it("forecasts one period beyond all known history (targetIndex === series.length)", () => {
    expect(exponentialSmoothingForecast(SERIES, SERIES.length, 0.5)).not.toBeNull();
  });

  it("returns null for targetIndex=0 (no prior data to seed from)", () => {
    expect(exponentialSmoothingForecast(SERIES, 0, 0.5)).toBeNull();
  });

  it("returns null for a targetIndex beyond series.length", () => {
    expect(exponentialSmoothingForecast(SERIES, SERIES.length + 1, 0.5)).toBeNull();
  });

  it("returns null for an out-of-range alpha", () => {
    expect(exponentialSmoothingForecast(SERIES, 3, 0)).toBeNull();
    expect(exponentialSmoothingForecast(SERIES, 3, 1.1)).toBeNull();
    expect(exponentialSmoothingForecast(SERIES, 3, -0.1)).toBeNull();
  });

  it("returns null for an empty series", () => {
    expect(exponentialSmoothingForecast([], 1, 0.5)).toBeNull();
  });
});
