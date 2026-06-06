import { z } from "zod";

export const productTypeSchema = z.enum(["LM", "BR"]);
export const transactionStatusSchema = z.enum(["PIUTANG", "LUNAS"]);

const discountStep = z
  .number({ invalid_type_error: "Diskon harus berupa angka" })
  .min(0, "Diskon minimal 0")
  .max(100, "Diskon maksimal 100");

export const discountSetSchema = z.array(discountStep).default([]);

export const customerSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  lmDiscounts: discountSetSchema,
  brDiscounts: discountSetSchema,
  bonusThreshold: z
    .number({ invalid_type_error: "Threshold bonus harus berupa angka" })
    .min(0, "Threshold bonus minimal 0")
    .default(0),
});

export const productSchema = z.object({
  nama: z.string().trim().min(1, "Nama produk wajib diisi"),
  hargaModal: z
    .number({ invalid_type_error: "Harga modal harus berupa angka" })
    .min(0, "Harga modal minimal 0"),
  hargaBase: z
    .number({ invalid_type_error: "Harga base harus berupa angka" })
    .min(0, "Harga base minimal 0"),
  tipe: productTypeSchema,
});

export const transactionLineInputSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  quantity: z
    .number({ invalid_type_error: "Qty harus berupa angka" })
    .int("Qty harus bilangan bulat")
    .min(1, "Qty minimal 1"),
});

export const transactionSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  nomorBon: z.string().trim().min(1, "Nomor Bon wajib diisi"),
  customerId: z.string().min(1, "Pelanggan wajib dipilih"),
  ongkir: z
    .number({ invalid_type_error: "Ongkir harus berupa angka" })
    .min(0, "Ongkir minimal 0")
    .default(0),
  deskripsi: z.string().default(""),
  isBonus: z.boolean().default(false),
  bonusUnitsGranted: z.number().int().min(0).default(0),
  lines: z.array(transactionLineInputSchema).min(1, "Minimal 1 baris produk"),
});

export const settleSchema = z.object({
  paymentDate: z.string().min(1, "Tanggal pelunasan wajib diisi"),
});

export const settleMonthSchema = z.object({
  customerId: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  paymentDate: z.string().min(1, "Tanggal pelunasan wajib diisi"),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
