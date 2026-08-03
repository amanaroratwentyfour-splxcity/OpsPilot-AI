import { describe, expect, it } from "vitest";
import { computeProductForecastMetrics } from "@/lib/domain/forecasting/productForecastMetrics";
import { movingAverageForecast } from "@/lib/domain/forecasting/movingAverage";
import { exponentialSmoothingForecast } from "@/lib/domain/forecasting/exponentialSmoothing";
import { computeAggregateMAPE, computeMAPE } from "@/lib/domain/forecasting/accuracy";

const SERIES = [10, 20, 30, 40, 50, 60];

describe("computeProductForecastMetrics", () => {
  it("composes both forecasters and MAPE identically to calling the functions directly", () => {
    const targetIndices = [4, 5];
    const metrics = computeProductForecastMetrics("product-1", SERIES, targetIndices);

    expect(metrics.productId).toBe("product-1");
    expect(metrics.points).toHaveLength(2);

    for (const targetIndex of targetIndices) {
      const point = metrics.points.find((p) => p.targetIndex === targetIndex)!;
      const expectedActual = SERIES[targetIndex];
      const expectedMA = movingAverageForecast(SERIES, targetIndex);
      const expectedES = exponentialSmoothingForecast(SERIES, targetIndex);

      expect(point.actual).toBe(expectedActual);
      expect(point.movingAverageForecast).toBe(expectedMA);
      expect(point.exponentialSmoothingForecast).toBe(expectedES);
      expect(point.movingAverageMAPE).toBe(computeMAPE(expectedActual, expectedMA!));
      expect(point.exponentialSmoothingMAPE).toBe(computeMAPE(expectedActual, expectedES!));
    }

    const expectedMaAggregate = computeAggregateMAPE(
      targetIndices.map((i) => ({
        actual: SERIES[i],
        forecast: movingAverageForecast(SERIES, i)!,
      })),
    );
    const expectedEsAggregate = computeAggregateMAPE(
      targetIndices.map((i) => ({
        actual: SERIES[i],
        forecast: exponentialSmoothingForecast(SERIES, i)!,
      })),
    );

    expect(metrics.movingAverageAggregateMAPE).toBeCloseTo(expectedMaAggregate!, 10);
    expect(metrics.exponentialSmoothingAggregateMAPE).toBeCloseTo(expectedEsAggregate!, 10);
  });

  it("leaves actual and MAPE null for a target beyond known history (a genuine future forecast)", () => {
    const metrics = computeProductForecastMetrics("product-1", SERIES, [SERIES.length]);
    const point = metrics.points[0];

    expect(point.actual).toBeNull();
    expect(point.movingAverageForecast).not.toBeNull(); // still forecastable
    expect(point.movingAverageMAPE).toBeNull(); // but not assessable without a known actual
    expect(point.exponentialSmoothingMAPE).toBeNull();
  });

  it("returns an empty points array and null aggregates for no target periods", () => {
    const metrics = computeProductForecastMetrics("product-1", SERIES, []);

    expect(metrics.points).toEqual([]);
    expect(metrics.movingAverageAggregateMAPE).toBeNull();
    expect(metrics.exponentialSmoothingAggregateMAPE).toBeNull();
  });

  it("returns null forecasts (not a crash) for a target index with no prior data", () => {
    const metrics = computeProductForecastMetrics("product-1", SERIES, [0]);
    const point = metrics.points[0];

    expect(point.movingAverageForecast).toBeNull();
    expect(point.exponentialSmoothingForecast).toBeNull();
  });
});
