/** Where the tool's calls to action lead. Kept free of browser code so the PDF builder can use it anywhere. */
export const CAMPAIGN = 'ai-workout-builder';
const SIGNUP = 'https://www.fitbudd.com/your-brand-awaits-your-app-self-sign-up';

export const CTA_TEXT = 'Start for free';
/** Same destination and UTM tags as the standalone tool's sign-up prompt, so attribution carries over. */
export const CTA_URL = `${SIGNUP}?utm_source=workout-generator&utm_medium=web&utm_campaign=${CAMPAIGN}&utm_content=post-generation-popup`;
/** The link printed at the end of the PDF. */
export const PDF_CTA_URL = `${SIGNUP}?utm_source=workout-generator&utm_medium=pdf&utm_campaign=${CAMPAIGN}&utm_content=pdf-footer`;
