import { z } from "zod";

export interface PricingConfig {
  dollarRate: number;
  shippingPerKg: number;
  customsFee: number;
  profitMargin: number;
}

export interface LandedCostBreakdown {
  productBaseSdg: number;
  shippingCostSdg: number;
  customsFeeSdg: number;
  profitMarginSdg: number;
  totalSdg: number;
}

/**
 * حاسبة التكلفة الشفافة (Landed Cost Calculator)
 * (سعر المنتج بالدولار × الكمية × سعر الصرف) + (الوزن × الكمية × سعر شحن الكيلو) + رسوم التخليص + هامش ربح المنصة
 */
export function calculateLandedCost(
  priceUsd: number,
  weightKg: number,
  quantity: number,
  config: PricingConfig
): LandedCostBreakdown {
  const safePrice = Math.max(0, priceUsd);
  const safeWeight = Math.max(0.1, weightKg);
  const safeQty = Math.max(1, Math.floor(quantity));

  const productBaseSdg = Math.round(safePrice * safeQty * config.dollarRate);
  const shippingCostSdg = Math.round(safeWeight * safeQty * config.shippingPerKg);
  const customsFeeSdg = Math.round(config.customsFee);
  const subtotal = productBaseSdg + shippingCostSdg + customsFeeSdg;
  const profitMarginSdg = Math.round(subtotal * config.profitMargin);
  const totalSdg = subtotal + profitMarginSdg;

  return {
    productBaseSdg,
    shippingCostSdg,
    customsFeeSdg,
    profitMarginSdg,
    totalSdg,
  };
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "قيد المراجعة",
  PAYMENT_APPROVED: "تم اعتماد الدفع",
  PAYMENT_REJECTED: "تم رفض الدفع",
  PURCHASED: "تم الشراء من المتجر",
  IN_WAREHOUSE: "في المخزن الدولي",
  IN_TRANSIT: "في الشحن الدولي",
  IN_CUSTOMS: "في الجمارك",
  READY_FOR_DELIVERY: "جاهز للتوصيل",
  DELIVERED: "تم التوصيل",
};

export const ORDER_STATUS_STEPS = [
  "PENDING_REVIEW",
  "PAYMENT_APPROVED",
  "PURCHASED",
  "IN_WAREHOUSE",
  "IN_TRANSIT",
  "IN_CUSTOMS",
  "READY_FOR_DELIVERY",
  "DELIVERED",
];

export const registerSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صالح").optional().or(z.literal("")),
  phone: z.string().min(9, "رقم الهاتف غير صالح").optional().or(z.literal("")),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  address: z.string().optional(),
}).refine((data) => Boolean(data.email || data.phone), {
  message: "يجب إدخال البريد الإلكتروني أو رقم الهاتف",
});

export const loginSchema = z.object({
  identifier: z.string().min(3, "أدخل البريد الإلكتروني أو رقم الهاتف"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const createOrderSchema = z.object({
  productUrl: z.string().url("رابط المنتج غير صالح"),
  productTitle: z.string().min(2, "اسم المنتج مطلوب"),
  productSpecs: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(50),
  priceUsd: z.coerce.number().positive("السعر بالدولار يجب أن يكون أكبر من 0"),
  weightKg: z.coerce.number().min(0.1).max(100),
  deliveryAddress: z.string().min(5, "عنوان التوصيل مطلوب بالتفصيل"),
  deliveryPhone: z.string().min(9, "رقم هاتف التوصيل مطلوب"),
  paymentMethod: z.enum(["BANKAK", "SYBERPAY"]).default("BANKAK"),
});
