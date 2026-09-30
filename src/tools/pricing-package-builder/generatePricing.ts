import {
  SERVICES,
  hoursValue,
  incomeValue,
  money,
  type CoachingFormat,
  type Figures,
  type Niche,
  type Pricing,
  type PricingInput,
  type PricingPackage,
  type PricingStrategy,
  type Service,
  type Tier,
} from './types';

/**
 * The pricing maths and the built-in package copy, ported from the
 * standalone Pricing & Package Builder. The maths (tier prices, client
 * split, revenue projection) is always done here, so the numbers on screen
 * add up whoever writes the words. The copy (names, taglines, what each
 * tier includes, strategy notes) is the fallback behind Gemini (see
 * aiPricing.ts).
 */

/* ------------------------------ pricing maths ------------------------------ */

const GROUP_SIZE = 10;

export function calculatePricing(input: PricingInput): Pricing {
  const incomeGoal = incomeValue(input.incomeGoal) || 5000;
  const maxClients = input.maxClients || 20;
  const isGroup = input.coachingFormat === 'Group';

  const expMult = input.experience === 'Less than 1 year' ? 0.72 : input.experience === '1-3 years' ? 0.87 : 1.0;
  const dur = input.programDuration;
  const durMult = dur === '4 weeks' ? 1.25 : dur === '8 weeks' ? 1.1 : dur === '12 weeks' ? 1.0 : 0.92;

  const premiumClients = Math.max(1, Math.round(maxClients * 0.2));
  const coreClients = Math.max(1, Math.round(maxClients * 0.5));
  const starterClients = Math.max(1, maxClients - premiumClients - coreClients);

  const divisor = starterClients * 0.6 + coreClients + premiumClients * 2.2;
  let core = Math.round(((incomeGoal / divisor) * expMult * durMult) / 10) * 10;
  core = Math.max(149, Math.min(core, 850));
  const starter = Math.round((core * 0.6) / 5) * 5;
  const premium = Math.round((core * 2.2) / 10) * 10;

  if (isGroup) {
    // Group coaching is priced per member, with a floor for each tier.
    const perMember = (price: number, floor: number) => Math.max(floor, Math.round(price / GROUP_SIZE / 5) * 5);
    return { starter: perMember(starter, 45), core: perMember(core, 75), premium: perMember(premium, 110), starterClients, coreClients, premiumClients, isGroup: true };
  }
  return { starter, core, premium, starterClients, coreClients, premiumClients, isGroup: false };
}

export const tierRevenue = (p: Pricing): Record<Tier, number> => ({
  starter: p.starterClients * p.starter,
  core: p.coreClients * p.core,
  premium: p.premiumClients * p.premium,
});

/** The numbers the strategy notes are allowed to quote. */
export function figuresFor(input: PricingInput, pricing: Pricing): Figures {
  const goal = incomeValue(input.incomeGoal) || 5000;
  const hours = hoursValue(input.hoursPerWeek) || 20;
  const maxClients = input.maxClients || 20;
  const hoursPerClient = Math.round((hours / maxClients) * 10) / 10;
  const impliedHourlyRate = Math.max(5, Math.round(pricing.core / (Math.max(hoursPerClient, 0.1) * 4.3) / 5) * 5);
  const raisedCore = Math.round((pricing.core * 1.25) / 10) * 10;
  // Rounded to the nearest $100 as before; small amounts to the nearest $10 so they never read as $0.
  const extra = (raisedCore - pricing.core) * pricing.coreClients;
  const extraFromRaise = extra >= 100 ? Math.round(extra / 100) * 100 : Math.round(extra / 10) * 10;
  const rev = tierRevenue(pricing);
  const totalRevenue = rev.starter + rev.core + rev.premium;
  return {
    goal,
    hours,
    maxClients,
    hoursPerClient,
    impliedHourlyRate,
    raisedCore,
    extraFromRaise,
    totalRevenue,
    revenueGap: goal - totalRevenue,
    premiumPct: Math.round((rev.premium / totalRevenue) * 100),
  };
}

/* ------------------------------ package copy ------------------------------ */

const NICHE_NAMES: Record<Niche, [string, string, string]> = {
  'General Fitness': ['Foundation Plan', 'Complete Coaching', 'Elite Coaching'],
  'Weight Loss/Fat Loss': ['Shred Starter', 'Total Transformation', 'VIP Transformation'],
  'Strength & Powerlifting': ['Strength Base', 'Power Builder', 'Elite Powerlifting'],
  'Bodybuilding/Physique': ['Physique Foundation', 'Stage Ready Pro', 'Elite Competition Prep'],
  'Sports Performance': ['Performance Base', 'Athlete Pro', 'Elite Performance'],
  "Women's Fitness/Pre-Post Natal": ['Wellness Start', 'Complete Wellness', 'Premium Wellness'],
  'Yoga/Mobility': ['Flow Foundation', 'Mind & Body Pro', 'Elite Mobility'],
  'Functional Fitness/CrossFit': ['Functional Base', 'CrossFit Pro', 'Elite Athlete'],
  'Senior Fitness': ['Active Foundations', 'Vitality Pro', 'Elite Active Aging'],
  'Youth/Athletic Development': ['Youth Starter', 'Athlete Development', 'Elite Youth Program'],
  'Rehab/Corrective Exercise': ['Recovery Foundation', 'Corrective Pro', 'Elite Rehabilitation'],
  Other: ['Foundation Plan', 'Complete Coaching', 'VIP Coaching'],
};

/** A short word for the niche, used to build alternative names when the packages are regenerated. */
const NICHE_WORD: Record<Niche, string> = {
  'General Fitness': 'Fitness',
  'Weight Loss/Fat Loss': 'Fat Loss',
  'Strength & Powerlifting': 'Strength',
  'Bodybuilding/Physique': 'Physique',
  'Sports Performance': 'Performance',
  "Women's Fitness/Pre-Post Natal": 'Wellness',
  'Yoga/Mobility': 'Mobility',
  'Functional Fitness/CrossFit': 'Functional',
  'Senior Fitness': 'Active Aging',
  'Youth/Athletic Development': 'Youth Athlete',
  'Rehab/Corrective Exercise': 'Recovery',
  Other: 'Coaching',
};
const ALT_TIER_WORDS: [string, string, string][] = [
  ['Kickstart', 'Momentum', 'All-Access'],
  ['Essentials', 'Signature', 'VIP'],
  ['Launch', 'Accelerator', 'Inner Circle'],
];

const NICHE_TAGLINES: Record<Niche, [string, string, string]> = {
  'General Fitness': ['Build the habit. See the results.', 'The complete system for lasting fitness.', 'Total transformation with direct access to me.'],
  'Weight Loss/Fat Loss': ['The first step to real, lasting fat loss.', 'The proven path to the body you want.', 'Maximum results with maximum accountability.'],
  'Strength & Powerlifting': ['Build strength that shows on the platform.', 'Structured programming that drives real numbers.', 'Elite-level strength coaching, every rep.'],
  'Bodybuilding/Physique': ['Build the foundation your physique needs.', 'Stage-ready programming and nutrition.', 'Competition prep with elite-level detail.'],
  'Sports Performance': ['Train the way your sport demands.', 'Performance programming built around your sport.', 'Everything you need to dominate your season.'],
  "Women's Fitness/Pre-Post Natal": ['Start your journey with the right support.', 'Coaching built around your life and your goals.', 'Dedicated support at every stage of your journey.'],
  'Yoga/Mobility': ['Start moving with purpose.', 'Deepen your practice with expert guidance.', 'Full-access mobility coaching and accountability.'],
  'Functional Fitness/CrossFit': ['Build the base. Move better. Go harder.', 'Programming that makes you fitter in every direction.', 'Elite coaching for competitive athletes.'],
  'Senior Fitness': ['Move confidently and feel strong every day.', 'A complete plan built for your body and your goals.', 'Dedicated coaching and full support to keep you thriving.'],
  'Youth/Athletic Development': ['The foundation every young athlete needs.', 'Multi-sport development that builds winners.', 'Elite athlete development for serious competitors.'],
  'Rehab/Corrective Exercise': ['Start moving pain-free with the right plan.', 'Corrective coaching that restores function.', 'Comprehensive rehab and performance coaching.'],
  Other: ['The start of your transformation.', 'The complete coaching experience.', 'Coaching with full access and full commitment.'],
};

const NICHE_IDEAL_FOR: Record<Niche, [string, string, string]> = {
  'General Fitness': ['People new to fitness who want a clear starting point.', 'Clients committed to consistent progress with expert guidance.', 'Goal-driven clients who want direct, personal accountability.'],
  'Weight Loss/Fat Loss': ['Clients starting their fat loss journey with a structured plan.', 'Clients ready to commit fully to hitting their goal weight.', "Clients who've tried before and are ready for a completely different level of support."],
  'Strength & Powerlifting': ['Lifters who want structured programming beyond generic plans.', 'Competitors or serious lifters targeting specific strength goals.', 'Lifters ready to train like elite athletes with elite-level coaching.'],
  'Bodybuilding/Physique': ['Clients building their foundation before stepping on stage.', 'Competitors preparing for their next show with full programming and nutrition.', 'Dedicated competitors who want every detail locked in from macros to peak week.'],
  'Sports Performance': ['Athletes who want structured off-season or in-season training.', 'Competitive athletes targeting position-specific performance gains.', 'Serious athletes who want elite-level, sport-specific coaching.'],
  "Women's Fitness/Pre-Post Natal": ['Women starting their fitness journey who want a safe, supportive approach.', 'Women ready for consistent progress with a coach who understands their needs.', 'Women who want dedicated support and expert guidance at every stage.'],
  'Yoga/Mobility': ['Beginners building a consistent practice from the ground up.', 'Practitioners ready to deepen their practice with expert feedback.', 'Advanced practitioners seeking full-spectrum mobility and coaching support.'],
  'Functional Fitness/CrossFit': ['Athletes new to CrossFit who want to build a strong base.', 'Dedicated athletes optimising performance across multiple disciplines.', 'Competitive athletes who want elite coaching for elite-level results.'],
  'Senior Fitness': ['Active adults who want a safe, structured program for their goals.', 'Seniors committed to maintaining strength, mobility, and independence.', 'Clients who want dedicated expert coaching and full-access support.'],
  'Youth/Athletic Development': ['Young athletes building fitness foundations and sport skills.', 'Multi-sport athletes developing the physical tools to excel in their sport.', 'Elite young athletes targeting serious competitive performance.'],
  'Rehab/Corrective Exercise': ['Clients recovering from injury who need a careful, structured return to movement.', 'Clients with movement limitations wanting to build strength alongside corrective work.', 'Clients who want comprehensive rehab, performance, and ongoing corrective support.'],
  Other: ['Clients new to structured coaching who want a starting point.', 'Committed clients who want a complete coaching experience.', 'Clients who want full, dedicated access and the highest level of support.'],
};

const STARTER_PRIORITY: Service[] = ['Workout Programs', 'Progress Tracking', 'Weekly Check-Ins'];
const CORE_PRIORITY: Service[] = ['Nutrition Plans', 'Messaging Support', 'Video Calls', 'Form Check', 'Habit Coaching'];
const PREMIUM_EXTRAS: Service[] = ['Supplement Guidance', 'Group Challenges'];

function includesFor(selected: Service[]): Record<Tier, string[]> {
  const inOrder = (keep: (s: Service) => boolean): string[] => SERVICES.filter((s) => selected.includes(s) && keep(s));
  let starter = [...inOrder((s) => STARTER_PRIORITY.includes(s)), ...inOrder((s) => !STARTER_PRIORITY.includes(s))].slice(0, 3);
  if (starter.length === 0) starter = ['Custom Workout Program', 'Weekly Check-Ins', 'Progress Tracking'];
  const core = [...new Set([...starter, ...inOrder((s) => CORE_PRIORITY.includes(s))])].slice(0, 5);
  if (core.length < 4) core.push('In-App Messaging Support', 'Video Coaching Calls');
  const premium = [...new Set([...core, ...inOrder(() => true), ...inOrder((s) => PREMIUM_EXTRAS.includes(s)), 'Priority Support', 'Monthly Strategy Call'])].slice(0, 7);
  return { starter, core, premium };
}

function deliveryFor(format: CoachingFormat): Record<Tier, string> {
  return {
    starter: format === 'Group' ? 'App-based · Group sessions · Weekly check-ins' : 'App-based · Weekly check-ins',
    core:
      format === 'Hybrid' ? 'App + in-person sessions · Bi-weekly check-ins'
      : format === 'Group' ? 'App + group sessions · Bi-weekly coaching calls'
      : 'App + video calls · Bi-weekly check-ins',
    premium:
      format === 'Hybrid' ? 'Full-access app + priority in-person sessions + weekly calls'
      : format === 'Group' ? 'Full-access app + small-group coaching + weekly calls'
      : 'Full-access app + weekly calls + priority support',
  };
}

function namesFor(niche: Niche, variant: number): [string, string, string] {
  if (variant <= 0) return NICHE_NAMES[niche];
  const words = ALT_TIER_WORDS[(variant - 1) % ALT_TIER_WORDS.length];
  return [`${NICHE_WORD[niche]} ${words[0]}`, `${NICHE_WORD[niche]} ${words[1]}`, `${NICHE_WORD[niche]} ${words[2]}`];
}

/* ------------------------------ strategy notes ------------------------------ */

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function buildStrategyNotes(input: PricingInput, pricing: Pricing, f: Figures): string[] {
  const { experience: exp, niche, coachingFormat: format, services } = input;
  const { hours, maxClients, hoursPerClient, impliedHourlyRate, raisedCore, extraFromRaise } = f;
  const has = (s: Service) => services.includes(s);
  const notes: string[] = [];

  // Note 1: pricing reality for their experience level.
  if (exp === 'Less than 1 year') {
    notes.push(
      `Your core package at ${money(pricing.core)}/month is a realistic starting price for building your first client base. ` +
        `At ${hoursPerClient} hours per client per week, your implied coaching rate is around ${money(impliedHourlyRate)}/hour, which is competitive for early-stage online coaching. ` +
        `New coaches who undercharge end up with full rosters and no room to raise prices without losing everyone at once. ` +
        `Avoid that trap by setting a 90-day review date now. ` +
        `Once you have 5 documented client results, raise the core price to ${money(raisedCore)}. ` +
        `That one adjustment on your current tier mix adds ${money(extraFromRaise)}/month with no new clients needed.`,
    );
  } else if (exp === '1-3 years') {
    notes.push(
      `At ${money(pricing.core)}/month for your core package, you are priced competitively for a 1 to 3 year coach in ${niche}. ` +
        `With ${hoursPerClient} hours per client per week, your implied rate is around ${money(impliedHourlyRate)}/hour. ` +
        `The realistic next step is ${money(raisedCore)}/month, which adds ${money(extraFromRaise)}/month from the core tier alone with the same number of clients. ` +
        `Test the higher price on new enquiries first. ` +
        `Existing clients do not need an immediate increase; raising your acquisition price is enough to shift your average over time.`,
    );
  } else {
    notes.push(
      `With 3 or more years of experience, your premium tier at ${money(pricing.premium)}/month is the package worth the most attention. ` +
        `At ${money(pricing.core)}/month for Core and ${hoursPerClient} hours per client per week, your implied rate is around ${money(impliedHourlyRate)}/hour, which is fully defensible at your level. ` +
        `Test a higher price on the next 3 enquiries before assuming the market will not support it: moving Core to ${money(raisedCore)}/month adds ${money(extraFromRaise)}/month at the same client count. ` +
        `Most established coaches undercharge not because clients will not pay more, but because they have not asked.`,
    );
  }

  // Note 2: capacity and hours reality check.
  if (hoursPerClient < 0.75) {
    notes.push(
      `At ${hours} hours per week across ${maxClients} clients, you are averaging ${hoursPerClient} hours per client. ` +
        `That is a low-touch, asynchronous model. It works when delivery is built around pre-written programmes, automated check-ins, and minimal live calls. ` +
        `If clients at the Starter tier expect active back-and-forth at that rate, you will see churn within 60 days. ` +
        `Make the async nature explicit in your Starter description so clients self-select correctly, and make sure only clients who want more interaction move up to Core or Premium.`,
    );
  } else if (hoursPerClient > 2) {
    const sustainableCap = Math.max(5, Math.round((hours * 0.65) / 2));
    notes.push(
      `You are allocating roughly ${hoursPerClient} hours per client per week across ${maxClients} clients and ${hours} hours total. ` +
        `That is a high-touch model and your pricing accounts for it. ` +
        `The practical ceiling at this intensity is around ${sustainableCap} active clients before delivery quality or your own energy degrades. ` +
        `To protect your margin as you scale, cap live touchpoints per client to a defined number per week and handle anything beyond that asynchronously. ` +
        `Clients notice consistency and quality, not raw contact hours.`,
    );
  } else {
    notes.push(
      `At ${hours} hours per week across ${maxClients} clients, you are running a sustainable ratio of ${hoursPerClient} hours per client. ` +
        `That gives you enough time to deliver well without burning out. ` +
        `The risk at this ratio is that it feels manageable now but gets tight fast once you add admin, content, and sales time on top of coaching hours. ` +
        `Before you hit capacity, build repeatable systems for intake, programming, and check-ins. ` +
        `Coaches who do this before they are full can scale without sacrificing quality. Coaches who do it after are already in damage control.`,
    );
  }

  // Note 3: format, niche and services.
  if (format === 'Hybrid') {
    notes.push(
      `Hybrid coaching commands a real premium because clients place high value on the in-person component. ` +
        `Keep in-person sessions out of your Starter tier entirely. ` +
        `The gap between Starter at ${money(pricing.starter)} and Core at ${money(pricing.core)} needs to feel clearly worth the jump, and a face-to-face session is the most tangible justification for that difference. ` +
        `Clients who are price-sensitive enough to stay on Starter are also telling you they want convenience more than accountability, which makes them a poor fit for in-person work anyway.`,
    );
  } else if (format === 'Group') {
    const cohortCap = Math.min(15, Math.max(6, Math.round(maxClients / 3)));
    notes.push(
      `Group coaching converts best with fixed cohort sizes and a clear intake window. ` +
        `Cap each cohort at ${cohortCap} and make that number visible in all your promotion. ` +
        `Open-enrollment group programmes get treated like subscriptions and generate no urgency. ` +
        `A hard cap with a defined start date creates real scarcity without any artificial pressure. ` +
        `At ${money(pricing.core)}/month per member, your ${plural(pricing.coreClients, 'Core member')} are paying for content you write once and deliver repeatedly.`,
    );
  } else if (format === '1:1 In-Person') {
    const minsPerClient = Math.round((hours * 60) / maxClients);
    notes.push(
      `In-person training has a hard capacity ceiling set by your physical schedule. ` +
        `At ${hours} hours per week across ${maxClients} clients, you are averaging ${minsPerClient} minutes per client per week before travel and setup time. ` +
        `Your pricing needs to account for that total time cost, not just the session itself. ` +
        `At the Core price your rate works out to about ${money(impliedHourlyRate)} per client hour, so make sure that rate genuinely reflects your market and experience level before discounting to close a new client.`,
    );
  } else if (format === '1:1 + Group') {
    notes.push(
      `Running 1:1 and group programmes simultaneously requires clear separation in how you position them. ` +
        `Your group offering should be a distinct product with its own outcome and client type, not a cheaper version of your 1:1. ` +
        `Clients who compare the two and choose group because it is cheaper will feel like they are settling, and that framing kills retention. ` +
        `Position group as the right solution for a specific type of person, not a budget alternative to working with you directly.`,
    );
  } else if (has('Nutrition Plans') && (niche === 'Weight Loss/Fat Loss' || niche === 'Bodybuilding/Physique')) {
    notes.push(
      `Nutrition is the primary reason clients in ${niche} stay or leave. ` +
        `Include basic macro targets in your Core package and reserve weekly nutrition adjustments and custom meal planning for Premium only. ` +
        `When a Core client hits a plateau, the honest answer is usually that they need more detailed nutrition support. ` +
        `That becomes a natural and credible upgrade conversation rather than a sales push, because you are genuinely offering the right solution for where they are stuck.`,
    );
  } else if (has('Video Calls')) {
    notes.push(
      `Video calls are high-perceived value but easy to over-deliver. ` +
        `Cap them at one 30-minute session every two weeks for Core and one per week for Premium. ` +
        `Coaches who offer open-ended or unlimited calls attract clients who want reassurance more than results. ` +
        `A defined call structure signals that you run a professional, outcome-focused programme. ` +
        `It also gives you a meaningful and honest upgrade lever: clients who want more direct access have a clear reason to move to Premium.`,
    );
  } else if (niche === 'Sports Performance') {
    notes.push(
      `Sports performance clients plan their training around seasons. ` +
        `Offer an in-season and off-season variant of your Core package at the same ${money(pricing.core)}/month with adjusted training focus and session volume. ` +
        `Clients stay enrolled year-round because the programme clearly matches where they are in their competitive cycle. ` +
        `A client retained for the full year is worth roughly double a 6-month sign-up and costs nothing extra to acquire.`,
    );
  } else if (niche === 'Senior Fitness' || niche === 'Rehab/Corrective Exercise') {
    notes.push(
      `In ${niche}, trust is the primary buying factor. Price is secondary once a client believes you understand their history and take their situation seriously. ` +
        `Structure your consultations to ask detailed questions about their background before presenting any packages. ` +
        `Coaches who lead with pricing in this niche lose clients who would have paid significantly more if the consultation had built genuine confidence first. ` +
        `Your ${money(pricing.core)}/month core price is appropriate for this market. ` +
        `Your close rate on consultations will depend almost entirely on how well you listen before you pitch.`,
    );
  } else if (has('Form Check')) {
    notes.push(
      `Form check and video review is one of the most effective services for removing objections to online coaching. ` +
        `The most common hesitation with remote coaching is not knowing whether exercises are being done correctly. ` +
        `Including form review in Core and Premium addresses that concern directly and removes a barrier that stops many people from signing up. ` +
        `Share a short example review in your social content. ` +
        `Seeing a real review in action eliminates the objection for most people before they even speak to you.`,
    );
  } else if (has('Habit Coaching')) {
    notes.push(
      `Habit coaching is a significant retention driver. ` +
        `Clients working on behaviours alongside their training tend to stay noticeably longer than those following a programme alone. ` +
        `Use this in your positioning: you are the coach for people who have tried before and could not stay consistent. ` +
        `That framing speaks directly to the majority of your potential market, most of whom have had a previous coach or programme fail not because the training was wrong, but because nothing addressed their actual behaviour patterns.`,
    );
  } else {
    notes.push(
      `For ${niche}, the most effective marketing leads with a single clear outcome rather than a service list. ` +
        `Pick the specific result your ideal client wants most and make it the central message of every package description. ` +
        `Service lists tell people what you do. Outcome statements tell them what will change. ` +
        `At ${money(pricing.core)}/month, clients are not buying check-ins and programmes; they are buying the expectation of a specific result. ` +
        `Make that result explicit and your conversion rate at this price point will improve noticeably.`,
    );
  }

  // Note 4: revenue gap or optimisation path.
  if (f.revenueGap > 400) {
    const extraCore = Math.ceil(f.revenueGap / pricing.core);
    // Moving a Core client to Premium only adds the difference, and only existing Core clients can move.
    const upgradesNeeded = Math.ceil(f.revenueGap / Math.max(1, pricing.premium - pricing.core));
    const upgrade =
      upgradesNeeded <= pricing.coreClients
        ? `, or move ${plural(upgradesNeeded, 'existing Core client')} up to Premium. Converting existing clients is faster because the trust is already built`
        : `. Upgrading Core clients to Premium helps, but on its own it cannot close a gap this size`;
    notes.push(
      `Your current package mix projects ${money(f.totalRevenue)}/month, which is ${money(f.revenueGap)} short of your ${money(f.goal)} target. ` +
        `The clearest way to close that gap: add ${plural(extraCore, 'Core client')} at ${money(pricing.core)}/month${upgrade}. ` +
        `Focus on one lever at a time. Trying to grow all three tiers simultaneously splits your effort and slows progress on all of them.`,
    );
  } else {
    notes.push(
      `Your Premium tier at ${money(pricing.premium)}/month generates ${f.premiumPct}% of projected revenue from just ${plural(pricing.premiumClients, 'client')}. ` +
        `Filling those slots is your highest-value acquisition activity. ` +
        `Premium clients typically take one or two more conversations to close but stay longer and refer more often than clients at lower tiers. ` +
        `In consultations, qualify Premium buyers with a direct question about timeline: ask what happens to their goal if they put it off another 3 months. ` +
        `Clients who answer that honestly and feel the weight of it are the ones who will invest at this level and follow through.`,
    );
  }

  return notes;
}

/* ------------------------------ engine ------------------------------ */

/** The whole strategy from the built-in copy. `variant` changes the package names, for Regenerate. */
export function generateStrategy(input: PricingInput, variant = 0): PricingStrategy {
  const pricing = calculatePricing(input);
  const figures = figuresFor(input, pricing);
  const names = namesFor(input.niche, variant);
  const includes = includesFor(input.services);
  const delivery = deliveryFor(input.coachingFormat);
  const tiers: Tier[] = ['starter', 'core', 'premium'];
  const packages = tiers.map<PricingPackage>((tier, i) => ({
    tier,
    name: names[i],
    priceMonthly: pricing[tier],
    tagline: NICHE_TAGLINES[input.niche][i],
    idealFor: NICHE_IDEAL_FOR[input.niche][i],
    includes: includes[tier],
    deliverySummary: delivery[tier],
  }));
  return { packages, strategyNotes: buildStrategyNotes(input, pricing, figures), pricing, figures };
}
