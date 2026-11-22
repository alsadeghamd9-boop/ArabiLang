import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, generateId } from "@/lib/db";
import { registerSchema } from "@/lib/calculator";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "بيانات غير صالحة" },
        { status: 400 }
      );
    }

    const { name, email, phone, password, address } = parsed.data;
    const cleanEmail = email?.trim() || null;
    const cleanPhone = phone?.trim() || null;

    if (cleanEmail) {
      const existingEmail = db.prepare("SELECT id FROM User WHERE email = ?").get(cleanEmail);
      if (existingEmail) {
        return NextResponse.json({ error: "البريد الإلكتروني مسجل مسبقاً" }, { status: 409 });
      }
    }

    if (cleanPhone) {
      const existingPhone = db.prepare("SELECT id FROM User WHERE phone = ?").get(cleanPhone);
      if (existingPhone) {
        return NextResponse.json({ error: "رقم الهاتف مسجل مسبقاً" }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateId();

    db.prepare(`
      INSERT INTO User (id, name, email, phone, passwordHash, role, address)
      VALUES (?, ?, ?, ?, ?, 'CUSTOMER', ?)
    `).run(userId, name.trim(), cleanEmail, cleanPhone, passwordHash, address?.trim() || null);

    const token = await createSessionToken({
      userId,
      name: name.trim(),
      role: "CUSTOMER",
      email: cleanEmail,
      phone: cleanPhone,
    });

    const res = NextResponse.json({
      user: { id: userId, name: name.trim(), role: "CUSTOMER", email: cleanEmail, phone: cleanPhone },
    }, { status: 201 });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الحساب" }, { status: 500 });
  }
}
