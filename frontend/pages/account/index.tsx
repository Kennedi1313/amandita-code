import { useAuth } from "@/components/Context/authContext";
import ProtectedRoute from "../protectedRoute";
import { useEffect, useState } from "react";
import * as Yup from "yup";
import { getCustomerByEmail, updateCustomer } from "@/lib/client";
import toast from "react-hot-toast";
import { CustomerForm } from "@/types/CustomerTypes";
import CreateCustomerForm from "@/components/createCustomerForm";
import {
  FiCreditCard,
  FiEdit2,
  FiLogOut,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUser,
  FiX,
} from "react-icons/fi";
import Loading from "@/components/loading";
import { getApiBaseUrl } from "@/lib/productClient";
import { useRouter } from "next/router";

const Account = () => {
  const { customer, logOut } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [validationSchema] = useState(
    Yup.object({
      name: Yup.string().required("Obrigatório"),
      email: Yup.string()
        .email("Email tem um formato inválido")
        .required("Obrigatório"),
      cpf: Yup.string().required("Obrigatório"),
      phone: Yup.string().required("Obrigatório"),
      zip: Yup.string().required("Obrigatório"),
      street: Yup.string().required("Obrigatório"),
      number: Yup.number().min(1, "Obrigatório").required("Obrigatório"),
      district: Yup.string().required("Obrigatório"),
      city: Yup.string().required("Obrigatório"),
    }),
  );
  const [initialValues, setInitialValues] = useState<CustomerForm>({
    id: 0,
    name: "",
    email: "",
    cpf: "",
    phone: "",
    zip: "",
    street: "",
    number: 0,
    district: "",
    city: "",
    reference: "",
  });
  const redirectAfterOnboarding =
    typeof router.query.redirect === "string" &&
    router.query.redirect.startsWith("/") &&
    !router.query.redirect.startsWith("//")
      ? router.query.redirect
      : "/account";
  const fetchCustomers = () => {
    if (!customer?.username) {
      return;
    }
    getCustomerByEmail(customer.username)
      .then((res: any) => {
        const values = res.data;
        if (values.addresses.length > 0) {
          setInitialValues({
            id: values.id,
            name: values.name,
            email: values.email,
            cpf: values.cpf,
            phone: values.phone,
            zip: values.addresses[0].zip,
            street: values.addresses[0].street,
            number: values.addresses[0].number,
            district: values.addresses[0].district,
            city: values.addresses[0].city,
            reference: values.addresses[0].reference,
          });
        } else {
          setInitialValues({
            id: values.id,
            name: values.name,
            email: values.email,
            cpf: values.cpf,
            phone: values.phone,
            zip: "",
            street: "",
            number: 0,
            district: "",
            city: "",
            reference: "",
          });
        }
      })
      .catch((err) => {
        (console.log(err), toast(err.code, err));
      });
  };

  const onSubmit = (values: any) => {
    const customerId = initialValues.id;
    const updateRequest = {
      name: values.name,
      email: values.email,
      age: 18,
      role: null,
      cpf: values.cpf,
      phone: values.phone,
      zip: values.zip,
      street: values.street,
      number: values.number,
      district: values.district,
      city: values.city,
      reference: values.reference,
    };
    updateCustomer(customerId, updateRequest)
      .then((resp) => {
        setInitialValues(values);
        setIsEditing(false);
        toast.success("Dados atualizados com sucesso!");
        if (router.query.redirect) {
          router.push(redirectAfterOnboarding);
        }
      })
      .catch((err) => {
        toast.error("Erro ao atualizar os dados.");
      });
  };

  useEffect(() => {
    if (customer?.username) {
      fetchCustomers();
    }
  }, [customer?.username]);

  if (initialValues.name === "") {
    return <Loading />;
  }

  const handleLogOut = () => {
    logOut();
    router.push("/login");
  };

  const addressLabel = [
    initialValues.street,
    initialValues.number ? String(initialValues.number) : "",
    initialValues.district,
    initialValues.city,
  ]
    .filter(Boolean)
    .join(", ");

  const profileFields = [
    initialValues.name,
    initialValues.email,
    initialValues.cpf,
    initialValues.phone,
    initialValues.zip,
    initialValues.street,
    initialValues.number,
    initialValues.district,
    initialValues.city,
  ];
  const completedFields = profileFields.filter(Boolean).length;
  const profileComplete = completedFields === profileFields.length;

  return (
    <div className="mt-16 min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-8 md:mt-28 md:px-6 md:py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-xl font-semibold text-white">
              <span>{initialValues.name.charAt(0).toUpperCase()}</span>
              {initialValues.id && (
                <img
                  src={`${getApiBaseUrl()}/customers/${initialValues.id}/profile-image`}
                  alt=""
                  className="absolute inset-0 h-full w-full rounded-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-gray-500">
                Minha conta
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
                Olá, {initialValues.name.split(" ")[0]}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie seus dados e preferências de entrega.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-800 sm:w-fit"
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? <FiX /> : <FiEdit2 />}
              {isEditing ? "Cancelar edição" : "Editar dados"}
            </button>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-fit"
              onClick={handleLogOut}
            >
              <FiLogOut />
              Sair da conta
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Perfil</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Informações usadas para identificar e entregar seus pedidos.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${profileComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
              >
                {profileComplete ? "Completo" : "Pendente"}
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <FiUser className="mt-1 text-xl" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Nome
                  </p>
                  <p className="font-semibold">{initialValues.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FiMail className="mt-1 text-xl" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Email
                  </p>
                  <p className="font-semibold break-all">
                    {initialValues.email}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FiCreditCard className="mt-1 text-xl" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    CPF
                  </p>
                  <p className="font-semibold">
                    {initialValues.cpf || "Não informado"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FiPhone className="mt-1 text-xl" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    WhatsApp
                  </p>
                  <p className="font-semibold">
                    {initialValues.phone || "Não informado"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Cadastro
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-950">
              {completedFields}/{profileFields.length}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              informações preenchidas
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-900 transition-all"
                style={{
                  width: `${(completedFields / profileFields.length) * 100}%`,
                }}
              />
            </div>
            <p className="mt-4 text-sm leading-5 text-gray-500">
              {profileComplete
                ? "Tudo pronto para suas próximas compras."
                : "Complete seu perfil para finalizar pedidos com mais rapidez."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <FiMapPin className="mt-1 text-xl" />
            <div>
              <h2 className="text-lg font-bold text-gray-950">
                Endereço de entrega
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Seu endereço principal para receber os pedidos.
              </p>
              <p className="mt-4 font-semibold text-gray-800">
                {addressLabel || "Nenhum endereço cadastrado"}
              </p>
              {initialValues.zip && (
                <p className="mt-1 text-sm text-gray-500">
                  CEP {initialValues.zip}
                </p>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6">
            <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl md:max-w-3xl md:rounded-2xl md:p-5">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-950">
                    Editar informações
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Mantenha seus dados atualizados para agilizar a finalização
                    dos pedidos.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Fechar edição"
                  onClick={() => setIsEditing(false)}
                >
                  <FiX className="text-xl" />
                </button>
              </div>
              <CreateCustomerForm
                onSubmit={onSubmit}
                initialValues={initialValues}
                validationSchema={validationSchema}
                newCustomer={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProtectedRoute(Account);
