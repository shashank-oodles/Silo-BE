/*
  Warnings:

  - Added the required column `organization` to the `RequestForm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RequestForm" ADD COLUMN     "organization" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "category" TEXT,
ADD COLUMN     "organization" TEXT NOT NULL;
