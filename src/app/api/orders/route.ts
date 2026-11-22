import { NextResponse } from "next/server";
import { db, generateId, getPlatformSettings } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { calculateLandedCost, createOrderSchema } from "@/lib/calculator";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await requireAuth();
    const orders = db
      .prepare('SELECT * FROM "Order" WHERE userId = ? ORDER BY createdAt DESC')
      .all(session.userId);

    const notifications = db
      .prepare("SELECT * FROM Notification WHERE userId = ? ORDER BY createdAt DESC LIMIT 20")
      .all(session.userId);

    return NextResponse.json({ orders, notifications });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }
    console.error("Get orders error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب الطلبات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const formData = await req.formData();

    const rawData = {
      productUrl: formData.get("productUrl") as string,
      productTitle: formData.get("productTitle") as string,
      productSpecs: (formData.get("productSpecs") as string) || "",
      quantity: formData.get("quantity") as string,
      priceUsd: formData.get("priceUsd") as string,
      weightKg: formData.get("weightKg") as string,
      deliveryAddress: formData.get("deliveryAddress") as string,
      deliveryPhone: formData.get("deliveryPhone") as string,
      paymentMethod: (formData.get("paymentMethod") as string) || "BANKAK",
    };

    const parsed = createOrderSchema.safeParse(rawData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }

    const receiptFile = formData.get("receipt") as File | null;
    if (parsed.data.paymentMethod === "BANKAK" && (!receiptFile || receiptFile.size === 0)) {
      return NextResponse.json(
        { error: "إيصال التحويل البنكي (JPG/PNG) إلزامي لإتمام الطلب" },
        { status: 400 }
      );
    }

    let receiptUrl: string | null = null;
    if (receiptFile && receiptFile.size > 0) {
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedTypes.includes(receiptFile.type)) {
        return NextResponse.json(
          { error: "صيغة الملف غير مدعومة. يرجى رفع صورة JPG أو PNG فقط" },
          { status: 400 }
        );
      }

      if (receiptFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "حجم صورة الإيصال يجب ألا يتجاوز 5 ميجابايت" },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const ext = receiptFile.type === "image/png" ? "png" : "jpg";
      const fileName = `receipt-${crypto.randomBytes(8).toString("hex")}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      receiptUrl = `/uploads/receipts/${fileName}`;
    }

    const settings = getPlatformSettings();
    const breakdown = calculateLandedCost(
      parsed.data.priceUsd,
      parsed.data.weightKg,
      parsed.data.quantity,
      settings
    );

    const orderId = generateId();
    const orderNumber = `SB-${Date.now().toString().slice(-6)}`;

    db.prepare(`
      INSERT INTO "Order" (
        id, orderNumber, userId, productUrl, productTitle, productSpecs,
        quantity, priceUsd, weightKg, dollarRateSnapshot,
        shippingCostSdg, customsFeeSdg, profitMarginSdg, totalSdg,
        deliveryAddress, deliveryPhone, paymentMethod, receiptUrl, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW')
    `).run(
      orderId,
      orderNumber,
      session.userId,
      parsed.data.productUrl,
      parsed.data.productTitle,
      parsed.data.productSpecs || null,
      parsed.data.quantity,
      parsed.data.priceUsd,
      parsed.data.weightKg,
      settings.dollarRate,
      breakdown.shippingCostSdg,
      breakdown.customsFeeSdg,
      breakdown.profitMarginSdg,
      breakdown.totalSdg,
      parsed.data.deliveryAddress,
      parsed.data.deliveryPhone,
      parsed.data.paymentMethod,
      receiptUrl
    );

    // إنشاء إشعار داخلي للمستخدم (بدون تضمين رقم الحساب البنكي)
    db.prepare(`
      INSERT INTO Notification (id, userId, orderId, title, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      generateId(),
      session.userId,
      orderId,
      "تم استلام طلبك بنجاح",
      `طلبك رقم ${orderNumber} قيد المراجعة الآن من قبل فريق سودان-بريدج.`
    );

    return NextResponse.json(
      { order: { id: orderId, orderNumber, totalSdg: breakdown.totalSdg, status: "PENDING_REVIEW" } },
      { status: 201 }
    );
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }
    console.error("Create order error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الطلب" }, { status: 500 });
  }
}
