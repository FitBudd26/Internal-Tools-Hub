import { CTA_URL } from './links';
import type { Pricing, PricingInput } from './types';
import { currentPageUrl, postEvent } from '../../shared/lib/tracking';

export const TOOL = 'pricing-package-builder';
export const TOOL_SOURCE = 'pricing_package_builder';
const CAMPAIGN = 'pricing_package_builder';

/** The lead, posted when a strategy is generated. HubSpot keeps the fields its form defines (name + email today). */
export function trackLead(name: string, email: string, input: PricingInput, pricing: Pricing): void {
  postEvent(TOOL, 'lead', {
    email: email.trim(),
    firstname: name.trim(),
    coaching_format: input.coachingFormat,
    fitness_niche: input.niche,
    experience_level: input.experience,
    services_offered: input.services.join(', '),
    program_duration: input.programDuration,
    monthly_income_goal: input.incomeGoal,
    hours_per_week: input.hoursPerWeek,
    max_clients: String(input.maxClients),
    starter_price: String(pricing.starter),
    core_price: String(pricing.core),
    premium_price: String(pricing.premium),
    tool_source: TOOL_SOURCE,
    campaign: CAMPAIGN,
    page_url: currentPageUrl(),
    submitted_at: new Date().toISOString(),
  });
}

export function trackCtaClick(email: string, text: string, url: string = CTA_URL): void {
  postEvent(TOOL, 'cta_click', {
    email: email.trim(),
    cta_clicked: 'true',
    cta_text: text,
    cta_url: url,
    cta_clicked_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    page_url: currentPageUrl(),
  });
}
