import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../components/Context/authContext";

export default function ProtectedRoute(Component: any) {
  return function IsAuth(props: any) {
    const { isCustomerAuthenticated } = useAuth();
    const router = useRouter();
    const isAuthenticated = isCustomerAuthenticated();

    useEffect(() => {
      if (!isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
      return <div>Carregando...</div>;
    }

    return <Component {...props} />;
  };
}
