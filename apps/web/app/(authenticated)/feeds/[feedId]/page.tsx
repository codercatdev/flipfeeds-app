import { FeedFlipsList } from '@/components/feed-flips-list';
import { getFeed } from '@/lib/feeds';

interface FeedPageProps {
  params: {
    feedId: string;
  };
}

export default async function FeedPage({ params }: FeedPageProps) {
  const { feedId } = await params;
  const feed = await getFeed(feedId);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{feed?.name ?? 'Feed'}</h1>
      <FeedFlipsList feedId={feedId} />
    </div>
  );
}
