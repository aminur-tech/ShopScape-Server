-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "adminMessage" TEXT,
ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "deliveryPaymentMethod" TEXT,
ADD COLUMN     "deliveryPaymentProofUrl" TEXT,
ADD COLUMN     "deliveryPaymentRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryPaymentStatus" TEXT DEFAULT 'UNPAID',
ADD COLUMN     "deliveryTransactionId" TEXT,
ADD COLUMN     "returnRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Order_phone_idx" ON "Order"("phone");

-- CreateIndex
CREATE INDEX "Order_returnRequired_idx" ON "Order"("returnRequired");
