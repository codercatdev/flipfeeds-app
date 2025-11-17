export interface Flip {
  id: string;
  feedId: string;
  type: "image" | "video";
  url: string;
  caption?: string;
}
