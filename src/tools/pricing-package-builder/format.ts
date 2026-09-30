import { tierRevenue } from './generatePricing';
import { TIERS, TIER_LABEL, money, type PricingStrategy } from './types';

/** "/mo", or "/member/mo" for group coaching, where prices are per member. */
export const priceUnit = (isGroup: boolean): string => (isGroup ? '/member/mo' : '/mo');

/** The whole strategy as plain text, for the Copy button. */
export function strategyText(strategy: PricingStrategy): string {
  const { packages, strategyNotes, pricing, figures } = strategy;
  const rev = tierRevenue(pricing);
  const clients = { starter: pricing.starterClients, core: pricing.coreClients, premium: pricing.premiumClients };
  const lines: string[] = [];
  for (const p of packages) {
    lines.push(`${TIER_LABEL[p.tier].toUpperCase()}: ${p.name} - ${money(p.priceMonthly)}${priceUnit(pricing.isGroup)}`);
    lines.push(p.tagline);
    for (const item of p.includes) lines.push(`- ${item}`);
    lines.push(`Ideal for: ${p.idealFor}`);
    lines.push(`Delivery: ${p.deliverySummary}`, '');
  }
  lines.push('PRICING STRATEGY NOTES');
  strategyNotes.forEach((note, i) => lines.push(`${i + 1}. ${note}`));
  lines.push('', 'REVENUE PROJECTION');
  for (const tier of TIERS) lines.push(`${TIER_LABEL[tier]}: ${clients[tier]} x ${money(pricing[tier])} = ${money(rev[tier])}`);
  lines.push(`Total: ${money(figures.totalRevenue)}/mo`);
  return lines.join('\n');
}
