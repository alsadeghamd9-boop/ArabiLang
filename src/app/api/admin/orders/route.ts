import { NextResponse } from "next/server";
import { db, generateId } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUS_LABELS } from "@/lib/calculator";

export async function GET() {
  try {
    await requireAdmin();
    const orders = db
      .prepare(`
        SELECT o.*, u.name as customerName, u.email as customerEmail, u.phone as customerPhone
        FROM "Order" o
        JOIN User u ON o.userId = u.id
        ORDER BY o.createdAt DESC
      `)
      .all();

    return NextResponse.json({ orders });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 });
    console.error("Admin orders GET error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب الطلبات" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { orderId, status, rejectionReason, actualShippingSdg, actualCustomsSdg } = body;

    if (!orderId) {
      return NextResponse.json({ error: "معرف الطلب مطلوب" }, { status: 400 });
    }

    const order = db.prepare('SELECT * FROM "Order" WHERE id = ?').get(orderId) as {
      id: string;
      userId: string;
      orderNumber: string;
      status: string;
    } | undefined;

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const newStatus = status || order.status;
    db.prepare(`
      UPDATE "Order"
      SET status = ?,
          rejectionReason = COALESCE(?, rejectionReason),
          actualShippingSdg = COALESCE(?, actualShippingSdg),
          actualCustomsSdg = COALESCE(?, actualCustomsSdg),
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(
      newStatus,
      rejectionReason ?? null,
      actualShippingSdg !== undefined && actualShippingSdg !== "" ? Number(actualShippingSdg) : null,
      actualCustomsSdg !== undefined && actualCustomsSdg !== "" ? Number(actualCustomsSdg) : null,
      orderId
    );

    if (status && status !== order.status) {
      const statusLabel = ORDER_STATUS_LABELS[status] || status;
      const notifMessage =
        status === "PAYMENT_REJECTED" && rejectionReason
          ? `تم رفض الدفع للطلب ${order.orderNumber}. السبب: ${rejectionReason}`
          : `تم تحديث حالة طلبك رقم ${order.orderNumber} إلى: ${statusLabel}`;

      db.prepare(`
        INSERT INTO Notification (id, userId, orderId, title, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId(), order.userId, order.id, "تحديث حالة الطلب", notifMessage);

      db.prepare(`
        INSERT INTO AuditLog (id, adminId, adminName, action, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        generateId(),
        admin.userId,
        admin.name,
        "UPDATE_ORDER_STATUS",
        `تحديث الطلب ${order.orderNumber} إلى ${statusLabel}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 });
    console.error("Admin orders PATCH error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الطلب" }, { status: 500 });
  }
}
