"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, Upload, Building2, AlertCircle } from "lucide-react";
import { calculateLandedCost } from "@/lib/calculator";

interface SettingsData {
  dollarRate: number;
  shippingPerKg: number;
  customsFee: number;
  profitMargin: number;
  payoutAccountNo?: string;
  payoutAccountName?: string;
  payoutBankName?: string;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productUrl = searchParams.get("url") || "";
  const productTitle = searchParams.get("title") || "منتج دولي";
  const productSpecs = searchParams.get("specs") || "";
  const priceUsd = parseFloat(searchParams.get("priceUsd") || "0");
  const weightKg = parseFloat(searchParams.get("weightKg") || "0.5");
  const quantity = parseInt(searchParams.get("quantity") || "1", 10);

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"BANKAK" | "SYBERPAY">("BANKAK");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return null;
        }
        return res.json();
      })
      .then((authData) => {
        if (authData?.user) {
          if (authData.user.phone) setDeliveryPhone(authData.user.phone);
          return fetch("/api/settings/public").then((r) => r.json());
        }
        return null;
      })
      .then((settingsData) => {
        if (settingsData) setSettings(settingsData);
      })
      .catch(() => setError("تعذر تحميل بيانات الدفع"));
  }, [router]);

  function handleCopyAccount() {
    if (!settings?.payoutAccountNo) return;
    navigator.clipboard.writeText(settings.payoutAccountNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!productUrl || priceUsd <= 0) {
      setError("بيانات المنتج غير مكتملة. يرجى العودة لحاسبة التكلفة.");
      return;
    }

    if (paymentMethod === "BANKAK" && !receiptFile) {
      setError("يرجى إرفاق صورة إيصال التحويل من تطبيق بنكك (JPG أو PNG).");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("productUrl", productUrl);
      formData.append("productTitle", productTitle);
      formData.append("productSpecs", productSpecs);
      formData.append("quantity", String(quantity));
      formData.append("priceUsd", String(priceUsd));
      formData.append("weightKg", String(weightKg));
      formData.append("deliveryAddress", deliveryAddress);
      formData.append("deliveryPhone", deliveryPhone);
      formData.append("paymentMethod", paymentMethod);
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "فشل إرسال الطلب");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard?newOrder=" + data.order.orderNumber);
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
      setSubmitting(false);
    }
  }

  if (!settings) {
    return <div className="text-center py-12 text-slate-500">جاري تحميل بيانات الدفع الآمنة...</div>;
  }

  const breakdown = calculateLandedCost(priceUsd, weightKg, quantity, settings);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">إتمام الطلب والدفع</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ملخص الطلب */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-3">ملخص الطلب</h2>
          <div className="text-sm space-y-1.5 text-slate-600">
            <p><span className="font-medium text-slate-800">المنتج:</span> {productTitle}</p>
            {productSpecs && <p><span className="font-medium text-slate-800">المواصفات:</span> {productSpecs}</p>}
            <p><span className="font-medium text-slate-800">الكمية:</span> {quantity} | <span className="font-medium text-slate-800">السعر:</span> ${priceUsd}</p>
            <p className="text-lg font-extrabold text-emerald-700 pt-2">
              المطلوب تحويله: {breakdown.totalSdg.toLocaleString()} ج.س
            </p>
          </div>
        </div>

        {/* بيانات التوصيل */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-slate-800">بيانات التوصيل</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                عنوان التوصيل بالتفصيل *
              </label>
              <input
                type="text"
                required
                placeholder="الولاية، المدينة، الحي، أقرب معلم"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                رقم الهاتف للتواصل (واتساب) *
              </label>
              <input
                type="tel"
                required
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* بوابة الدفع */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-slate-800">طريقة الدفع</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("BANKAK")}
              className={`p-3.5 rounded-xl border text-right transition ${
                paymentMethod === "BANKAK"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="font-bold text-sm">التحويل البنكي (بنكك - Bankak)</div>
              <div className="text-xs text-slate-500 mt-0.5">تحويل فوري + رفع صورة الإيصال</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("SYBERPAY")}
              className={`p-3.5 rounded-xl border text-right transition ${
                paymentMethod === "SYBERPAY"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="font-bold text-sm">الدفع الإلكتروني (SyberPay)</div>
              <div className="text-xs text-slate-500 mt-0.5">بوابة الدفع الآلي</div>
            </button>
          </div>

          {paymentMethod === "BANKAK" ? (
            <div className="space-y-4 pt-2">
              {/* تعليمات الدفع وحساب بنكك */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Building2 className="w-5 h-5" />
                  <span>بيانات الحساب البنكي للتحويل</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-white p-3.5 rounded-lg border border-amber-100">
                  <div>
                    <span className="text-slate-500 text-xs block">البنك</span>
                    <span className="font-bold text-slate-900">{settings.payoutBankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">اسم صاحب الحساب</span>
                    <span className="font-bold text-slate-900">{settings.payoutAccountName}</span>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 text-xs block">رقم الحساب</span>
                      <span className="font-mono text-lg font-extrabold text-emerald-700 tracking-wider">
                        {settings.payoutAccountNo}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "تم النسخ" : "نسخ رقم الحساب"}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-amber-800">
                  قم بتحويل مبلغ <strong>{breakdown.totalSdg.toLocaleString()} ج.س</strong> عبر تطبيق بنكك، ثم التقط لقطة شاشة للإيصال وأرفقها أدناه.
                </p>
              </div>

              {/* رفع الإيصال */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  صورة إيصال التحويل (JPG / PNG فقط) *
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 cursor-pointer bg-slate-50 transition">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-700">
                    {receiptFile ? receiptFile.name : "اضغط لاختيار صورة الإيصال"}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">الحد الأقصى 5 ميجابايت</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-sm text-slate-700">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p>
                تكامل SyberPay الآلي يتطلب تفعيل مفاتيح التاجر (Merchant API). يمكنك استخدام خيار{" "}
                <strong>التحويل البنكي (بنكك)</strong> أعلاه لإتمام طلبك فوراً.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || paymentMethod === "SYBERPAY"}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition text-base"
        >
          {submitting ? "جاري إرسال الطلب..." : "تأكيد وإرسال الطلب"}
        </button>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">جاري التحميل...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
