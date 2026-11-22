import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Seed PlatformSettings with default Bankak account 4521212
  const existingSettings = await prisma.platformSettings.findFirst();
  if (!existingSettings) {
    await prisma.platformSettings.create({
      data: {
        payoutAccountNo: "4521212",
        payoutAccountName: "الصادق حمد الصادق اسماعيل",
        payoutBankName: "بنك الخرطوم - Bankak",
        dollarRate: 2500.0,
        shippingPerKg: 15000.0,
        customsFee: 5000.0,
        profitMargin: 0.15,
      },
    });
    console.log("Seeded PlatformSettings with default Bankak account 4521212.");
  }

  // 2. Seed Admin User
  const adminEmail = "admin@sudanbridge.sd";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@2026!", 10);
    await prisma.user.create({
      data: {
        name: "مدير النظام - الصادق",
        email: adminEmail,
        phone: "0912345678",
        passwordHash,
        role: "ADMIN",
        address: "الخرطوم، السودان",
      },
    });
    console.log("Seeded Admin user: admin@sudanbridge.sd / Admin@2026!");
  }

  // 3. Seed Curated Products
  const countProducts = await prisma.curatedProduct.count();
  if (countProducts === 0) {
    await prisma.curatedProduct.createMany({
      data: [
        {
          title: "سماعة بلوتوث لاسلكية Anker Soundcore",
          store: "Amazon",
          url: "https://www.amazon.com/dp/B0B1LVC5VZ",
          priceUsd: 29.99,
          estimatedWeightKg: 0.3,
          category: "إلكترونيات",
        },
        {
          title: "ساعة ذكية رياضية مقاومة للماء",
          store: "AliExpress",
          url: "https://www.aliexpress.com/item/1005006123456.html",
          priceUsd: 24.5,
          estimatedWeightKg: 0.2,
          category: "إلكترونيات",
        },
        {
          title: "حقيبة ظهر عملية للكمبيوتر المحمول",
          store: "Shein",
          url: "https://www.shein.com/product-p-123456.html",
          priceUsd: 18.0,
          estimatedWeightKg: 0.7,
          category: "أزياء وإكسسوارات",
        },
        {
          title: "شاحن سريع 65 واط متعدد المنافذ",
          store: "Noon",
          url: "https://www.noon.com/uae-en/N53345678A/p/",
          priceUsd: 22.0,
          estimatedWeightKg: 0.25,
          category: "إلكترونيات",
        },
      ],
    });
    console.log("Seeded 4 Curated Products.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
