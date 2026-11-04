import type { BusinessType, CalendarConfig, FormatOption, Goal, Pillar, PillarShare, Platform, PostFormat, Slot } from './types.js';
import { PILLARS } from './types.js';
import { weekdayName } from './dateScheduler.js';

/**
 * The strategy layer, kept apart from the AI prompt: how the content pillars
 * are balanced for the selected goals, how they are spread across the
 * publishing dates, which platform and format each slot gets, and the
 * strategic angle that keeps posts varied. The model writes every topic,
 * hook and caption; nothing here is canned content.
 */

/* ------------------------------ pillar balance ------------------------------ */

const BASE: Record<Pillar, number> = { Educational: 40, Engagement: 25, Authority: 20, Promotional: 15 };

const GOAL_SHIFTS: Record<Goal, Partial<Record<Pillar, number>>> = {
  'Generate More Leads': { Authority: 5, Promotional: 5, Educational: -5, Engagement: -5 },
  'Increase Engagement': { Engagement: 10, Educational: -5, Promotional: -5 },
  'Build Brand Awareness': { Educational: 5, Authority: 5, Promotional: -5, Engagement: -5 },
  'Grow Followers': { Engagement: 10, Educational: 5, Promotional: -10, Authority: -5 },
  'Sell Coaching Programs': { Promotional: 10, Authority: 5, Educational: -5, Engagement: -10 },
  'Promote Gym Memberships': { Promotional: 10, Engagement: 5, Educational: -10, Authority: -5 },
  'Increase Class Bookings': { Promotional: 10, Engagement: 5, Educational: -10, Authority: -5 },
  'Build Community': { Engagement: 15, Educational: -5, Authority: -5, Promotional: -5 },
  'Educate Audience': { Educational: 10, Authority: 5, Engagement: -5, Promotional: -10 },
  'Improve Client Retention': { Engagement: 10, Authority: 5, Promotional: -5, Educational: -10 },
};

/** Target percentages per pillar for these goals (sum 100, each pillar at least 10). */
export function pillarShares(goals: readonly Goal[]): Record<Pillar, number> {
  const raw: Record<Pillar, number> = { ...BASE };
  for (const g of goals) for (const p of PILLARS) raw[p] += GOAL_SHIFTS[g]?.[p] ?? 0;
  for (const p of PILLARS) raw[p] = Math.max(10, raw[p]);
  const total = PILLARS.reduce((a, p) => a + raw[p], 0);
  const scaled = PILLARS.map((p) => ({ p, v: (raw[p] * 100) / total }));
  const out: Record<Pillar, number> = { Educational: 0, Engagement: 0, Authority: 0, Promotional: 0 };
  let used = 0;
  for (const { p, v } of scaled) {
    out[p] = Math.floor(v);
    used += out[p];
  }
  // Largest remainder so the four figures add up to exactly 100.
  const rest = scaled.map(({ p, v }) => ({ p, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  for (let i = 0; i < 100 - used; i++) out[rest[i % rest.length].p] += 1;
  return out;
}

/** How many posts each pillar gets out of `total`, by largest remainder; every pillar gets one when there is room. */
export function pillarCounts(total: number, shares: Record<Pillar, number>): Record<Pillar, number> {
  const out: Record<Pillar, number> = { Educational: 0, Engagement: 0, Authority: 0, Promotional: 0 };
  if (total <= 0) return out;
  const exact = PILLARS.map((p) => ({ p, v: (shares[p] * total) / 100 }));
  let used = 0;
  for (const { p, v } of exact) {
    out[p] = Math.floor(v);
    used += out[p];
  }
  const rest = exact.map(({ p, v }) => ({ p, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  for (let i = 0; i < total - used; i++) out[rest[i % rest.length].p] += 1;
  if (total >= PILLARS.length) {
    for (const p of PILLARS) {
      if (out[p] > 0) continue;
      const donor = PILLARS.reduce((best, q) => (out[q] > out[best] ? q : best), PILLARS[0]);
      out[donor] -= 1;
      out[p] += 1;
    }
  }
  return out;
}

/** Spreads the pillars evenly across the sequence (smooth weighted round robin); never opens with a promotion. */
export function pillarSequence(counts: Record<Pillar, number>): Pillar[] {
  const total = PILLARS.reduce((a, p) => a + counts[p], 0);
  const remaining: Record<Pillar, number> = { ...counts };
  const credit: Record<Pillar, number> = { Educational: 0, Engagement: 0, Authority: 0, Promotional: 0 };
  const out: Pillar[] = [];
  for (let i = 0; i < total; i++) {
    for (const p of PILLARS) credit[p] += counts[p];
    let pick: Pillar | null = null;
    for (const p of PILLARS) {
      if (remaining[p] <= 0) continue;
      if (i === 0 && p === 'Promotional' && total > 1) continue;
      if (pick === null || credit[p] > credit[pick]) pick = p;
    }
    if (!pick) pick = PILLARS.find((p) => remaining[p] > 0) as Pillar;
    credit[pick] -= total;
    remaining[pick] -= 1;
    out.push(pick);
  }
  return out;
}

export function pillarShareList(shares: Record<Pillar, number>, counts: Record<Pillar, number>): PillarShare[] {
  return PILLARS.map((name) => ({ name, targetPercentage: shares[name], plannedPosts: counts[name] }));
}

/* --------------------------------- angles --------------------------------- */

/** Strategic angles per pillar: the shape of a post, never its content. */
export const ANGLES: Record<Pillar, string[]> = {
  Educational: [
    'a common mistake and how to fix it',
    'a step-by-step how-to for one specific situation',
    'myth versus what actually happens',
    'a beginner question answered properly',
    'what to do when a specific obstacle shows up',
    'a short checklist people can act on today',
    'one principle explained with a concrete example',
    'a comparison of two approaches and when each fits',
  ],
  Engagement: [
    'a this-or-that question with a reason to pick',
    'a relatable scenario the audience will recognise',
    'a prompt asking people to share their own experience',
    'a quick poll with a point of view',
    'behind the scenes of how the work actually happens',
    'a small challenge people can try this week',
  ],
  Authority: [
    'the coaching philosophy behind one decision',
    'how sessions or programs are structured for this audience, and why',
    'a lesson learned from coaching practice (no invented results)',
    'an industry observation with a clear opinion',
    'what a good session, class or check-in looks like',
    'a question people ask before working together, answered honestly',
  ],
  Promotional: [
    'how the offer works, step by step',
    'who the offer is for and who it is not for',
    'what someone gets in the first week',
    'a plain invitation with one clear next step',
    'the problem the offer solves, then the offer',
  ],
};

/* ------------------------------- formats --------------------------------- */

/** The publishing format each selected format option becomes on each platform (absent = not a fit). */
const FORMAT_MAP: Record<FormatOption, Partial<Record<Platform, PostFormat>>> = {
  'Reels / Short Videos': { Instagram: 'Reel', TikTok: 'Short Video', Facebook: 'Short Video', LinkedIn: 'Short Video', YouTube: 'YouTube Short', Pinterest: 'Short Video', Threads: 'Short Video', 'Twitter/X': 'Short Video' },
  'Carousel Posts': { Instagram: 'Carousel', TikTok: 'Carousel', Facebook: 'Carousel', LinkedIn: 'Carousel', Pinterest: 'Pin' },
  'Static Images': { Instagram: 'Static Image', Facebook: 'Static Image', LinkedIn: 'Static Image', Pinterest: 'Pin', Threads: 'Static Image', 'Twitter/X': 'Static Image' },
  Stories: { Instagram: 'Story', Facebook: 'Story' },
  'Educational Videos': { Instagram: 'Educational Video', TikTok: 'Educational Video', Facebook: 'Educational Video', LinkedIn: 'Educational Video', YouTube: 'Educational Video' },
  Testimonials: { Instagram: 'Testimonial', TikTok: 'Testimonial', Facebook: 'Testimonial', LinkedIn: 'Testimonial', YouTube: 'Testimonial' },
  'Behind-the-Scenes': { Instagram: 'Behind-the-Scenes', TikTok: 'Behind-the-Scenes', Facebook: 'Behind-the-Scenes', YouTube: 'Behind-the-Scenes', LinkedIn: 'Behind-the-Scenes' },
  'Live Sessions': { Instagram: 'Live Session', TikTok: 'Live Session', Facebook: 'Live Session', LinkedIn: 'Live Session', YouTube: 'Live Session' },
  'Short Text Posts': { Facebook: 'Text Post', LinkedIn: 'Text Post', Threads: 'Text Post', 'Twitter/X': 'Text Post' },
};

export const PLATFORM_DEFAULT_FORMATS: Record<Platform, PostFormat[]> = {
  Instagram: ['Reel', 'Carousel', 'Static Image', 'Reel', 'Story'],
  TikTok: ['Short Video'],
  Facebook: ['Static Image', 'Short Video', 'Text Post', 'Carousel'],
  LinkedIn: ['Text Post', 'Carousel', 'Static Image'],
  YouTube: ['YouTube Short', 'Educational Video'],
  Pinterest: ['Pin', 'Short Video'],
  Threads: ['Text Post'],
  'Twitter/X': ['Text Post', 'Short Video'],
};

/** The format for the n-th post on a platform: rotates through the user's selected formats that fit it, else the platform's defaults. */
export function formatFor(platform: Platform, selected: readonly FormatOption[], n: number): PostFormat {
  const chosen = selected.map((f) => FORMAT_MAP[f][platform]).filter((f): f is PostFormat => Boolean(f));
  const pool = chosen.length ? chosen : PLATFORM_DEFAULT_FORMATS[platform];
  return pool[n % pool.length];
}

/* --------------------------------- slots ---------------------------------- */

/** Plans every slot before the model is asked: date, weekday, pillar, angle, platform, format and the platforms to adapt for. */
export function planSlots(c: Pick<CalendarConfig, 'platforms' | 'goals' | 'formats'>, dates: readonly string[], variant = 0, seed = 0): Slot[] {
  const shares = pillarShares(c.goals);
  const counts = pillarCounts(dates.length, shares);
  const sequence = pillarSequence(counts);
  const platforms = c.platforms.length ? c.platforms : (['Instagram'] as Platform[]);
  const perPillar: Record<Pillar, number> = { Educational: 0, Engagement: 0, Authority: 0, Promotional: 0 };
  const perPlatform = new Map<Platform, number>();
  return dates.map((date, i) => {
    const pillar = sequence[i];
    const angles = ANGLES[pillar];
    const angle = angles[(perPillar[pillar] + variant + seed) % angles.length];
    perPillar[pillar] += 1;
    const platform = platforms[(i + variant) % platforms.length];
    const n = perPlatform.get(platform) ?? 0;
    perPlatform.set(platform, n + 1);
    const adaptFor = platforms.length > 1 ? [platforms[(i + variant + 1) % platforms.length]] : [];
    return { id: `post_${String(i + 1).padStart(3, '0')}`, date, day: weekdayName(date), pillar, angle, platform, format: formatFor(platform, c.formats, n + variant), adaptFor };
  });
}

/** A small stable number from a string, so different businesses start the angle rotation at different points. */
export function seedFrom(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return h % 7;
}

/* ----------------------------- prompt material ----------------------------- */

export const BUSINESS_HINTS: Record<BusinessType, string> = {
  'Personal Trainer': 'exercise technique, beginner mistakes, what client onboarding looks like, training misconceptions, consistency, the value of coaching, how a program is structured, the relevant coaching offer',
  'Online Fitness Coach': 'the benefits of online coaching, remote accountability, training at home with little equipment, habit formation, how client communication and check-ins work, how programs are delivered online, progress tracking',
  'Gym Owner': 'classes and programs, the gym community, trainer introductions (by role, never invented names), membership benefits, behind the scenes of the facility, facility features, member engagement, community events (only ones the user supplied)',
  'Fitness Studio Owner': 'class experiences, instructors and their roles, the studio atmosphere, booking and first-visit guidance, small-group training benefits, member community, studio updates',
  'Yoga Instructor': 'mobility, practice consistency, movement education, class experiences, accessibility and modifications, mindfulness, preparing for a session, breathing',
  'Pilates Instructor': 'core and posture education, control and precision, class experiences, equipment versus mat, accessibility and modifications, consistency, what beginners should expect',
  'Nutrition Coach': 'nutrition education, meal planning and practical prep, nutrition misconceptions, habit building, reading labels, eating out, what nutrition coaching involves (no medical diets, no supplements as treatments)',
  'Strength Coach': 'strength fundamentals, technique cues, programming principles, progressive overload, recovery, athlete development, what a strength block looks like, the coaching offer',
  'Fitness Influencer': 'educational content in the creator\'s niche, honest takes on fitness trends, audience Q&A, day-in-the-life and training content, community conversation, the creator\'s own programs or offers',
  'Group Fitness Coach': 'class formats and what to expect, group energy and community, beginner-friendly entry points, modifications for mixed levels, coaching cues, class schedule and booking',
  'Hybrid Fitness Coach': 'how in-person and online coaching combine, flexibility for busy schedules, accountability between sessions, home and gym training, check-ins and progress tracking, the hybrid offer',
};

export const PLATFORM_RULES: Record<Platform, string> = {
  Instagram: 'Reels, carousels, static posts and stories; a scroll-stopping first line, concise captions (60-150 words), clear visual direction, 3-6 relevant hashtags, an engagement CTA',
  TikTok: 'short-form video only; a strong spoken opening hook in the first 2 seconds, a short video outline in the creative direction, fitness demonstrations and relatable coaching scenarios, captions under 60 words, 3-5 hashtags',
  Facebook: 'community content, class and gym updates, educational posts and member engagement; conversational captions (60-150 words), 0-3 hashtags',
  LinkedIn: 'professional insights, fitness business lessons, corporate wellness, coaching expertise and industry observations; professional but conversational, short paragraphs, 80-200 words, at most 3 hashtags',
  YouTube: 'Shorts and educational videos; give the video title as the hook and a brief outline in the creative direction, the caption is the video description, 2-4 hashtags',
  Pinterest: 'search-oriented fitness topics, educational graphics, workout-planning and nutrition visuals; a keyword-rich title as the hook, a descriptive 40-100 word caption, 2-5 hashtags',
  Threads: 'short insights, useful observations, discussion prompts and concise educational content; 40-120 words, no hashtags',
  'Twitter/X': 'short insights, observations and discussion prompts; under 280 characters including spaces, at most 1-2 hashtags',
};

export const GOAL_HINTS: Record<Goal, string> = {
  'Generate More Leads': 'more authority and conversion content, with CTAs that invite a conversation, an application, a consultation or a DM (no invented offers)',
  'Increase Engagement': 'more interactive content: questions, polls, this-or-that, prompts to comment and share experiences',
  'Build Brand Awareness': 'helpful educational content, distinctive positioning and shareable ideas; CTAs that ask people to save or share',
  'Grow Followers': 'shareable, save-worthy educational and relatable content; CTAs that ask people to follow for more of a specific thing',
  'Sell Coaching Programs': 'educational content that builds demand, then the user\'s real coaching offer introduced naturally',
  'Promote Gym Memberships': 'membership benefits, the community, classes and trainers; CTAs that invite a visit, a trial class or a tour (only offers the user supplied)',
  'Increase Class Bookings': 'what classes feel like, who they suit, how to book; CTAs that point to booking',
  'Build Community': 'community-building, member stories told without inventing them, group challenges, conversation starters',
  'Educate Audience': 'clear, specific educational content with practical takeaways',
  'Improve Client Retention': 'community, accountability, progress celebration (without invented results), client support and check-in content',
};
