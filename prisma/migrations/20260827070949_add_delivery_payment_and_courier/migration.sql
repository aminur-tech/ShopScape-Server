/*
  Warnings:

  - You are about to drop the column `adminMessage` on the `Order` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Order_returnRequired_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "adminMessage",
ALTER COLUMN "deliveryPaymentStatus" DROP DEFAULT;
