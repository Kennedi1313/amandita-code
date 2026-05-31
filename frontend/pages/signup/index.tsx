import { useAuth } from "../../components/Context/authContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import * as Yup from "yup";
import CreateCustomerForm from "@/components/createCustomerForm";
import { saveCustomer } from "@/lib/client";
import Link from "next/link";

const Signup = () => {
  const { customer, setCustomerFromToken } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [validationSchema] = useState(
    Yup.object({
      name: Yup.string().required("*campo obrigatório"),
      email: Yup.string()
        .email("Email tem um formato inválido")
        .required("*campo obrigatório"),
      password: Yup.string()
        .min(4, "mínimo 4 dígitos")
        .max(15, "máximo 15 dígitos")
        .required("*campo obrigatório"),
      confirmPassword: Yup.string()
        .required("*campo obrigatório")
        .oneOf([Yup.ref("password")], "as senhas precisam ser iguais"),
      cpf: Yup.string().required("*campo obrigatório"),
      phone: Yup.string()
        .transform((value) => value.replace(/\D/g, ""))
        .required("*campo obrigatório")
        .matches(/^\d{11}$/, "telefone deve conter 11 números"),
      zip: Yup.string()
        .transform((value) => value.replace(/\D/g, ""))
        .required("*campo obrigatório")
        .matches(/^\d{8}$/, "CEP deve conter 8 números"),
      city: Yup.string().required("*campo obrigatório"),
      street: Yup.string().required("*campo obrigatório"),
    }),
  );
  const [initialValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    cpf: "",
    phone: "",
    zip: "",
    street: "",
    number: 0,
    district: "",
    city: "",
    reference: "",
  });

  useEffect(() => {
    if (customer) {
      router.push("/account");
    }
    setIsClient(true);
  }, []);

  const onSubmit = (customer: any) => {
    saveCustomer(customer)
      .then((res) => {
        toast.success(`${customer.name} foi salvo com sucesso.`);
        const token = (res.headers["authorization"] || res.data?.token || "")
          .replace(/^Bearer\s+/i, "")
          .trim();
        localStorage.setItem("access_token", token);
        setCustomerFromToken();
        router.push("/checkout");
      })
      .catch((err) => {
        toast.error(err.response.data.message);
      });
  };

  return (
    <>
      {isClient ? (
        <div className="md:container xl:max-w-screen-xl mx-auto p-2 py-6 md:px-6 md:py-12 mt-20 md:mt-[8.5rem] min-h-[40vh]">
          <div className="mb-6 rounded-md border border-gray-100 bg-white p-5">
            <p className="text-sm uppercase tracking-wide text-gray-500">
              Cadastro
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold">
              Crie sua conta para comprar
            </h2>
            <p className="mt-2 text-base md:text-lg text-gray-600">
              Esses dados ajudam a loja a confirmar contato, entrega e pagamento.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-flex font-semibold text-black-1000 underline"
            >
              Já tenho conta
            </Link>
          </div>
          <CreateCustomerForm
            onSubmit={onSubmit}
            initialValues={initialValues}
            validationSchema={validationSchema}
            newCustomer={true}
          />
        </div>
      ) : (
        ""
      )}
    </>
  );
};

export default Signup;
