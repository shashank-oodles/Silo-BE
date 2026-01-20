/*
  Warnings:

  - You are about to drop the column `allowedDepartments` on the `RequestForm` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `RequestForm` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RequestForm" DROP COLUMN "allowedDepartments",
DROP COLUMN "visibility";
