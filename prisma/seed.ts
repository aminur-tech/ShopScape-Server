import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "ছেলেদের পোশাক", slug: "chelder-poshak" },
  { name: "মেয়েদের পোশাক", slug: "meyeder-poshak" },
  { name: "শীতের কালেকশন", slug: "shiter-collection" },
  { name: "ব্যাগ কালেকশন", slug: "bag-collection" },
  { name: "বাচ্চাদের আইটেম", slug: "baby-items" },
  { name: "ইলেকট্রনিক্স আইটেম", slug: "electronics" },
  { name: "জুয়েলারি এন্ড এক্সেসরিজ", slug: "jewelry-accessories" },
  { name: "খেলনা সামগ্রী", slug: "toys" },
  { name: "হোম এন্ড ডেকোর", slug: "home-decor" },
];

async function main() {
  console.log("Seeding categories...");
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  const winter = await prisma.category.findUniqueOrThrow({ where: { slug: "shiter-collection" } });

  console.log("Seeding sample products...");
  await prisma.product.upsert({
    where: { slug: "trendy-premium-hoodie-red" },
    update: {},
    create: {
      name: "Trendy Premium Hoodie - Red/Black",
      slug: "trendy-premium-hoodie-red",
      description: "আরামদায়ক ফ্লিস হুডি, শীতের জন্য উপযুক্ত।",
      price: 650,
      discountPercent: 10,
      discountPrice: 585, // 650 - 10%
      sizeChart: "S: বুক ৩৬ ইঞ্চি | M: বুক ৩৮ ইঞ্চি | L: বুক ৪০ ইঞ্চি | XL: বুক ৪২ ইঞ্চি",
      stock: 50,
      images: [],
      categoryId: winter.id,
      isFeatured: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: "trendy-premium-hoodie-blue" },
    update: {},
    create: {
      name: "Trendy Premium Hoodie - Blue/White",
      slug: "trendy-premium-hoodie-blue",
      description: "আরামদায়ক ফ্লিস হুডি, শীতের জন্য উপযুক্ত।",
      price: 650,
      stock: 40,
      images: [],
      categoryId: winter.id,
    },
  });

  console.log("Seeding banners...");
  await prisma.banner.upsert({
    where: { id: "seed-banner-1" },
    update: {},
    create: {
      id: "seed-banner-1",
      title: "Last Chance Offer - 70% Off",
      imageUrl: "https://via.placeholder.com/1200x400/6fb93a/ffffff?text=SALE+70%25+OFF",
      sortOrder: 1,
    },
  });
  await prisma.banner.upsert({
    where: { id: "seed-banner-2" },
    update: {},
    create: {
      id: "seed-banner-2",
      title: "Winter Collection",
      imageUrl: "https://via.placeholder.com/1200x400/478023/ffffff?text=Winter+Collection",
      sortOrder: 2,
    },
  });

  console.log("Seeding admin user...");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@shopnofashion.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Done. Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
