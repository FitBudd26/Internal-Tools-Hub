import { generateStrategy } from './generatePricing';
import { TIERS, type Figures, type Pricing, type PricingInput, type PricingPackage, type PricingStrategy, type Service, type Tier } from './types';

/**
 * Gemini-first packages with a guaranteed answer. The prices, the client
 * split and the revenue figures always come from the tool's own formula
 * (generatePricing.ts). Gemini writes the three packages and the four
 * strategy notes around those numbers, and the answer is checked here:
 * names are real names, a tier never promises a service the coach does not
 * offer, each tier offers at least as much as the one below, and a note that
 * quotes a dollar amount or a percentage the tool did not calculate is
 * replaced by the built-in note. Anything missing falls back, part by part.
 */

export type GenerationSource = 'ai' | 'local';
export interface PricingGeneration { strategy: PricingStrategy; source: GenerationSource }

const REQUEST_TIMEOUT_MS = 22_000;
const INCLUDE_LIMITS: Record<Tier, [number, number]> = { starter: [3, 4], core: [4, 6], premium: [5, 7] };

const tidy = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().slice(0, max).trim() : '';
const key = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const GENERIC_NAME = /^(the )?(bronze|silver|gold|platinum|basic|standard|starter|core|premium|tier \w+|package \w+|plan \w+)( plan| package| tier)?$/i;

/** Words that give away a service. An item that names one the coach does not offer is dropped. */
const SERVICE_SIGNS: [Service, RegExp][] = [
  ['Nutrition Plans', /nutrition|meal|macro|diet/i],
  ['Supplement Guidance', /supplement/i],
  ['Habit Coaching', /habit/i],
  ['Form Check', /form (check|review)|technique review|video review/i],
  ['Group Challenges', /challenge/i],
  ['Video Calls', /video call|zoom|video coaching|video session/i],
];

/** Every dollar amount and percentage a note quotes. "$5K" counts as 5,000. */
export function quotedFigures(text: string): { dollars: number[]; percents: number[] } {
  const dollars = [...text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)\s?([kK])?(?![\w])/g)].map((m) => Math.round(Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1)));
  const percents = [...text.matchAll(/(\d+(?:\.\d+)?)\s?(?:%|percent)/gi)].map((m) => Number(m[1]));
  return { dollars, percents };
}

/** The numbers a note may quote: what the tool calculated and sent to the model, nothing else. */
export function allowedFigures(pricing: Pricing, f: Figures): { dollars: Set<number>; percents: Set<number> } {
  return {
    dollars: new Set([pricing.starter, pricing.core, pricing.premium, f.goal, f.totalRevenue, Math.abs(f.revenueGap), f.impliedHourlyRate, f.raisedCore, f.extraFromRaise]),
    percents: new Set([f.premiumPct, 25]),
  };
}

export function noteIsHonest(note: string, pricing: Pricing, f: Figures): boolean {
  const quoted = quotedFigures(note);
  const allowed = allowedFigures(pricing, f);
  return quoted.dollars.every((d) => allowed.dollars.has(d)) && quoted.percents.every((p) => allowed.percents.has(p));
}

function cleanIncludes(raw: unknown, tier: Tier, offered: Service[]): string[] | null {
  if (!Array.isArray(raw)) return null;
  const [min, max] = INCLUDE_LIMITS[tier];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const item = tidy(x, 80).replace(/[.;,]$/, '');
    if (item.length < 3 || /\$/.test(item) || seen.has(key(item))) continue;
    if (SERVICE_SIGNS.some(([service, sign]) => sign.test(item) && !offered.includes(service))) continue;
    seen.add(key(item));
    out.push(item);
    if (out.length >= max) break;
  }
  return out.length >= min ? out : null;
}

/** The model's offer made safe to show. Prices and figures are always the engine's. */
export function cleanStrategy(raw: unknown, input: PricingInput, local: PricingStrategy, avoidNames: string[] = []): PricingStrategy | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { packages?: unknown; strategyNotes?: unknown };
  const list = (Array.isArray(o.packages) ? o.packages : []).filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object');
  if (list.length < 3) return null;

  const avoid = new Set(avoidNames.map(key));
  const usedNames = new Set<string>();
  let fromModel = 0;
  const drafts = TIERS.map((tier, i) => {
    const fallback = local.packages[i];
    const source = list.find((x) => tidy(x.tier, 12).toLowerCase() === tier) ?? list[i];
    const name = tidy(source.name, 40);
    const nameOk = name.length >= 3 && !/[\d$]/.test(name) && !GENERIC_NAME.test(name) && !avoid.has(key(name)) && !usedNames.has(key(name));
    const finalName = nameOk ? name : fallback.name;
    usedNames.add(key(finalName));
    if (nameOk) fromModel++;
    const tagline = tidy(source.tagline, 120);
    const idealFor = tidy(source.idealFor, 220);
    const delivery = tidy(source.deliverySummary, 90);
    return {
      tier,
      name: finalName,
      priceMonthly: fallback.priceMonthly,
      tagline: tagline && !/\$/.test(tagline) ? tagline : fallback.tagline,
      idealFor: idealFor && !/\$/.test(idealFor) ? idealFor : fallback.idealFor,
      includes: cleanIncludes(source.includes, tier, input.services),
      deliverySummary: delivery && !/\$/.test(delivery) ? delivery : fallback.deliverySummary,
    };
  });
  // The ladder has to climb: if any tier's list is unusable or a higher tier offers less, use the built-in lists for all three.
  const ladderOk = drafts.every((d) => d.includes) && drafts[1].includes!.length >= drafts[0].includes!.length && drafts[2].includes!.length >= drafts[1].includes!.length;
  const packages: PricingPackage[] = drafts.map((d, i) => ({ ...d, includes: ladderOk ? d.includes! : local.packages[i].includes }));
  if (ladderOk) fromModel++;

  const rawNotes = Array.isArray(o.strategyNotes) ? o.strategyNotes : [];
  const strategyNotes = local.strategyNotes.map((builtIn, i) => {
    const note = tidy(rawNotes[i], 900);
    const ok = note.length >= 60 && noteIsHonest(note, local.pricing, local.figures);
    if (ok) fromModel++;
    return ok ? note : builtIn;
  });

  // Nothing of the model's survived: say so, so the caller reports the built-in copy.
  if (fromModel === 0) return null;
  return { packages, strategyNotes, pricing: local.pricing, figures: local.figures };
}

export async function generateStrategyWithAi(input: PricingInput, variant = 0, avoidNames: string[] = []): Promise<PricingGeneration> {
  const local = generateStrategy(input, variant);
  const raw = await fetchAi(input, local, variant, avoidNames);
  const strategy = raw ? cleanStrategy(raw, input, local, avoidNames) : null;
  return strategy ? { strategy, source: 'ai' } : { strategy: local, source: 'local' };
}

async function fetchAi(input: PricingInput, local: PricingStrategy, variant: number, avoidNames: string[]): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const { pricing, figures } = local;
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tool: 'pricing',
        coachingFormat: input.coachingFormat,
        niche: input.niche,
        experience: input.experience,
        services: input.services,
        programDuration: input.programDuration,
        figures: {
          starter: pricing.starter,
          core: pricing.core,
          premium: pricing.premium,
          starterClients: pricing.starterClients,
          coreClients: pricing.coreClients,
          premiumClients: pricing.premiumClients,
          goal: figures.goal,
          hours: figures.hours,
          maxClients: figures.maxClients,
          hoursPerClient: figures.hoursPerClient,
          impliedHourlyRate: figures.impliedHourlyRate,
          raisedCore: figures.raisedCore,
          extraFromRaise: figures.extraFromRaise,
          totalRevenue: figures.totalRevenue,
          premiumPct: figures.premiumPct,
        },
        variant,
        avoidNames: avoidNames.slice(0, 9),
      }),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('application/json')) return null;
    const data = (await res.json()) as { packages?: unknown; strategyNotes?: unknown };
    return data.packages ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
