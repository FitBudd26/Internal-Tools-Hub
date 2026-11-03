import type { IntakeQuestion, IntakeSection, Questionnaire } from './types';
import { CHOICE_TYPES } from './types';

/** Pure helpers over the questionnaire object. The preview, the editor and the PDF all use the same object. */

export function countQuestions(q: Questionnaire): number {
  return q.sections.reduce((n, s) => n + s.questions.length, 0);
}

/** Rough completion time: about 25 seconds a question, never under 2 minutes. */
export function estimateMinutes(questionCount: number): number {
  return Math.max(2, Math.round(questionCount * 0.42));
}

/** Lowercased, punctuation-free text used to spot duplicate questions. */
export function questionKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nextQuestionId(q: Questionnaire): string {
  let max = 0;
  for (const s of q.sections) {
    for (const question of s.questions) {
      const m = /^q_(\d+)$/.exec(question.id);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return `q_${String(max + 1).padStart(3, '0')}`;
}

function mapSection(q: Questionnaire, sectionId: string, fn: (s: IntakeSection) => IntakeSection): Questionnaire {
  return { ...q, sections: q.sections.map((s) => (s.id === sectionId ? fn(s) : s)) };
}

export function updateQuestion(q: Questionnaire, sectionId: string, questionId: string, patch: Partial<IntakeQuestion>): Questionnaire {
  return mapSection(q, sectionId, (s) => ({
    ...s,
    questions: s.questions.map((question) => (question.id === questionId ? normalizeQuestion({ ...question, ...patch }) : question)),
  }));
}

/** Removes a question; a section left empty is removed too. */
export function removeQuestion(q: Questionnaire, sectionId: string, questionId: string): Questionnaire {
  const next = mapSection(q, sectionId, (s) => ({ ...s, questions: s.questions.filter((question) => question.id !== questionId) }));
  return { ...next, sections: next.sections.filter((s) => s.questions.length > 0) };
}

/** Moves a question up or down; across a section boundary it moves into the neighbouring section. */
export function moveQuestion(q: Questionnaire, sectionId: string, questionId: string, dir: -1 | 1): Questionnaire {
  const si = q.sections.findIndex((s) => s.id === sectionId);
  if (si < 0) return q;
  const section = q.sections[si];
  const qi = section.questions.findIndex((question) => question.id === questionId);
  if (qi < 0) return q;
  const target = qi + dir;
  const sections = q.sections.map((s) => ({ ...s, questions: [...s.questions] }));
  if (target >= 0 && target < section.questions.length) {
    const list = sections[si].questions;
    [list[qi], list[target]] = [list[target], list[qi]];
    return { ...q, sections };
  }
  const ni = si + dir;
  if (ni < 0 || ni >= sections.length) return q;
  const [moved] = sections[si].questions.splice(qi, 1);
  if (dir === 1) sections[ni].questions.unshift(moved);
  else sections[ni].questions.push(moved);
  return { ...q, sections: sections.filter((s) => s.questions.length > 0) };
}

export function addQuestion(q: Questionnaire, sectionId: string, question: Omit<IntakeQuestion, 'id'>): Questionnaire {
  const withId = normalizeQuestion({ ...question, id: nextQuestionId(q) });
  return mapSection(q, sectionId, (s) => ({ ...s, questions: [...s.questions, withId] }));
}

export function updateTitle(q: Questionnaire, formTitle: string): Questionnaire {
  return { ...q, formTitle: formTitle.trim() || q.formTitle };
}

/** Keeps a question internally consistent after an edit (options only on choice types, labels only on ratings). */
export function normalizeQuestion(question: IntakeQuestion): IntakeQuestion {
  const base: IntakeQuestion = {
    ...question,
    question: question.question.trim(),
    helpText: question.helpText.trim(),
    options: CHOICE_TYPES.has(question.type) ? question.options.map((o) => o.trim()).filter(Boolean).slice(0, 12) : [],
  };
  if (question.type === 'rating') {
    const [lo, hi] = question.scaleLabels ?? ['', ''];
    base.scaleLabels = [lo.trim() || 'Low', hi.trim() || 'High'];
  } else {
    delete base.scaleLabels;
  }
  return base;
}

/** Why an edited question cannot be saved, or null when it can. */
export function questionProblem(question: Pick<IntakeQuestion, 'question' | 'type' | 'options'>): string | null {
  if (question.question.trim().length < 5) return 'Write the question first (at least 5 characters).';
  if (question.question.trim().length > 240) return 'Keep the question under 240 characters.';
  if (CHOICE_TYPES.has(question.type)) {
    const opts = question.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return 'Choice questions need at least two options.';
    if (opts.length > 12) return 'Keep it to 12 options or fewer.';
  }
  return null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const FALLBACK_PDF_FILE = 'fitbudd-personal-trainer-intake-form.pdf';

/** `online-coaching-client-intake-form.pdf` style name from the form title. */
export function pdfFileName(q: Questionnaire): string {
  let slug = slugify(q.formTitle);
  if (!slug) return FALLBACK_PDF_FILE;
  if (!/form$/.test(slug)) slug += '-form';
  return `${slug}.pdf`;
}
