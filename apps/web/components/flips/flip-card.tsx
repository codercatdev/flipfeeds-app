import { Flip } from "@/types/flip";

export function FlipCard({ flip }: { flip: Flip }) {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-md">
      {flip.type === "image" ? (
        <img src={flip.url} alt={flip.caption} className="w-full" />
      ) : (
        <video src={flip.url} controls className="w-full" />
      )}
      {flip.caption && <p className="p-4">{flip.caption}</p>}
    </div>
  );
}
