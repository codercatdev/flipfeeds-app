import { Feed } from "@/types/feed";

export function FeedList({ feeds }: { feeds: Feed[] }) {
  return (
    <ul>
      {feeds.map((feed) => (
        <li key={feed.id}>
          <a href="#" className="block p-2 hover:bg-sidebar-accent">
            {feed.name}
          </a>
        </li>
      ))}
    </ul>
  );
}
