/*
  Warnings:

  - You are about to drop the column `organization` on the `Ticket` table. All the data in the column will be lost.
  - Added the required column `assignedTeamId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requestFormId_fkey";

-- DropIndex
DROP INDEX "Ticket_email_idx";

-- DropIndex
DROP INDEX "Ticket_reviewerId_idx";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "organization",
ADD COLUMN     "assignedTeamId" TEXT NOT NULL,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ALTER COLUMN "requestFormId" DROP NOT NULL,
ALTER COLUMN "reviewerId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Ticket_organizationId_idx" ON "Ticket"("organizationId");

-- CreateIndex
CREATE INDEX "Ticket_assignedTeamId_idx" ON "Ticket"("assignedTeamId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_idx" ON "Ticket"("categoryId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requestFormId_fkey" FOREIGN KEY ("requestFormId") REFERENCES "RequestForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
