import { getTotalSteps } from '@openclaw/panguard-web';

interface StepProgressProps {
  currentStep: number;
}

export default function StepProgress({ currentStep }: StepProgressProps) {
  const total = getTotalSteps();

  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step === currentStep
                ? 'bg-brand-cyan text-brand-dark'
                : step < currentStep
                  ? 'bg-brand-cyan/20 text-brand-cyan'
                  : 'bg-brand-card text-brand-muted'
            }`}
          >
            {step < currentStep ? '\u2713' : step}
          </div>
          {step < total && (
            <div
              className={`h-0.5 w-6 transition-all ${
                step < currentStep ? 'bg-brand-cyan/40' : 'bg-brand-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
