/*
  Warnings:

  - You are about to drop the column `status` on the `Ticket` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('HIGH', 'MID', 'LOW');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'OVERDUE', 'DONE', 'REOPEN');

-- DropIndex
DROP INDEX "Ticket_status_idx";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "status",
ADD COLUMN     "legalOwnerId" TEXT,
ADD COLUMN     "priority" "TicketPriority",
ADD COLUMN     "workflowStatus" "TicketStatus";

-- CreateIndex
CREATE INDEX "Ticket_reviewerId_idx" ON "Ticket"("reviewerId");

-- CreateIndex
CREATE INDEX "Ticket_legalOwnerId_idx" ON "Ticket"("legalOwnerId");

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "Ticket_workflowStatus_idx" ON "Ticket"("workflowStatus");
