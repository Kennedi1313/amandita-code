import { ReactNode } from "react";

export const CheckoutStepCard = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={`my-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 ${className}`}
  >
    {children}
  </section>
);

export const CheckoutStepHeading = ({
  step,
  title,
  description,
  className = "",
}: {
  step: string;
  title: string;
  description: string;
  className?: string;
}) => (
  <div className={`mb-5 ${className}`}>
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
      {step}
    </p>
    <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
    <p className="mt-1 text-sm text-gray-600">{description}</p>
  </div>
);

export const CheckoutStepFooter = ({
  backAction,
  nextAction,
  middleAction,
  className = "",
}: {
  backAction: ReactNode;
  nextAction: ReactNode;
  middleAction?: ReactNode;
  className?: string;
}) => (
  <div
    className={`mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
  >
    {backAction}
    {middleAction}
    {nextAction}
  </div>
);
