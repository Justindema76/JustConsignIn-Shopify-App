-- CreateTable
CREATE TABLE "FoundingAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "position" INTEGER,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "FoundingAccess_shop_key" ON "FoundingAccess"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "FoundingAccess_position_key" ON "FoundingAccess"("position");
