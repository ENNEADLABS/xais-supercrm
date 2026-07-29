"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "./ProgressBar";
import { StepWelcome } from "./StepWelcome";
import { StepCompanyInfo } from "./StepCompanyInfo";
import { StepCommercialConfig } from "./StepCommercialConfig";
import { StepComplete } from "./StepComplete";

const STEPS = ["welcome", "company", "commercial", "complete"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const router = useRouter();

  const stepIndex = STEPS.indexOf(currentStep);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev);
  }

  function handleComplete() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <ProgressBar stepIndex={stepIndex} totalSteps={STEPS.length} />

      {currentStep === "welcome" && <StepWelcome onNext={goNext} />}
      {currentStep === "company" && (
        <StepCompanyInfo onNext={goNext} onSkip={goNext} onBack={goBack} />
      )}
      {currentStep === "commercial" && (
        <StepCommercialConfig onNext={goNext} onSkip={goNext} onBack={goBack} />
      )}
      {currentStep === "complete" && <StepComplete onComplete={handleComplete} />}
    </div>
  );
}
