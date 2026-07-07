export function isStepEntry(params: {
  previousStep: string | null;
  currentStep: string;
  targetStep: string;
}): boolean {
  return params.currentStep === params.targetStep && params.previousStep !== params.targetStep;
}
