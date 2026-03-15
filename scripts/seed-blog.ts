import { PrismaClient } from "@prisma/client";
import { BLOG_POSTS } from "../src/lib/blog-data";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

// Ensure we use the direct URL to bypass pooling issues during seeding
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding blog posts...");

  for (const post of BLOG_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        date: post.date,
        author: post.author,
        category: post.category,
        image: post.image,
        published: true, // Existing posts should be published
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        date: post.date,
        author: post.author,
        category: post.category,
        image: post.image,
        published: true,
        publishedAt: new Date(),
      },
    });
    console.log(`- Seeded unique post: ${post.slug}`);
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
