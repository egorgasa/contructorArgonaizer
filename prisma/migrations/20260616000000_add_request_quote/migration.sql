-- CreateTable
CREATE TABLE "RequestQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'BYN',
    "productionDays" INTEGER,
    "validUntil" DATETIME,
    "operatorComment" TEXT,
    "internalCostNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequestQuote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RequestQuote_requestId_createdAt_idx" ON "RequestQuote"("requestId", "createdAt");
