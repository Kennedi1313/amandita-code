import { useEffect } from "react";
import ProtectedRoute from "../protectedRoute";
import { useRouter } from "next/navigation";

const Pending = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/checkout");
  }, [router]);

  return (
    <main className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[40vh]">
      <h1 className="text-3xl md:text-4xl font-semibold text-gray-950">
        Redirecionando
      </h1>
      <p className="mt-2 text-base md:text-lg text-gray-600">
        Vamos voltar para o checkout para continuar sua compra.
      </p>
    </main>
  );
};

export default ProtectedRoute(Pending);
