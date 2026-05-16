import { Suspense } from 'react';
import { Metadata } from 'next';
import HomeClient from './HomeClient';
import { getHomepagePosts } from '@/lib/services/blog-service';
import type { BlogPost } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default async function Home() {
  let latestPosts: BlogPost[] = [];

  try {
    latestPosts = await getHomepagePosts();
  } catch (error) {
    console.warn('⚠️ Could not load homepage posts during build or runtime', error);
  }

  return (
    <Suspense fallback={null}>
      <HomeClient initialPosts={latestPosts} />
    </Suspense>
  );
}
