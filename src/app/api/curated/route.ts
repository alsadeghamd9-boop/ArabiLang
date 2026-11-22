import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const products = db
      .prepare("SELECT * FROM CuratedProduct WHERE isActive = 1 ORDER BY createdAt DESC")
      .all();
    return NextResponse.json({ products });
  } catch (err) {
    console.error("Curated products error:", err);
    return NextResponse.json({ error: "تعذر جلب المنتجات المقترحة" }, { status: 500 });
  }
}
