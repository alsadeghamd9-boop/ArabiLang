"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  DollarSign,
  Building2,
  BarChart3,
  Users,
  CheckCircle,
  XCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/lib/calculator";

type TabType = "orders" | "pricing" | "payout" | "reports" | "users";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  // Settings & AuditLog state
  const [settings, setSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  // Pricing form
  const [dollarRate, setDollarRate] = useState("");
  const [shippingPerKg, setShippingPerKg] = useState("");
  const [customsFee, setCustomsFee] = useState("");
  const [profitMargin, setProfitMargin] = useState("");
  // Payout form
  const [payoutAccountNo, setPayoutAccountNo] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [payoutBankName, setPayoutBankName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Reports state
  const [reportPeriod, setReportPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [reportData, setReportData] = useState<any>(null);
  // Users & Curated state
  const [users, setUsers] = useState<any[]>([]);
  const [curated, setCurated] = useState<any[]>([]);
  const [newProd, setNewProd] = useState({ title: "", store: "Amazon", url: "", priceUsd: "", estimatedWeightKg: "0.5", category: "إلكترونيات" });

  async function loadAll() {
    setLoading(true);
    try {
      const [ordersRes, settingsRes, usersRes, curatedRes] = await Promise.all([
        fetch("/api/admin/orders"),
        fetch("/api/admin/settings"),
        fetch("/api/admin/users"),
        fetch("/api/curated"),
      ]);

      if (ordersRes.status === 401 || ordersRes.status === 403) {
        router.push("/login?redirect=/admin");
        return;
      }

      const ordersData = await ordersRes.json();
      const settingsData = await settingsRes.json();
      const usersData = await usersRes.json();
      const curatedData = await curatedRes.json();

      setOrders(ordersData.orders || []);
      if (settingsData.settings) {
        const s = settingsData.settings;
        setSettings(s);
        setDollarRate(String(s.dollarRate));
        setShippingPerKg(String(s.shippingPerKg));
        setCustomsFee(String(s.customsFee));
        setProfitMargin(String(s.profitMargin));
        setPayoutAccountNo(s.payoutAccountNo);
        setPayoutAccountName(s.payoutAccountName);
        setPayoutBankName(s.payoutBankName);
      }
      setAuditLogs(settingsData.auditLogs || []);
      setUsers(usersData.users || []);
      setCurated(curatedData.products || []);
    } catch {
      setError("تعذر تحميل بيانات لوحة الإدارة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetch(`/api/admin/reports?period=${reportPeriod}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setReportData(d));
  }, [reportPeriod]);

  function notify(msg: string, isErr = false) {
    if (isErr) {
      setError(msg);
      setMessage("");
    } else {
      setMessage(msg);
      setError("");
    }
    setTimeout(() => {
      setMessage("");
      setError("");
    }, 4000);
  }

  async function handleOrderUpdate(orderId: string, payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error || "فشل التحديث", true);
    notify("تم تحديث الطلب بنجاح");
    loadAll();
  }

  async function handleSavePricing(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dollarRate, shippingPerKg, customsFee, profitMargin }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error || "فشل حفظ التسعير", true);
    notify("تم تحديث إعدادات التسعير بنجاح");
    loadAll();
  }

  async function handleSavePayout(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payoutAccountNo,
        payoutAccountName,
        payoutBankName,
        confirmPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error || "فشل تحديث الحساب البنكي", true);
    setConfirmPassword("");
    notify("تم تحديث بيانات الحساب البنكي وتسجيل العملية في سجل الأمان");
    loadAll();
  }

  async function handleAddCurated(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/curated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProd),
    });
    if (!res.ok) return notify("فشل إضافة المنتج", true);
    setNewProd({ title: "", store: "Amazon", url: "", priceUsd: "", estimatedWeightKg: "0.5", category: "إلكترونيات" });
    notify("تمت إضافة المنتج المقترح");
    loadAll();
  }

  async function handleDeleteCurated(id: string) {
    await fetch(`/api/admin/curated?id=${id}`, { method: "DELETE" });
    notify("تم حذف المنتج");
    loadAll();
  }

  if (loading) {
    return <div className="text-center py-12 text-slate-500">جاري تحميل لوحة الإدارة...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">لوحة الإدارة — سودان-بريدج</h1>
        {settings && (
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
            حساب التحصيل الحالي: {settings.payoutAccountNo} ({settings.payoutBankName})
          </span>
        )}
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "orders", label: "إدارة الطلبات", icon: ClipboardList },
          { id: "pricing", label: "إدارة التسعير", icon: DollarSign },
          { id: "payout", label: "الحساب البنكي والأمان", icon: Building2 },
          { id: "reports", label: "التقارير المالية", icon: BarChart3 },
          { id: "users", label: "المستخدمين والكتالوج", icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeTab === t.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. إدارة الطلبات */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-slate-500 text-center py-8 bg-white rounded-xl border">لا توجد طلبات حتى الآن</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-mono text-slate-400">#{o.orderNumber}</span>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      {o.productTitle}
                      <a href={o.productUrl} target="_blank" rel="noreferrer" className="text-emerald-600">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      العميل: {o.customerName} | الهاتف: {o.deliveryPhone} | العنوان: {o.deliveryAddress}
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-extrabold text-emerald-700 block">
                      {o.totalSdg.toLocaleString()} ج.س
                    </span>
                    <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-semibold inline-block mt-1">
                      {ORDER_STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>
                </div>

                {o.receiptUrl && (
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <a
                      href={o.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-emerald-700 underline"
                    >
                      عرض صورة إيصال بنكك المرفوعة
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {o.status === "PENDING_REVIEW" && (
                    <>
                      <button
                        onClick={() => handleOrderUpdate(o.id, { status: "PAYMENT_APPROVED" })}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4" />
                        اعتماد الدفع
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt("أدخل سبب رفض الدفع:");
                          if (reason) handleOrderUpdate(o.id, { status: "PAYMENT_REJECTED", rejectionReason: reason });
                        }}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
                      >
                        <XCircle className="w-4 h-4" />
                        رفض الدفع
                      </button>
                    </>
                  )}

                  <select
                    value={o.status}
                    onChange={(e) => handleOrderUpdate(o.id, { status: e.target.value })}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                  >
                    {ORDER_STATUS_STEPS.map((st) => (
                      <option key={st} value={st}>
                        {ORDER_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. إدارة التسعير */}
      {activeTab === "pricing" && (
        <form onSubmit={handleSavePricing} className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl space-y-4">
          <h2 className="font-bold text-slate-900">إعدادات التسعير الديناميكية</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">سعر صرف الدولار (ج.س)</label>
              <input
                type="number"
                step="0.01"
                value={dollarRate}
                onChange={(e) => setDollarRate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">سعر شحن الكيلو (ج.س)</label>
              <input
                type="number"
                step="1"
                value={shippingPerKg}
                onChange={(e) => setShippingPerKg(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">رسوم التخليص الجمركي (ج.س)</label>
              <input
                type="number"
                step="1"
                value={customsFee}
                onChange={(e) => setCustomsFee(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">نسبة هامش الربح (مثال: 0.15 لـ 15%)</label>
              <input
                type="number"
                step="0.01"
                value={profitMargin}
                onChange={(e) => setProfitMargin(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl">
            حفظ إعدادات التسعير
          </button>
        </form>
      )}

      {/* 3. إعدادات الحساب البنكي (Payout Settings) */}
      {activeTab === "payout" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSavePayout} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-bold text-slate-900">إعدادات الحساب البنكي المستلم للأموال</h2>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">رقم الحساب البنكي</label>
              <input
                type="text"
                required
                value={payoutAccountNo}
                onChange={(e) => setPayoutAccountNo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">اسم صاحب الحساب</label>
              <input
                type="text"
                required
                value={payoutAccountName}
                onChange={(e) => setPayoutAccountName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">اسم البنك</label>
              <input
                type="text"
                required
                value={payoutBankName}
                onChange={(e) => setPayoutBankName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-red-700 mb-1">
                تأكيد كلمة مرور المشرف (إلزامي للحفظ) *
              </label>
              <input
                type="password"
                required
                placeholder="أدخل كلمة مرور حسابك للتأكيد"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-red-300 px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl">
              تحديث الحساب البنكي
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4">سجل الأمان والتعديلات (Audit Log)</h2>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{log.adminName}</span>
                    <span className="text-slate-400 font-normal">{log.createdAt}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. التقارير المالية */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900">التقارير المالية لحساب التحصيل</h2>
            <div className="flex gap-2">
              {[
                { id: "daily", label: "يومي" },
                { id: "weekly", label: "أسبوعي" },
                { id: "monthly", label: "شهري" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setReportPeriod(p.id as "daily" | "weekly" | "monthly")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    reportPeriod === p.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {reportData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <span className="text-xs text-emerald-700 block">إجمالي المحصّل في حساب {reportData.payoutAccountNo}</span>
                <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">
                  {Number(reportData.totalCollectedSdg).toLocaleString()} ج.س
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <span className="text-xs text-amber-700 block">صافي أرباح المنصة التقديرية</span>
                <span className="text-2xl font-extrabold text-amber-900 mt-1 block">
                  {Number(reportData.totalProfitSdg).toLocaleString()} ج.س
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs text-slate-600 block">عدد الطلبات المعتمدة</span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                  {reportData.totalOrders}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. المستخدمين والكتالوج */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-4">العملاء المسجلين ({users.length})</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
              {users.map((u) => (
                <div key={u.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-900 block">{u.name}</span>
                    <span className="text-slate-500">{u.phone || u.email}</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    {u.orderCount} طلبات
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-bold text-slate-900">إضافة منتج مقترح للكتالوج</h2>
            <form onSubmit={handleAddCurated} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="اسم المنتج"
                value={newProd.title}
                onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newProd.store}
                  onChange={(e) => setNewProd({ ...newProd, store: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Amazon">Amazon</option>
                  <option value="Shein">Shein</option>
                  <option value="AliExpress">AliExpress</option>
                  <option value="Noon">Noon</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="السعر ($)"
                  value={newProd.priceUsd}
                  onChange={(e) => setNewProd({ ...newProd, priceUsd: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <input
                type="url"
                required
                placeholder="رابط المنتج"
                value={newProd.url}
                onChange={(e) => setNewProd({ ...newProd, url: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <button type="submit" className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg">
                إضافة للكتالوج
              </button>
            </form>

            <div className="space-y-2 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto">
              {curated.map((c) => (
                <div key={c.id} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg">
                  <span>{c.title} (${c.priceUsd})</span>
                  <button onClick={() => handleDeleteCurated(c.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
