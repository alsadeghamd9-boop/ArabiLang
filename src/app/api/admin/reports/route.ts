import { NextResponse } from "next/server";
import { db, getPlatformSettings } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "monthly"; // daily | weekly | monthly

    let dateFilter = "datetime('now', '-30 days')";
    if (period === "daily") dateFilter = "datetime('now', '-1 day')";
    if (period === "weekly") dateFilter = "datetime('now', '-7 days')";

    const approvedStatuses = `'PAYMENT_APPROVED','PURCHASED','IN_WAREHOUSE','IN_TRANSIT','IN_CUSTOMS','READY_FOR_DELIVERY','DELIVERED'`;

    const summary = db
      .prepare(`
        SELECT 
          COUNT(*) as totalOrders,
          COALESCE(SUM(totalSdg), 0) as totalCollectedSdg,
          COALESCE(SUM(profitMarginSdg), 0) as totalProfitSdg
        FROM "Order"
        WHERE status IN (${approvedStatuses})
          AND createdAt >= ${dateFilter}
      `)
      .get() as { totalOrders: number; totalCollectedSdg: number; totalProfitSdg: number };

    const settings = getPlatformSettings();

    return NextResponse.json({
      period,
      payoutAccountNo: settings.payoutAccountNo,
      payoutBankName: settings.payoutBankName,
      ...summary,
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 });
    console.error("Admin reports GET error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب التقارير المالية" }, { status: 500 });
  }
}
