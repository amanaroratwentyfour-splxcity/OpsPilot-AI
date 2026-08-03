import { describe, expect, it } from "vitest";
import { movingAverageForecast } from "@/lib/domain/forecasting/movingAverage";

// series[i] for i = 0..5: 10, 20, 30, 40, 50, 60
const SERIES = [10, 20, 30, 40, 50, 60];

describe("movingAverageForecast", () => {
  it("averages the preceding `window` periods (default window)", () => {
    // targetIndex=4, window=4 -> mean(series[0..3]) = mean(10,20,30,40) = 25
    expect(movingAverageForecast(SERIES, 4)).toBe(25);
  });

  it("slides forward with the target index", () => {
    // targetIndex=5, window=4 -> mean(series[1..4]) = mean(20,30,40,50) = 35
    expect(movingAverageForecast(SERIES, 5)).toBe(35);
  });

  it("forecasts one period beyond all known history (targetIndex === series.length)", () => {
    // targetIndex=6, window=4 -> mean(series[2..5]) = mean(30,40,50,60) = 45
    expect(movingAverageForecast(SERIES, 6)).toBe(45);
  });

  it("uses whatever preceding history exists when fewer than `window` periods are available", () => {
    // targetIndex=1, window=4 -> only series[0] precedes it -> mean([10]) = 10
    expect(movingAverageForecast(SERIES, 1)).toBe(10);
  });

  it("respects an explicit window override", () => {
    // targetIndex=4, window=2 -> mean(series[2..3]) = mean(30,40) = 35
    expect(movingAverageForecast(SERIES, 4, 2)).toBe(35);
  });

  it("returns null for targetIndex=0 (no prior data to forecast from)", () => {
    expect(movingAverageForecast(SERIES, 0)).toBeNull();
  });

  it("returns null for a targetIndex beyond series.length", () => {
    expect(movingAverageForecast(SERIES, SERIES.length + 1)).toBeNull();
  });

  it("returns null for a non-integer targetIndex", () => {
    expect(movingAverageForecast(SERIES, 2.5)).toBeNull();
  });

  it("returns null for a non-positive window", () => {
    expect(movingAverageForecast(SERIES, 4, 0)).toBeNull();
    expect(movingAverageForecast(SERIES, 4, -1)).toBeNull();
  });
});
