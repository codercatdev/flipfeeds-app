import { FeedFlipsList } from '@/components/feed-flips-list';
import { getFlip } from '@/lib/flips';

interface FeedPageProps {
  params: {
    flipdId: string;
  };
}

export default async function FlipPage({ params }: FeedPageProps) {
  const { flipdId } = params;
  const flip = await getFlip(flipdId);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{flip?.name ?? 'Feed'}</h1>
      <code>{JSON.stringify(flip, null, 2)}</code>
      <FeedFlipsList feedId={flipdId} />
    </div>
  );
}
