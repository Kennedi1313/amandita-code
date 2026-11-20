interface SpinnerProps {
  label?: string;
  className?: string;
}

export default function Spinner({
  label = "Carregando",
  className = "h-4 w-4",
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-2"
    >
      <span
        aria-hidden="true"
        className={`${className} animate-spin rounded-full border-2 border-current border-r-transparent`}
      />
    </span>
  );
}
