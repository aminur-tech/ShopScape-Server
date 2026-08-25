/*
  Warnings:

  - You are about to drop the column `variantId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `sizes` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `ProductVariant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,color,size]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `color` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "OrderItem_productId_idx";

-- DropIndex
DROP INDEX "ProductVariant_isActive_idx";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "variantId";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sizes";

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "imageUrl",
DROP COLUMN "isActive",
DROP COLUMN "name",
ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "size" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ProductVariant_color_idx" ON "ProductVariant"("color");

-- CreateIndex
CREATE INDEX "ProductVariant_size_idx" ON "ProductVariant"("size");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_color_size_key" ON "ProductVariant"("productId", "color", "size");
