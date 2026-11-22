"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Package, ExternalLink, Plus } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/lib/calculator";

interface OrderItem {
  id: string;
  orderNumber: string;
  productTitle: string;
  productUrl: string;
  quantity: number;
  totalSdg: number;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login?redirect=/dashboard");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setOrders(data.orders || []);
          setNotifications(data.notifications || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">جاري تحميل طلباتك...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">لوحة تتبع الطلبات</h1>
          <p className="text-sm text-slate-500">تابع حالة شحناتك من الشراء وحتى التوصيل</p>
        </div>
        <Link
          href="/"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>طلب منتج جديد</span>
        </Link>
      </div>

      {/* الإشعارات */}
      {notifications.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4 text-emerald-600" />
            <span>أحدث الإشعارات</span>
          </h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-3">
                <span className="font-bold text-slate-800 block">{n.title}</span>
                <span className="text-slate-600">{n.message}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* الطلبات */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-4">لا توجد لديك طلبات حتى الآن</p>
          <Link href="/" className="text-emerald-700 font-bold text-sm hover:underline">
            ابدأ بحساب تكلفة أول منتج
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const currentStepIdx = ORDER_STATUS_STEPS.indexOf(order.status);
            const isRejected = order.status === "PAYMENT_REJECTED";

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-mono text-slate-400 block">#{order.orderNumber}</span>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      {order.productTitle}
                      <a
                        href={order.productUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-emerald-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </h3>
                  </div>
                  <div className="text-left">
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                        isRejected
                          ? "bg-red-100 text-red-700"
                          : order.status === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {order.totalSdg.toLocaleString()} ج.س
                    </p>
                  </div>
                </div>

                {isRejected && order.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
                    <strong>سبب الرفض:</strong> {order.rejectionReason}
                  </div>
                )}

                {!isRejected && (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
                    {ORDER_STATUS_STEPS.map((step, idx) => {
                      const done = idx <= currentStepIdx;
                      return (
                        <div key={step} className="text-center">
                          <div
                            className={`h-2 rounded-full mb-1.5 ${
                              done ? "bg-emerald-600" : "bg-slate-200"
                            }`}
                          />
                          <span
                            className={`text-[10px] leading-tight block ${
                              done ? "text-emerald-800 font-semibold" : "text-slate-400"
                            }`}
                          >
                            {ORDER_STATUS_LABELS[step]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
