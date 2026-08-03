import { PageHeader } from "@/components/page-header";
import { ForecastingExplorer } from "@/components/forecasting/forecasting-explorer";
import { getForecastData } from "@/lib/presentation/forecastingData";
import { prisma } from "@/lib/db/prisma";

export default async function ForecastingPage() {
  const [products, productWithForecast] = await Promise.all([
    prisma.product.findMany({ select: { id: true, sku: true, name: true }, orderBy: { sku: "asc" } }),
    prisma.forecast.findFirst({ select: { productId: true }, orderBy: { productId: "asc" } }),
  ]);

  const initialProductId = productWithForecast?.productId ?? products[0]?.id ?? "";
  const initialData = initialProductId ? await getForecastData(initialProductId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demand Forecasting"
        description="Moving Average and Exponential Smoothing forecasts, powered by the Forecast Engine."
      />
      <ForecastingExplorer products={products} initialData={initialData} />
    </div>
  );
}
