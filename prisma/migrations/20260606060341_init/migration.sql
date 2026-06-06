-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "lmDiscounts" TEXT NOT NULL DEFAULT '[]',
    "brDiscounts" TEXT NOT NULL DEFAULT '[]',
    "bonusThreshold" REAL NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "hargaModal" REAL NOT NULL DEFAULT 0,
    "hargaBase" REAL NOT NULL DEFAULT 0,
    "tipe" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nomorBon" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "ongkir" REAL NOT NULL DEFAULT 0,
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "isBonus" BOOLEAN NOT NULL DEFAULT false,
    "bonusUnitsGranted" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PIUTANG',
    "paymentDate" DATETIME,
    "omzetTotal" REAL NOT NULL DEFAULT 0,
    "profitTotal" REAL NOT NULL DEFAULT 0,
    "amountOwed" REAL NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "productTypeSnapshot" TEXT NOT NULL,
    "hargaBaseSnapshot" REAL NOT NULL,
    "hargaModalSnapshot" REAL NOT NULL,
    "discountStepsSnapshot" TEXT NOT NULL,
    "discountedUnitPriceSnapshot" REAL NOT NULL,
    "lineOmzetSnapshot" REAL NOT NULL,
    "lineProfitSnapshot" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransactionLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateIndex
CREATE INDEX "Customer_nama_idx" ON "Customer"("nama");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE INDEX "Product_tipe_idx" ON "Product"("tipe");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_nomorBon_key" ON "Transaction"("nomorBon");

-- CreateIndex
CREATE INDEX "Transaction_customerId_idx" ON "Transaction"("customerId");

-- CreateIndex
CREATE INDEX "Transaction_tanggal_idx" ON "Transaction"("tanggal");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_isBonus_idx" ON "Transaction"("isBonus");

-- CreateIndex
CREATE INDEX "Transaction_deletedAt_idx" ON "Transaction"("deletedAt");

-- CreateIndex
CREATE INDEX "TransactionLine_transactionId_idx" ON "TransactionLine"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionLine_productId_idx" ON "TransactionLine"("productId");
