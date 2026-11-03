/**
 * Hand-written questionnaires in the shape the generation route returns, used
 * only by scripts/intake-pdf-check.mjs to exercise the PDF layout (10, 20 and
 * 30 questions, long text, many options, special characters). They are test
 * fixtures, not a fallback: the tool itself never ships a canned form.
 */

let n = 0;
const q = (question, type, extra = {}) => ({
  id: `q_${String(++n).padStart(3, '0')}`,
  question,
  type,
  required: extra.required ?? true,
  options: extra.options ?? [],
  helpText: extra.helpText ?? '',
  ...(type === 'rating' ? { scaleLabels: extra.scaleLabels ?? ['Low', 'High'] } : {}),
});
const section = (id, title, description, questions) => ({ id, title, description, questions });

export function quickYoga() {
  n = 0;
  return {
    formTitle: 'Beginner Yoga Class Intake',
    formDescription: 'A few quick questions so your instructor can welcome you into class with the right support. It takes about 4 minutes.',
    sections: [
      section('s_01', 'About You', 'The basics, so we can keep in touch.', [
        q('Which age range are you in?', 'single_select', { options: ['Under 25', '25-34', '35-44', '45-54', '55-64', '65+'] }),
        q('How would you prefer we contact you about class changes?', 'single_select', { options: ['Email', 'Text message', 'Phone call'] }),
      ]),
      section('s_02', 'Your Yoga Experience', '', [
        q('Have you practised yoga before?', 'yes_no'),
        q('If yes, which styles have you tried?', 'multi_select', { required: false, options: ['Hatha', 'Vinyasa / flow', 'Yin or restorative', 'Hot yoga', 'Online classes', 'Other'] }),
        q('How confident do you feel moving between poses on the mat?', 'rating', { scaleLabels: ['Not at all confident', 'Very confident'] }),
      ]),
      section('s_03', 'Comfort & Accessibility', 'Help us make every class feel accessible.', [
        q('Is there any pain, injury or stiffness that affects how you move?', 'long_text', { helpText: 'Share what you are comfortable sharing; your instructor will offer modifications.' }),
        q('Would you like props (blocks, straps, bolsters) set out for you?', 'yes_no', { required: false }),
      ]),
      section('s_04', 'Goals & Scheduling', '', [
        q('What would you most like to get from your practice?', 'multi_select', { options: ['Flexibility', 'Stress relief', 'Strength', 'Better sleep', 'A regular routine', 'Community'] }),
        q('Which class times suit you best?', 'multi_select', { options: ['Early morning', 'Lunchtime', 'Evening', 'Weekend'] }),
        q('I understand my instructor is not a medical provider and I will let them know about anything that affects my practice.', 'acknowledgment'),
      ]),
    ],
    coachNotes: ['Keep the first class pose-light for anyone rating confidence 1-2.', 'Review the comfort section before class and prepare props accordingly.'],
    reviewNotice: 'Review the comfort and acknowledgment questions, and adapt them to your studio\'s requirements, before use.',
  };
}

export function standardOnlineWeightLoss() {
  n = 0;
  return {
    formTitle: 'Online Coaching Client Intake Form',
    formDescription: 'This form helps your coach understand your routine, your goals and what has worked (or not) before, so your plan fits real life from week one. It takes about 8 minutes.',
    sections: [
      section('s_01', 'Basic Information', '', [
        q('Which age range are you in?', 'single_select', { options: ['18-24', '25-34', '35-44', '45-54', '55+'] }),
        q('What is your occupation, and roughly how many hours a week do you work?', 'short_text'),
        q('Which time zone are you in?', 'short_text', { helpText: 'So check-ins land at a sensible hour for you.' }),
      ]),
      section('s_02', 'Your Goals', 'There are no wrong answers here.', [
        q('What would you most like to achieve in the next 12 weeks?', 'long_text'),
        q('How will you know coaching is working for you?', 'multi_select', { options: ['Clothes fit better', 'Scale weight', 'More energy', 'Better habits', 'Progress photos', 'Strength or fitness gains'] }),
        q('Do you have a target date or event in mind?', 'date', { required: false }),
      ]),
      section('s_03', 'Weight Management History', '', [
        q('Which approaches have you tried before?', 'multi_select', { options: ['Calorie counting', 'Meal plans', 'Intermittent fasting', 'Low carb or keto', 'Group programmes', 'Personal training', 'Apps', 'None of these'] }),
        q('What tended to get in the way of staying consistent?', 'long_text'),
        q('How ready do you feel to make changes right now?', 'rating', { scaleLabels: ['Still deciding', 'Fully committed'] }),
      ]),
      section('s_04', 'Daily Routine & Nutrition', '', [
        q('How many hours of sleep do you usually get on a work night?', 'number'),
        q('How often do you eat meals away from home each week?', 'single_select', { options: ['0-2', '3-5', '6-9', '10 or more'] }),
        q('Describe a typical weekday of eating, from waking to bed.', 'long_text'),
        q('How would you rate your stress on an average week?', 'rating', { scaleLabels: ['Very low', 'Very high'] }),
      ]),
      section('s_05', 'Training & Equipment', '', [
        q('How many days a week can you realistically train?', 'number'),
        q('What equipment do you have access to?', 'multi_select', { options: ['None (bodyweight only)', 'Dumbbells', 'Resistance bands', 'Kettlebell', 'Barbell and rack', 'Cardio machine', 'Full gym'] }),
        q('How long can a typical session be?', 'single_select', { options: ['20 minutes', '30 minutes', '45 minutes', '60 minutes or more'] }),
      ]),
      section('s_06', 'Coaching & Accountability', '', [
        q('How often would you like to check in with your coach?', 'single_select', { options: ['Daily', 'Twice a week', 'Weekly', 'Every two weeks'] }),
        q('Which channel do you prefer for coaching messages?', 'single_select', { options: ['In-app messages', 'Email', 'Video call', 'Text message'] }),
        q('Is there anything a coach should know before programming exercise for you, such as current injuries or advice from a health professional?', 'long_text', { required: false }),
        q('I confirm my answers are accurate and I will tell my coach if anything changes.', 'acknowledgment'),
      ]),
    ],
    coachNotes: ['Prioritise the consistency barriers answer when writing week one.', 'Match check-in cadence to the client\'s preference before adjusting it.', 'Flag any health note for a conversation before the first session.'],
    reviewNotice: 'Review the health-related and acknowledgment questions, and adapt them to your local requirements, before use.',
  };
}

export function comprehensiveStrength() {
  n = 0;
  const longQuestion =
    'Walk us through your current training week in detail: the split you follow, main lifts and typical working loads, accessory work, conditioning, and how you decide when to push or back off (we use this to avoid undoing what already works for you).';
  return {
    formTitle: 'Strength & Conditioning Athlete Intake',
    formDescription: 'A detailed intake so your coach can programme for your sport, your history and your schedule. Allow about 12 minutes; precise answers help us more than perfect ones.',
    sections: [
      section('s_01', 'Athlete Profile', '', [
        q('Which age range are you in?', 'single_select', { options: ['16-19', '20-24', '25-29', '30-34', '35-39', '40+'] }),
        q('What is your primary sport and position or event?', 'short_text'),
        q('Which level do you currently compete at?', 'single_select', { options: ['Recreational', 'Club', 'Collegiate / university', 'Semi-professional', 'Professional', 'Masters'] }),
        q('When is your next competition or key fixture?', 'date', { required: false }),
      ]),
      section('s_02', 'Strength Goals', '', [
        q('Which qualities matter most for your performance right now?', 'multi_select', { options: ['Maximal strength', 'Power / explosiveness', 'Speed', 'Hypertrophy', 'Work capacity', 'Mobility', 'Injury resilience', 'Body composition'] }),
        q('Which lifts or performance markers do you want to improve, and by how much?', 'long_text'),
        q('How important is strength training relative to your sport practice?', 'rating', { scaleLabels: ['Supporting role', 'Primary focus'] }),
      ]),
      section('s_03', 'Training History', '', [
        q('How many years have you trained with resistance consistently?', 'number'),
        q(longQuestion, 'long_text'),
        q('Which lifts can you perform with confident technique?', 'multi_select', {
          options: ['Back squat', 'Front squat', 'Conventional deadlift', 'Sumo deadlift', 'Bench press', 'Overhead press', 'Barbell row', 'Power clean', 'Snatch', 'Hip thrust', 'Weighted pull-up', 'Loaded carries'],
        }),
        q('Have you worked with a strength coach before?', 'yes_no'),
        q('If yes, what did you find most and least useful about that coaching?', 'long_text', { required: false }),
      ]),
      section('s_04', 'Recovery & Lifestyle', '', [
        q('How many hours do you sleep on a typical training night?', 'number'),
        q('Which recovery practices do you use regularly?', 'multi_select', { options: ['Structured deloads', 'Mobility work', 'Massage or soft tissue', 'Cold or heat', 'Sleep tracking', 'Nutrition timing', 'None yet'] }),
        q('How would you rate your current recovery between sessions?', 'rating', { scaleLabels: ['Always under-recovered', 'Fully recovered'] }),
        q('Do you track your nutrition or protein intake?', 'yes_no', { required: false }),
      ]),
      section('s_05', 'Movement & Readiness', 'This section helps your coach programme safely.', [
        q('Do you have any current injuries or pain that affects training?', 'yes_no'),
        q('If yes, describe the area, how long it has been an issue, and anything a physiotherapist or doctor has advised.', 'long_text', { required: false }),
        q('Are there movements you have been advised to avoid or modify?', 'short_text', { required: false }),
        q('Has a health professional advised you to limit physical activity in the last 12 months?', 'yes_no'),
      ]),
      section('s_06', 'Logistics & Scheduling', '', [
        q('How many strength sessions a week fit around sport practice?', 'number'),
        q('Which days are realistic for in-person sessions?', 'multi_select', { options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }),
        q('What time of day do you train best?', 'single_select', { options: ['Early morning', 'Midday', 'Afternoon', 'Evening'] }),
        q('Do you have other coaching commitments we should coordinate with (sport coach, physio, nutritionist)?', 'short_text', { required: false }),
      ]),
      section('s_07', 'Tracking & Expectations', '', [
        q('How do you prefer to track and review progress?', 'multi_select', { options: ['Training app log', 'Spreadsheet', 'Video review', 'Monthly testing', 'Coach-led review calls'] }),
        q('What do you expect from your coach between sessions?', 'long_text'),
        q('Rate how much detail you want in programme explanations.', 'rating', { scaleLabels: ['Just tell me what to do', 'Explain the why'] }),
        q('I confirm these answers are accurate and I will report new pain or injuries before training.', 'acknowledgment'),
      ]),
    ],
    coachNotes: ['Use the lifts list to set technique priorities for the first block.', 'Coordinate with the athlete\'s sport coach on weekly load before programming.'],
    reviewNotice: 'Review the movement and readiness questions with a qualified professional, and adapt them to your local requirements, before use.',
  };
}

/** Odd characters and edge cases the sanitiser has to handle. */
export function edgeCases() {
  n = 0;
  return {
    formTitle: 'Café “Mobility” Intake — Édition Spéciale 💪',
    formDescription: 'Tests em dashes — curly quotes “like these” — accents (é, ñ, ü) and emoji 🙂 that Helvetica cannot draw.',
    sections: [
      section('s_01', 'Section with a very long title that keeps going to check wrapping behaviour on the heading line', 'A description that is also quite long so that it wraps onto a second line in the PDF and we can see the spacing is right.', [
        q('Question with (parentheses) and a backslash \\ and “quotes” — does it render?', 'short_text'),
        q('An option list with a dozen long options to force a single column and a multi-page block?', 'multi_select', {
          options: Array.from({ length: 12 }, (_, i) => `Option number ${i + 1} with a reasonably long label that will need to wrap in a narrow column`),
        }),
        q('Rating with long labels?', 'rating', { scaleLabels: ['Completely new to this kind of training', 'Training consistently for many years'] }),
        q('Number?', 'number', { required: false }),
        q('Date of your next event?', 'date', { required: false }),
        q('Yes or no?', 'yes_no'),
        q('Je confirme que mes réponses sont exactes — acknowledgment with accents.', 'acknowledgment'),
      ]),
      section('s_02', 'Second Section', '', [
        q('A long text question whose answer area should stay together with the question even when it falls near the bottom of a page, because splitting them would look careless?', 'long_text', { helpText: 'Help text that is itself fairly long, to check that italic help copy wraps correctly under the question without colliding with the answer area.' }),
        q('Single choice with two columns?', 'single_select', { options: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'] }),
        q('Final short answer?', 'short_text'),
      ]),
    ],
    coachNotes: [],
    reviewNotice: '',
  };
}

export const SAMPLES = { quickYoga, standardOnlineWeightLoss, comprehensiveStrength, edgeCases };
