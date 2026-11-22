import { NextResponse } from "next/server";
import { db, generateId } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { title, store, url, priceUsd, estimatedWeightKg, category } = body;

    if (!title || !store || !url || !priceUsd) {
      return NextResponse.json({ error: "جميع الحقول الأساسية مطلوبة" }, { status: 400 });
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO CuratedProduct (id, title, store, url, priceUsd, estimatedWeightKg, category, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, title, store, url, Number(priceUsd), Number(estimatedWeightKg || 0.5), category || "عام");

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 });
    console.error("Admin curated POST error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة المنتج" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "المعرف مطلوب" }, { status: 400 });

    db.prepare("DELETE FROM CuratedProduct WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات المشرف مطلوبة" }, { status: 403 });
    console.error("Admin curated DELETE error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء حذف المنتج" }, { status: 500 });
  }
}
