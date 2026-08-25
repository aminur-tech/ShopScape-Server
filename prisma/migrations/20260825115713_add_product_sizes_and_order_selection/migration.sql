-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "selectedImageUrl" TEXT,
ADD COLUMN     "selectedSize" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[];
