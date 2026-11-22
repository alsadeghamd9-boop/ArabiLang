import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, generateId, getPlatformSettings } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const settings = getPlatformSettings();
    const auditLogs = db
      .prepare("SELECT * FROM AuditLog ORDER BY createdAt DESC LIMIT 30")
      .all();

    return NextResponse.json({ settings, auditLogs });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 });
    console.error("Admin settings GET error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب الإعدادات" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const settings = getPlatformSettings();

    const isPayoutUpdate =
      body.payoutAccountNo !== undefined ||
      body.payoutAccountName !== undefined ||
      body.payoutBankName !== undefined;

    // أمان: تأكيد كلمة مرور المشرف قبل تعديل بيانات الحساب البنكي
    if (isPayoutUpdate) {
      if (!body.confirmPassword) {
        return NextResponse.json(
          { error: "يجب إدخال كلمة مرور المشرف لتأكيد تعديل الحساب البنكي" },
          { status: 400 }
        );
      }

      const adminRow = db
        .prepare("SELECT passwordHash FROM User WHERE id = ?")
        .get(admin.userId) as { passwordHash: string } | undefined;

      if (!adminRow || !(await bcrypt.compare(body.confirmPassword, adminRow.passwordHash))) {
        return NextResponse.json(
          { error: "كلمة المرور غير صحيحة. تم رفض التعديل" },
          { status: 403 }
        );
      }
    }

    const nextAccountNo = body.payoutAccountNo?.trim() || settings.payoutAccountNo;
    const nextAccountName = body.payoutAccountName?.trim() || settings.payoutAccountName;
    const nextBankName = body.payoutBankName?.trim() || settings.payoutBankName;
    const nextDollarRate = body.dollarRate !== undefined ? Number(body.dollarRate) : settings.dollarRate;
    const nextShippingPerKg = body.shippingPerKg !== undefined ? Number(body.shippingPerKg) : settings.shippingPerKg;
    const nextCustomsFee = body.customsFee !== undefined ? Number(body.customsFee) : settings.customsFee;
    const nextProfitMargin = body.profitMargin !== undefined ? Number(body.profitMargin) : settings.profitMargin;

    db.prepare(`
      UPDATE PlatformSettings
      SET payoutAccountNo = ?,
          payoutAccountName = ?,
          payoutBankName = ?,
          dollarRate = ?,
          shippingPerKg = ?,
          customsFee = ?,
          profitMargin = ?,
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(
      nextAccountNo,
      nextAccountName,
      nextBankName,
      nextDollarRate,
      nextShippingPerKg,
      nextCustomsFee,
      nextProfitMargin,
      settings.id
    );

    const actionType = isPayoutUpdate ? "UPDATE_PAYOUT_SETTINGS" : "UPDATE_PRICING_SETTINGS";
    const details = isPayoutUpdate
      ? `تحديث الحساب البنكي إلى: ${nextAccountNo} (${nextAccountName} - ${nextBankName})`
      : `تحديث التسعير: الدولار=${nextDollarRate}، الشحن/كجم=${nextShippingPerKg}، الجمارك=${nextCustomsFee}، الهامش=${nextProfitMargin}`;

    db.prepare(`
      INSERT INTO AuditLog (id, adminId, adminName, action, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId(), admin.userId, admin.name, actionType, details);

    return NextResponse.json({ success: true, settings: getPlatformSettings() });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 });
    console.error("Admin settings PATCH error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الإعدادات" }, { status: 500 });
  }
}
