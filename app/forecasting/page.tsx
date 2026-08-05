import { PageHeader } from "@/components/page-header";
import { ForecastingExplorer } from "@/components/forecasting/forecasting-explorer";
import { ForecastingInsightsProvider } from "@/components/forecasting/forecasting-insights-context";
import { GenerateInsightsButton } from "@/components/forecasting/generate-insights-button";
import { ForecastInsightsPanel } from "@/components/forecasting/forecast-insights-panel";
import { getForecastData, getForecastingOverview } from "@/lib/presentation/forecastingData";
import { buildForecastingInsight } from "@/lib/presentation/forecastingInsights";
import { prisma } from "@/lib/db/prisma";

export default async function ForecastingPage() {
  const [products, productWithForecast, overview] = await Promise.all([
    prisma.product.findMany({ select: { id: true, sku: true, name: true }, orderBy: { sku: "asc" } }),
    prisma.forecast.findFirst({ select: { productId: true }, orderBy: { productId: "asc" } }),
    getForecastingOverview(),
  ]);

  const initialProductId = productWithForecast?.productId ?? products[0]?.id ?? "";
  const initialData = initialProductId ? await getForecastData(initialProductId) : null;

  const forecastingInsight = buildForecastingInsight(overview);
  const maAccuracy =
    overview.movingAverageAggregateMAPE !== null ? 100 - overview.movingAverageAggregateMAPE : null;
  const esAccuracy =
    overview.exponentialSmoothingAggregateMAPE !== null ? 100 - overview.exponentialSmoothingAggregateMAPE : null;
  const aiRequestPayload = {
    movingAverageAccuracy: maAccuracy,
    exponentialSmoothingAccuracy: esAccuracy,
    productsRequiringAttention: overview.productsRequiringAttention,
  };

  return (
    <ForecastingInsightsProvider requestPayload={aiRequestPayload}>
      <div className="space-y-6">
        <PageHeader
          title="Demand Forecasting"
          description="Moving Average and Exponential Smoothing forecasts, powered by the Forecast Engine."
        />

        <div className="flex justify-end">
          <GenerateInsightsButton />
        </div>
        <ForecastInsightsPanel summary={forecastingInsight.summary} insight={forecastingInsight.insight} />

        <ForecastingExplorer products={products} initialData={initialData} />
      </div>
    </ForecastingInsightsProvider>
  );
}
