-- CreateTable
CREATE TABLE "PrintRequest" (
    "id" TEXT NOT NULL,
    "publicNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "productType" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestQuote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'BYN',
    "productionDays" INTEGER,
    "validUntil" TIMESTAMP(3),
    "operatorComment" TEXT,
    "internalCostNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestFile" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorNote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintRequest_publicNumber_key" ON "PrintRequest"("publicNumber");

-- CreateIndex
CREATE INDEX "PrintRequest_status_createdAt_idx" ON "PrintRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PrintRequest_productType_idx" ON "PrintRequest"("productType");

-- CreateIndex
CREATE INDEX "RequestQuote_requestId_createdAt_idx" ON "RequestQuote"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequestFile_storageKey_key" ON "RequestFile"("storageKey");

-- CreateIndex
CREATE INDEX "RequestFile_requestId_uploadedAt_idx" ON "RequestFile"("requestId", "uploadedAt");

-- CreateIndex
CREATE INDEX "OperatorNote_requestId_createdAt_idx" ON "OperatorNote"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_requestId_createdAt_idx" ON "StatusHistory"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "RequestQuote" ADD CONSTRAINT "RequestQuote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestFile" ADD CONSTRAINT "RequestFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorNote" ADD CONSTRAINT "OperatorNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

