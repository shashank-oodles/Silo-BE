-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReplyMessage" TEXT;
