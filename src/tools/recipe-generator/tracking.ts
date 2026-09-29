import type { Recipe, RecipeInput } from './types';
import { currentPageUrl, postEvent, trialUrl } from '../../shared/lib/tracking';

export const TOOL = 'recipe-generator';
export const TOOL_SOURCE = 'recipe_generator';
const CAMPAIGN = 'lead_magnet';

export const CTA_TEXT = 'Start Free Trial';
export const CTA_URL = trialUrl(TOOL_SOURCE);

/** The lead, posted when recipes are generated. */
export function trackLead(input: RecipeInput, email: string, name: string, recipes: Recipe[]): void {
  postEvent(TOOL, 'lead', {
    email: email.trim(),
    firstname: name.trim(),
    client_goal: input.goal ?? '',
    preferred_protein: input.proteins.join(', '),
    dietary_preference: input.diets.join(', '),
    meal_type: input.mealTypes.join(', '),
    cooking_time: input.cookingTime ?? '',
    notes: input.notes.trim().slice(0, 600),
    generated_recipes: recipes.map((r) => r.name).join('; '),
    tool_source: TOOL_SOURCE,
    campaign: CAMPAIGN,
    cta_destination: 'fitbudd_self_signup',
    page_url: currentPageUrl(),
    submitted_at: new Date().toISOString(),
  });
}

export function trackPdfDownload(email: string, recipes: Recipe[]): void {
  postEvent(TOOL, 'pdf_download', {
    email: email.trim(),
    pdf_downloaded: 'true',
    pdf_downloaded_at: new Date().toISOString(),
    generated_recipes: recipes.map((r) => r.name).join('; '),
    tool_source: TOOL_SOURCE,
    page_url: currentPageUrl(),
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
    page_url: currentPageUrl(),
  });
}
