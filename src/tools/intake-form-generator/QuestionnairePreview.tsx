import { useState } from 'react';
import { QuestionCard } from './QuestionCard';
import { QuestionEditor } from './QuestionEditor';
import { addQuestion, moveQuestion, removeQuestion, updateQuestion } from './questionUtils';
import type { Questionnaire } from './types';

interface QuestionnairePreviewProps {
  questionnaire: Questionnaire;
  onChange: (next: Questionnaire) => void;
}

/** Which question is being edited; questionId null = adding to that section. */
type Editing = { sectionId: string; questionId: string | null } | null;

/**
 * The generated form, section by section, with edit, reorder, remove and add.
 * Every change goes through the questionUtils helpers on the one questionnaire
 * object, so the PDF always matches what is on screen.
 */
export function QuestionnairePreview({ questionnaire, onChange }: QuestionnairePreviewProps) {
  const [editing, setEditing] = useState<Editing>(null);
  const lastSection = questionnaire.sections.length - 1;
  let number = 0;

  return (
    <div className="flex flex-col gap-2">
      {questionnaire.sections.map((section, si) => (
        <section key={section.id} className="rounded-lg border border-fb-tint-border bg-white p-2.5" aria-label={section.title}>
          <h3 className="text-[13px] font-bold text-gray-900">
            {si + 1}. {section.title}{' '}
            <span className="font-normal text-gray-400">
              · {section.questions.length} question{section.questions.length === 1 ? '' : 's'}
            </span>
          </h3>
          {section.description && <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{section.description}</p>}
          <ol className="mt-1.5 flex flex-col gap-1.5">
            {section.questions.map((q, qi) => {
              number += 1;
              const n = number;
              if (editing?.sectionId === section.id && editing.questionId === q.id) {
                return (
                  <li key={q.id}>
                    <QuestionEditor
                      initial={q}
                      onSave={(patch) => {
                        onChange(updateQuestion(questionnaire, section.id, q.id, patch));
                        setEditing(null);
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  </li>
                );
              }
              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  number={n}
                  canUp={!(si === 0 && qi === 0)}
                  canDown={!(si === lastSection && qi === section.questions.length - 1)}
                  onEdit={() => setEditing({ sectionId: section.id, questionId: q.id })}
                  onRemove={() => onChange(removeQuestion(questionnaire, section.id, q.id))}
                  onMove={(dir) => onChange(moveQuestion(questionnaire, section.id, q.id, dir))}
                />
              );
            })}
          </ol>
          {editing?.sectionId === section.id && editing.questionId === null ? (
            <div className="mt-1.5">
              <QuestionEditor
                initial={null}
                onSave={(q) => {
                  onChange(addQuestion(questionnaire, section.id, q));
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing({ sectionId: section.id, questionId: null })}
              className="mt-1.5 rounded text-[12px] font-medium text-fb-teal hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
            >
              + Add a question
            </button>
          )}
        </section>
      ))}
    </div>
  );
}
