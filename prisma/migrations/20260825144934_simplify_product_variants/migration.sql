/*
  Warnings:

  - You are about to drop the `ProductVariant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "stock" SET DEFAULT 1;

-- DropTable
DROP TABLE "ProductVariant";
