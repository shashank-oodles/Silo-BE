/*
  Warnings:

  - Made the column `userName` on table `Ticket` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "userName" SET NOT NULL;
