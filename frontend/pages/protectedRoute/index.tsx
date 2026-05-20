import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/Context/authContext";

export default function ProtectedRoute(Component: any) {
  return function IsAuth(props: any) {
    const { isCustomerAuthenticated } = useAuth();
    console.log(isCustomerAuthenticated());
    const router = useRouter();
    useEffect(() => {
      if (!isCustomerAuthenticated()) {
        router.push("/login");
      }
    });

    if (!isCustomerAuthenticated()) {
      return <div>Carregando...</div>;
    }

    return <Component {...props} />;
  };
}
