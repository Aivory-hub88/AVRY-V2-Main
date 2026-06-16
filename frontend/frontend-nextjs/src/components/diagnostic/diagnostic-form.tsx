"use client";

import React, { useState } from "react";
import { FREE_DIAGNOSTIC_QUESTIONS, DiagnosticQuestion } from "@/lib/diagnostic-questions";

/**
 * Diagnostic Form Props
 */
interface DiagnosticFormProps {
  onSubmit: (answers: Record<string, number>) => Promise<void>;
  isLoading?: boolean;
  onAnswerChange?: (questionId: string, answer: number) => void;
}

/**
 * Diagnostic Form Component
 * Renders interactive form with all 12 diagnostic questions
 */
export function DiagnosticForm({
  onSubmit,
  isLoading = false,
  onAnswerChange,
}: DiagnosticFormProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = FREE_DIAGNOSTIC_QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / FREE_DIAGNOSTIC_QUESTIONS.length) * 100;
  const totalQuestions = FREE_DIAGNOSTIC_QUESTIONS.length;

  const handleAnswerChange = (questionId: string, answer: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
    onAnswerChange?.(questionId, answer);
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions answered
    const allAnswered = FREE_DIAGNOSTIC_QUESTIONS.every((q) => answers[q.id] !== undefined);
    if (!allAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-text-secondary">
          <span className="font-medium">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
          <div
            className="bg-brand-mint h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Section */}
      <div className="bg-bg-secondary rounded-lg border border-border-default p-8 min-h-[400px]">
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-mint/10 text-brand-mint text-xs font-medium mb-4">
            {currentQuestion.section.toUpperCase()}
          </span>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">
            {currentQuestion.question}
          </h2>
          {currentQuestion.description && (
            <p className="text-text-secondary text-sm">
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Answer Options */}
        <div className="space-y-4">
          {currentQuestion.type === "single-choice" && currentQuestion.options && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className={`
                    flex items-center p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      answers[currentQuestion.id] === option.value
                        ? "border-brand-mint bg-brand-mint/10"
                        : "border-border-default hover:border-brand-mint/50 hover:bg-bg-tertiary"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option.value}
                    checked={answers[currentQuestion.id] === option.value}
                    onChange={() => handleAnswerChange(currentQuestion.id, option.value)}
                    className="w-5 h-5 text-brand-mint"
                  />
                  <span className="ml-3 text-text-primary flex-1">{option.label}</span>
                  <span className="text-text-secondary text-sm">{option.value}/4</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === "scale" && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between text-sm text-text-secondary mb-4">
                <span>{currentQuestion.min ?? 0} (Low)</span>
                <span>{currentQuestion.max ?? 4} (High)</span>
              </div>
              <input
                type="range"
                min={currentQuestion.min ?? 0}
                max={currentQuestion.max ?? 4}
                step={currentQuestion.step ?? 1}
                value={answers[currentQuestion.id] ?? 0}
                onChange={(e) =>
                  handleAnswerChange(currentQuestion.id, parseInt(e.target.value))
                }
                className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-brand-mint"
              />
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-mint">
                  {answers[currentQuestion.id] ?? 0}
                </div>
                <div className="text-text-secondary text-sm mt-2">
                  {currentQuestion.options?.[answers[currentQuestion.id] ?? 0]?.label || "Select a value"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || isSubmitting || isLoading}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all
            ${
              currentQuestionIndex === 0 || isSubmitting || isLoading
                ? "text-text-secondary cursor-not-allowed opacity-50"
                : "text-brand-mint hover:bg-brand-mint/10"
            }
          `}
        >
          Previous
        </button>

        <div className="flex gap-3">
          {/* Show all questions nav (optional) */}
          <div className="hidden md:flex gap-1">
            {Array.from({ length: Math.ceil(totalQuestions / 4) }).map((_, group) => (
              <div key={group} className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => {
                  const questionIndex = group * 4 + i;
                  if (questionIndex >= totalQuestions) return null;
                  return (
                    <button
                      key={questionIndex}
                      onClick={() => setCurrentQuestionIndex(questionIndex)}
                      className={`
                        w-2 h-2 rounded-full transition-all
                        ${
                          answers[FREE_DIAGNOSTIC_QUESTIONS[questionIndex].id] !== undefined
                            ? "bg-brand-mint"
                            : "bg-border-default"
                        }
                        ${questionIndex === currentQuestionIndex ? "w-6" : ""}
                      `}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={
            currentQuestionIndex === totalQuestions - 1 ? handleSubmit : handleNext
          }
          disabled={isSubmitting || isLoading}
          className={`
            px-8 py-3 rounded-lg font-semibold transition-all
            ${
              isSubmitting || isLoading
                ? "bg-bg-tertiary text-text-secondary cursor-not-allowed opacity-50"
                : "bg-brand-mint text-bg-primary hover:bg-brand-mint-hover"
            }
          `}
        >
          {isSubmitting || isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full" />
              {currentQuestionIndex === totalQuestions - 1 ? "Submitting..." : "Next..."}
            </span>
          ) : currentQuestionIndex === totalQuestions - 1 ? (
            "Submit"
          ) : (
            "Next"
          )}
        </button>
      </div>

      {/* Answer Summary */}
      <div className="bg-bg-tertiary rounded-lg p-4 text-sm text-text-secondary">
        <div className="font-medium text-text-primary mb-2">Answered: {Object.keys(answers).length} of {totalQuestions}</div>
        <div className="flex flex-wrap gap-2">
          {FREE_DIAGNOSTIC_QUESTIONS.map((q) => (
            <div
              key={q.id}
              className={`
                w-6 h-6 rounded flex items-center justify-center text-xs font-medium
                ${
                  answers[q.id] !== undefined
                    ? "bg-brand-mint text-bg-primary"
                    : "bg-border-default text-text-secondary"
                }
              `}
            >
              {FREE_DIAGNOSTIC_QUESTIONS.indexOf(q) + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
