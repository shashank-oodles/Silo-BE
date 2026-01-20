-- AlterTable
ALTER TABLE "RequestForm" ADD COLUMN     "allowedDepartments" JSONB,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';
