import { describe, expect, it } from "vitest";
import { pickMoreAccurateForecast } from "@/lib/domain/recommendations/pickMoreAccurateForecast";

describe("pickMoreAccurateForecast", () => {
  it("picks Moving Average when it has the lower aggregate MAPE", () => {
    const result = pickMoreAccurateForecast({
      movingAverage: { forecastSeries: [10, 20], aggregateMAPE: 8 },
      exponentialSmoothing: { forecastSeries: [11, 22], aggregateMAPE: 15 },
    });
    expect(result).toEqual({ forecastSeries: [10, 20], aggregateMAPE: 8 });
  });

  it("picks Exponential Smoothing when it has the lower aggregate MAPE", () => {
    const result = pickMoreAccurateForecast({
      movingAverage: { forecastSeries: [10, 20], aggregateMAPE: 25 },
      exponentialSmoothing: { forecastSeries: [11, 22], aggregateMAPE: 9 },
    });
    expect(result).toEqual({ forecastSeries: [11, 22], aggregateMAPE: 9 });
  });

  it("breaks an exact tie in favor of Moving Average", () => {
    const result = pickMoreAccurateForecast({
      movingAverage: { forecastSeries: [10, 20], aggregateMAPE: 12 },
      exponentialSmoothing: { forecastSeries: [11, 22], aggregateMAPE: 12 },
    });
    expect(result).toEqual({ forecastSeries: [10, 20], aggregateMAPE: 12 });
  });

  it("falls back to Exponential Smoothing when Moving Average's MAPE is null", () => {
    const result = pickMoreAccurateForecast({
      movingAverage: { forecastSeries: [], aggregateMAPE: null },
      exponentialSmoothing: { forecastSeries: [11, 22], aggregateMAPE: 9 },
    });
    expect(result).toEqual({ forecastSeries: [11, 22], aggregateMAPE: 9 });
  });

  it("falls back to Moving Average when Exponential Smoothing's MAPE is null", () => {
    const result = pickMoreAccurateForecast({
      movingAverage: { forecastSeries: [10, 20], aggregateMAPE: 8 },
      exponentialSmoothing: { forecastSeries: [], aggregateMAPE: null },
    });
    expect(result).toEqual({ forecastSeries: [10, 20], aggregateMAPE: 8 });
  });

  it("returns an empty series and null MAPE when both methods are null", () => {
    const result = pickMoreAccurateForecast({
      movingAverage: { forecastSeries: [], aggregateMAPE: null },
      exponentialSmoothing: { forecastSeries: [], aggregateMAPE: null },
    });
    expect(result).toEqual({ forecastSeries: [], aggregateMAPE: null });
  });
});
