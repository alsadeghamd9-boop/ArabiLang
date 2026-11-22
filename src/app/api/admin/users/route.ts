import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const users = db
      .prepare(`
        SELECT u.id, u.name, u.email, u.phone, u.role, u.address, u.createdAt,
               COUNT(o.id) as orderCount
        FROM User u
        LEFT JOIN "Order" o ON u.id = o.userId
        GROUP BY u.id
        ORDER BY u.createdAt DESC
      `)
      .all();

    return NextResponse.json({ users });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 });
    console.error("Admin users GET error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب المستخدمين" }, { status: 500 });
  }
}
