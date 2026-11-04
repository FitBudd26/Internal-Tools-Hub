import type { LeadDetails, RecipeConfig, RecipeSet } from './types.js';
import { postEvent, trialUrl } from '../../shared/lib/tracking';
import { attributionFields } from '../../shared/lib/attribution';

export const TOOL = 'atkins-recipe-generator';
export const TOOL_SOURCE = 'atkins_recipe_generator';
const CAMPAIGN = 'lead_magnet';

export const CTA_TEXT = 'Start Your 30-Day Free Trial';
/** dashboard.fitbudd.com/signup?utm_source=atkins_recipe_generator&utm_medium=tool_cta&utm_campaign=lead_conversion */
export const CTA_URL = trialUrl(TOOL_SOURCE);
export const PRIVACY_URL = 'https://www.fitbudd.com/privacy-policy';

/** "Jane Q Public" → firstname "Jane", lastname "Q Public". */
export function splitName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstname: parts[0] ?? '', lastname: parts.slice(1).join(' ') };
}

/** The lead itself: sent once from the gate, before Gemini is asked. `internal_src` is the portal's existing "page or CTA that sourced this lead" property. */
export function trackLead(config: RecipeConfig, lead: LeadDetails): void {
  const { firstname, lastname } = splitName(lead.fullName);
  postEvent(TOOL, 'lead', {
    email: lead.email.trim(),
    firstname,
    lastname,
    atkins_plan: config.plan,
    atkins_phase: config.plan === 'Atkins 20' ? config.phase : config.plan === 'Flexible Low-Carb' ? `Custom: ${config.carbRange}` : 'Not applicable',
    meal_type: config.mealType ?? '',
    preferred_proteins: config.proteins.join(', '),
    cuisine: config.cuisine ?? '',
    cooking_time: config.cookingTime ?? '',
    dietary_restrictions: config.restrictions.join(', '),
    lead_magnet_source: TOOL_SOURCE,
    lead_magnet_type: 'atkins_recipes',
    tool_source: TOOL_SOURCE,
    internal_src: TOOL_SOURCE,
    campaign: CAMPAIGN,
    cta_destination: 'fitbudd_30_day_trial',
    submitted_at: new Date().toISOString(),
    ...attributionFields(),
  });
}

const names = (set: RecipeSet) => set.recipes.map((r) => r.name).join('; ');

/** After a successful generation (secondary event: never creates a second lead). */
export function trackGenerated(email: string, set: RecipeSet): void {
  postEvent(TOOL, 'generated', {
    email: email.trim(),
    recipes_generated: 'true',
    recipes_generated_at: new Date().toISOString(),
    generated_recipes: names(set),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}

export function trackRegenerated(email: string, set: RecipeSet): void {
  postEvent(TOOL, 'regenerate', {
    email: email.trim(),
    recipes_regenerated: 'true',
    recipes_regenerated_at: new Date().toISOString(),
    generated_recipes: names(set),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}

export function trackPdfDownload(email: string, fileName: string): void {
  postEvent(TOOL, 'pdf_download', {
    email: email.trim(),
    pdf_downloaded: 'true',
    pdf_downloaded_at: new Date().toISOString(),
    pdf_file_name: fileName,
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}

export function trackCtaClick(email: string): void {
  postEvent(TOOL, 'cta_click', {
    email: email.trim(),
    cta_clicked: 'true',
    cta_text: CTA_TEXT,
    cta_url: CTA_URL,
    cta_clicked_at: new Date().toISOString(),
    tool_source: TOOL_SOURCE,
    ...attributionFields(),
  });
}
