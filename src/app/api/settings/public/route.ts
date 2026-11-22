import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const settings = getPlatformSettings();
    const session = await getSession();

    const response: Record<string, unknown> = {
      dollarRate: settings.dollarRate,
      shippingPerKg: settings.shippingPerKg,
      customsFee: settings.customsFee,
      profitMargin: settings.profitMargin,
    };

    // خصوصية بيانات الدفع: لا تظهر بيانات الحساب البنكي إلا للمستخدم المسجل في الصفحات المحمية
    if (session) {
      response.payoutAccountNo = settings.payoutAccountNo;
      response.payoutAccountName = settings.payoutAccountName;
      response.payoutBankName = settings.payoutBankName;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("Public settings error:", err);
    return NextResponse.json({ error: "تعذر جلب إعدادات التسعير" }, { status: 500 });
  }
}
