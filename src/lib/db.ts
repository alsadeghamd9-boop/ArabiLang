import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const dbDir = path.join(process.cwd(), "prisma");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "dev.db");

// Singleton pattern for Next.js hot reload
const globalForDb = globalThis as unknown as {
  sqliteDb: Database.Database | undefined;
};

export const db =
  globalForDb.sqliteDb ??
  new Database(dbPath);

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqliteDb = db;
}

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function generateId(): string {
  return crypto.randomBytes(12).toString("hex");
}

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CUSTOMER',
    address TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS PlatformSettings (
    id TEXT PRIMARY KEY,
    payoutAccountNo TEXT NOT NULL DEFAULT '4521212',
    payoutAccountName TEXT NOT NULL DEFAULT 'الصادق حمد الصادق اسماعيل',
    payoutBankName TEXT NOT NULL DEFAULT 'بنك الخرطوم - Bankak',
    dollarRate REAL NOT NULL DEFAULT 2500.0,
    shippingPerKg REAL NOT NULL DEFAULT 15000.0,
    customsFee REAL NOT NULL DEFAULT 5000.0,
    profitMargin REAL NOT NULL DEFAULT 0.15,
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS "Order" (
    id TEXT PRIMARY KEY,
    orderNumber TEXT UNIQUE NOT NULL,
    userId TEXT NOT NULL,
    productUrl TEXT NOT NULL,
    productTitle TEXT NOT NULL,
    productSpecs TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    priceUsd REAL NOT NULL,
    weightKg REAL NOT NULL DEFAULT 0.5,
    dollarRateSnapshot REAL NOT NULL,
    shippingCostSdg REAL NOT NULL,
    customsFeeSdg REAL NOT NULL,
    profitMarginSdg REAL NOT NULL,
    totalSdg REAL NOT NULL,
    actualShippingSdg REAL,
    actualCustomsSdg REAL,
    deliveryAddress TEXT NOT NULL,
    deliveryPhone TEXT NOT NULL,
    paymentMethod TEXT NOT NULL DEFAULT 'BANKAK',
    receiptUrl TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    rejectionReason TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CuratedProduct (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    store TEXT NOT NULL,
    url TEXT NOT NULL,
    priceUsd REAL NOT NULL,
    estimatedWeightKg REAL NOT NULL DEFAULT 0.5,
    category TEXT NOT NULL DEFAULT 'عام',
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS Notification (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    orderId TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    isRead INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS AuditLog (
    id TEXT PRIMARY KEY,
    adminId TEXT NOT NULL,
    adminName TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed initial data if empty
function seedDatabase() {
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM PlatformSettings").get() as { count: number };
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO PlatformSettings (id, payoutAccountNo, payoutAccountName, payoutBankName, dollarRate, shippingPerKg, customsFee, profitMargin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      "4521212",
      "الصادق حمد الصادق اسماعيل",
      "بنك الخرطوم - Bankak",
      2500.0,
      15000.0,
      5000.0,
      0.15
    );
  }

  const adminExists = db.prepare("SELECT id FROM User WHERE email = ?").get("admin@sudanbridge.sd");
  if (!adminExists) {
    const hash = bcrypt.hashSync("Admin@2026!", 10);
    db.prepare(`
      INSERT INTO User (id, name, email, phone, passwordHash, role, address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      "مدير النظام - الصادق",
      "admin@sudanbridge.sd",
      "0912345678",
      hash,
      "ADMIN",
      "الخرطوم، السودان"
    );
  }

  const curatedCount = db.prepare("SELECT COUNT(*) as count FROM CuratedProduct").get() as { count: number };
  if (curatedCount.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO CuratedProduct (id, title, store, url, priceUsd, estimatedWeightKg, category, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertProduct.run(generateId(), "سماعة بلوتوث لاسلكية Anker Soundcore", "Amazon", "https://www.amazon.com/dp/B0B1LVC5VZ", 29.99, 0.3, "إلكترونيات");
    insertProduct.run(generateId(), "ساعة ذكية رياضية مقاومة للماء", "AliExpress", "https://www.aliexpress.com/item/1005006123456.html", 24.5, 0.2, "إلكترونيات");
    insertProduct.run(generateId(), "حقيبة ظهر عملية للكمبيوتر المحمول", "Shein", "https://www.shein.com/product-p-123456.html", 18.0, 0.7, "أزياء وإكسسوارات");
    insertProduct.run(generateId(), "شاحن سريع 65 واط متعدد المنافذ", "Noon", "https://www.noon.com/uae-en/N53345678A/p/", 22.0, 0.25, "إلكترونيات");
  }
}

seedDatabase();

export interface PlatformSettingsRow {
  id: string;
  payoutAccountNo: string;
  payoutAccountName: string;
  payoutBankName: string;
  dollarRate: number;
  shippingPerKg: number;
  customsFee: number;
  profitMargin: number;
  updatedAt: string;
}

export function getPlatformSettings(): PlatformSettingsRow {
  return db.prepare("SELECT * FROM PlatformSettings LIMIT 1").get() as PlatformSettingsRow;
}
