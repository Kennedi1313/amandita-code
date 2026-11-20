type CheckoutStepperProps = {
  currentStep: 1 | 2 | 3;
  onStepChange?: (step: 1 | 2 | 3) => void;
};

const steps = ["Contato", "Entrega", "Pagamento"];

const CheckoutStepper = ({
  currentStep,
  onStepChange,
}: CheckoutStepperProps) => (
  <nav aria-label="Etapas da compra" className="w-full">
    <ol className="grid grid-cols-3">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <li
            key={step}
            className={`relative flex flex-col items-center gap-2 text-center text-xs sm:text-sm ${
              stepNumber < steps.length
                ? "after:absolute after:left-1/2 after:top-4 after:h-px after:w-full after:bg-gray-200 after:content-['']"
                : ""
            }`}
          >
            <button
              type="button"
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`${stepNumber}. ${step}${isComplete ? ", etapa concluída, voltar para editar" : ""}`}
              disabled={!onStepChange || stepNumber > currentStep}
              onClick={() => onStepChange?.(stepNumber as 1 | 2 | 3)}
              className="relative z-10 flex flex-col items-center gap-2 disabled:cursor-default"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                  isComplete || isCurrent
                    ? "border-gray-950 bg-gray-950 text-white"
                    : "border-gray-300 bg-white text-gray-500"
                }`}
              >
                {isComplete ? "✓" : stepNumber}
              </span>
              <span
                className={
                  isCurrent
                    ? "font-semibold text-gray-950"
                    : isComplete
                      ? "font-medium text-gray-700"
                      : "text-gray-500"
                }
              >
                {step}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

export default CheckoutStepper;
