export const POST_TYPE_OPTIONS = [
  'Motivational Quote',
  'Workout Video',
  'Product Launch',
  'Vlog',
  'Meme',
  'Lifestyle Post',
  'Educational Post',
  'Transformation Post',
  'Client Result',
  'Tutorial',
  'Carousel',
  'Reel / Short Video',
  'Announcement',
  'Brand Story',
] as const;

export const PLATFORM_OPTIONS = [
  'Instagram',
  'TikTok',
  'Twitter/X',
  'LinkedIn',
  'YouTube',
  'Facebook',
  'Pinterest',
  'Threads',
] as const;

export const TONE_OPTIONS = [
  'Reach',
  'Engagement',
  'Trending',
  'Professional',
  'Aesthetic',
  'Educational',
  'Community',
  'Sales',
  'Brand Awareness',
] as const;

export type PostType = (typeof POST_TYPE_OPTIONS)[number];
export type Platform = (typeof PLATFORM_OPTIONS)[number];
export type ToneGoal = (typeof TONE_OPTIONS)[number];

export interface HashtagFormState {
  caption: string;
  topic: string;
  postType: PostType | null;
  platforms: Platform[];
  tones: ToneGoal[];
  /** Lead capture, the only two values recorded in HubSpot. */
  name: string;
  email: string;
}

export interface PlatformHashtags {
  platform: Platform;
  tags: string[];
  tip: string;
}
