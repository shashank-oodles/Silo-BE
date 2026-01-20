/*
  Warnings:

  - You are about to drop the `PublicRequestForm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PublicTicket` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PublicTicket" DROP CONSTRAINT "PublicTicket_requestFormId_fkey";

-- DropTable
DROP TABLE "PublicRequestForm";

-- DropTable
DROP TABLE "PublicTicket";

-- CreateTable
CREATE TABLE "RequestForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "tags" JSONB NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "requestFormId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestForm_slug_key" ON "RequestForm"("slug");

-- CreateIndex
CREATE INDEX "Ticket_requestFormId_idx" ON "Ticket"("requestFormId");

-- CreateIndex
CREATE INDEX "Ticket_reviewerId_idx" ON "Ticket"("reviewerId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requestFormId_fkey" FOREIGN KEY ("requestFormId") REFERENCES "RequestForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
