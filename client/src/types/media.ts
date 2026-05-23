// MediaItem type for consistent use across components
export type MediaItem = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  publicDescription?: string;
};