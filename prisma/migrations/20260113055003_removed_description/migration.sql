-- AlterTable
ALTER TABLE "RequestForm" ADD COLUMN     "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReplyMessage" TEXT;
