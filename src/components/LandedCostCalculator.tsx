"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, ArrowLeft, ExternalLink } from "lucide-react";
import { calculateLandedCost, PricingConfig } from "@/lib/calculator";

interface CuratedProduct {
  id: string;
  title: string;
  store: string;
  url: string;
  priceUsd: number;
  estimatedWeightKg: number;
  category: string;
}

export default function LandedCostCalculator({
  pricing,
  curatedProducts,
}: {
  pricing: PricingConfig;
  curatedProducts: CuratedProduct[];
}) {
  const router = useRouter();
  const [productUrl, setProductUrl] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [productSpecs, setProductSpecs] = useState("");
  const [priceUsd, setPriceUsd] = useState<string>("25");
  const [weightKg, setWeightKg] = useState<string>("0.5");
  const [quantity, setQuantity] = useState<string>("1");
  const [error, setError] = useState("");

  const numericPrice = parseFloat(priceUsd) || 0;
  const numericWeight = parseFloat(weightKg) || 0.5;
  const numericQty = parseInt(quantity, 10) || 1;

  const breakdown = calculateLandedCost(numericPrice, numericWeight, numericQty, pricing);

  function handleSelectCurated(p: CuratedProduct) {
    setProductUrl(p.url);
    setProductTitle(p.title);
    setPriceUsd(String(p.priceUsd));
    setWeightKg(String(p.estimatedWeightKg));
    setQuantity("1");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleOrderNow(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!productUrl.trim()) {
      setError("يرجى لصق رابط المنتج أولاً");
      return;
    }
    try {
      new URL(productUrl.trim());
    } catch {
      setError("الرابط غير صالح. تأكد من نسخه بالكامل (يبدأ بـ https://)");
      return;
    }
    if (numericPrice <= 0) {
      setError("يرجى إدخال سعر المنتج بالدولار");
      return;
    }

    const params = new URLSearchParams({
      url: productUrl.trim(),
      title: productTitle.trim() || "منتج دولي",
      specs: productSpecs.trim(),
      priceUsd: String(numericPrice),
      weightKg: String(numericWeight),
      quantity: String(numericQty),
    });

    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              حاسبة التكلفة الشفافة
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              اطلب من أمازون، شي إن، علي إكسبريس، أو نون وادفع بالجنيه السوداني
            </p>
          </div>
        </div>

        <form onSubmit={handleOrderNow} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                رابط المنتج (Amazon / Shein / AliExpress / Noon) *
              </label>
              <input
                type="url"
                dir="ltr"
                required
                placeholder="https://www.amazon.com/dp/..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  اسم المنتج (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: سماعة بلوتوث"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  المواصفات (اللون / المقاس)
                </label>
                <input
                  type="text"
                  placeholder="مثال: أسود، مقاس L"
                  value={productSpecs}
                  onChange={(e) => setProductSpecs(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                  السعر ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                  الوزن (كجم)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                  الكمية
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-slate-800 mb-4 text-base">تفصيل الفاتورة التقديرية</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>قيمة المنتج ({pricing.dollarRate.toLocaleString()} ج.س/$)</span>
                  <span className="font-medium">{breakdown.productBaseSdg.toLocaleString()} ج.س</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>الشحن الدولي ({numericWeight * numericQty} كجم)</span>
                  <span className="font-medium">{breakdown.shippingCostSdg.toLocaleString()} ج.س</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>رسوم التخليص الجمركي</span>
                  <span className="font-medium">{breakdown.customsFeeSdg.toLocaleString()} ج.س</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>رسوم خدمة المنصة ({Math.round(pricing.profitMargin * 100)}%)</span>
                  <span className="font-medium">{breakdown.profitMarginSdg.toLocaleString()} ج.س</span>
                </div>
                <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center">
                  <span className="font-bold text-slate-900">الإجمالي المطلوب</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    {breakdown.totalSdg.toLocaleString()} ج.س
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <span>اطلب الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </form>
      </section>

      {curatedProducts.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">منتجات مقترحة للطلب السريع</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {curatedProducts.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:border-emerald-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{item.store}</span>
                    <span>{item.category}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-emerald-700 font-bold text-base mb-3">${item.priceUsd}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCurated(item)}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs py-2 rounded-lg transition"
                  >
                    احسب واطلب
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-slate-600"
                    title="فتح في المتجر"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
