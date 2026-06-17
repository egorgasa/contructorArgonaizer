-- CreateTable
CREATE TABLE "PrintRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "productType" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OperatorNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperatorNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrintRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintRequest_publicNumber_key" ON "PrintRequest"("publicNumber");

-- CreateIndex
CREATE INDEX "PrintRequest_status_createdAt_idx" ON "PrintRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PrintRequest_productType_idx" ON "PrintRequest"("productType");

-- CreateIndex
CREATE INDEX "OperatorNote_requestId_createdAt_idx" ON "OperatorNote"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_requestId_createdAt_idx" ON "StatusHistory"("requestId", "createdAt");
