import Spinner from "@/components/spinner";

export default function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-7xl flex-col items-center justify-center gap-3 px-4 py-10 text-sm text-gray-600"
    >
      <Spinner label={label} className="h-7 w-7 border-4 text-gray-800" />
      <span>{label}</span>
    </div>
  );
}
