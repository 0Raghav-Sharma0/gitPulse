import { Suspense } from 'react';
import { Metadata } from 'next';
import HomeClient from './HomeClient';
import { getHomepagePosts } from '@/lib/services/blog-service';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default async function Home() {
  const latestPosts = await getHomepagePosts();

  return (
    <Suspense fallback={null}>
      <HomeClient initialPosts={latestPosts} />
    </Suspense>
  );
}
