-- CreateTable
CREATE TABLE "PublicRequestForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicRequestForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicTicket" (
    "id" TEXT NOT NULL,
    "requestFormId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicRequestForm_slug_key" ON "PublicRequestForm"("slug");

-- CreateIndex
CREATE INDEX "PublicTicket_requestFormId_idx" ON "PublicTicket"("requestFormId");

-- CreateIndex
CREATE INDEX "PublicTicket_reviewerId_idx" ON "PublicTicket"("reviewerId");

-- AddForeignKey
ALTER TABLE "PublicTicket" ADD CONSTRAINT "PublicTicket_requestFormId_fkey" FOREIGN KEY ("requestFormId") REFERENCES "PublicRequestForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
