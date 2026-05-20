export default function Loading() {
  return (
    <div className="mt-36 md:min-w-screen-lg min-h-screen mx-auto flex flex-col items-center justify-start px-1 md:px-0 py-5 my-2">
      <span className="text-lg font-semibold mb-4">Carregando produtos...</span>
      <div className="w-12 h-12 mb-80 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
