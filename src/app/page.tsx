import { db, getPlatformSettings } from "@/lib/db";
import LandedCostCalculator from "@/components/LandedCostCalculator";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const settings = getPlatformSettings();
  const curatedProducts = db
    .prepare("SELECT * FROM CuratedProduct WHERE isActive = 1 ORDER BY createdAt DESC")
    .all() as Array<{
      id: string;
      title: string;
      store: string;
      url: string;
      priceUsd: number;
      estimatedWeightKg: number;
      category: string;
    }>;

  return (
    <LandedCostCalculator
      pricing={{
        dollarRate: settings.dollarRate,
        shippingPerKg: settings.shippingPerKg,
        customsFee: settings.customsFee,
        profitMargin: settings.profitMargin,
      }}
      curatedProducts={curatedProducts}
    />
  );
}
