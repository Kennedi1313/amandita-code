import { useAuth } from "@/components/Context/authContext";
import ProtectedRoute from "../protectedRoute";
import { useCallback, useEffect, useState } from "react";
import * as Yup from "yup";
import { Form, Formik, useFormikContext } from "formik";
import {
  findAddressByCep,
  getCustomerByEmail,
  updateCustomer,
} from "@/lib/client";
import toast from "react-hot-toast";
import { CustomerForm } from "@/types/CustomerTypes";
import {
  FiCreditCard,
  FiChevronRight,
  FiLogOut,
  FiLock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
  FiX,
  FiUser,
} from "react-icons/fi";
import Loading from "@/components/loading";
import Spinner from "@/components/spinner";
import { getApiBaseUrl } from "@/lib/productClient";
import { cepMask, cpfMask, phoneMask } from "@/lib/utils";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";
import { TextInput } from "@/components/textInput";
import type { ChangeEvent, FocusEvent } from "react";

type AccountSection = "profile" | "address";

const profileValidationSchema = Yup.object({
  name: Yup.string().trim().required("Informe seu nome."),
  cpf: Yup.string()
    .transform((value) => value.replace(/\D/g, ""))
    .required("Informe seu CPF.")
    .matches(/^\d{11}$/, "Digite os 11 números do CPF."),
  phone: Yup.string()
    .transform((value) => value.replace(/\D/g, ""))
    .required("Informe seu telefone com DDD.")
    .matches(/^\d{10,11}$/, "Digite um telefone válido com DDD."),
});

const addressValidationSchema = Yup.object({
  zip: Yup.string()
    .transform((value) => value.replace(/\D/g, ""))
    .required("Informe o CEP.")
    .matches(/^\d{8}$/, "Digite os 8 números do CEP."),
  street: Yup.string().trim().required("Informe a rua ou avenida."),
  number: Yup.number()
    .typeError("Informe um número válido.")
    .min(1, "Informe o número do endereço.")
    .required("Informe o número do endereço."),
  district: Yup.string().trim().required("Informe o bairro."),
  city: Yup.string().trim().required("Informe a cidade."),
  state: Yup.string()
    .trim()
    .length(2, "Use a sigla do estado.")
    .required("Informe o estado."),
  reference: Yup.string(),
});

const AccountAddressFields = () => {
  const { values, setFieldValue, handleBlur } =
    useFormikContext<CustomerForm>();
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);

  const lookupAddress = async (event: FocusEvent<HTMLInputElement>) => {
    handleBlur(event);
    const zip = values.zip.replace(/\D/g, "");
    if (zip.length !== 8) return;

    setIsLookingUpCep(true);
    try {
      const response = await findAddressByCep(zip);
      if (response.data.erro) {
        toast.error("Não encontramos esse CEP. Confira os números.");
        return;
      }
      setFieldValue("street", response.data.logradouro || values.street);
      setFieldValue("district", response.data.bairro || values.district);
      setFieldValue("city", response.data.localidade || values.city);
      setFieldValue("state", response.data.uf || values.state);
    } catch {
      toast.error(
        "Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.",
      );
    } finally {
      setIsLookingUpCep(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <div className="relative">
          <TextInput
            label="CEP"
            name="zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            placeholder="00000-000"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFieldValue("zip", cepMask(event.target.value))
            }
            onBlur={lookupAddress}
          />
          {isLookingUpCep && (
            <span className="absolute bottom-3 right-3">
              <Spinner label="Consultando CEP" />
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Ao sair do campo, buscamos rua, bairro e cidade para ajudar no
          preenchimento.
        </p>
      </div>
      <TextInput
        label="Rua ou avenida"
        name="street"
        autoComplete="address-line1"
      />
      <TextInput
        label="Número"
        name="number"
        type="number"
        min="1"
        inputMode="numeric"
      />
      <TextInput label="Bairro" name="district" autoComplete="address-level3" />
      <TextInput label="Cidade" name="city" autoComplete="address-level2" />
      <TextInput
        label="Estado (UF)"
        name="state"
        maxLength={2}
        autoComplete="address-level1"
      />
      <div className="sm:col-span-2">
        <TextInput
          label="Complemento ou ponto de referência (opcional)"
          name="reference"
          autoComplete="address-line2"
        />
      </div>
    </div>
  );
};

const Account = () => {
  const { customer, logOut } = useAuth();
  const router = useRouter();
  const [activeEditor, setActiveEditor] = useState<AccountSection | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState("");
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
    state: "",
    reference: "",
  });
  const redirectAfterOnboarding =
    typeof router.query.redirect === "string" &&
    router.query.redirect.startsWith("/") &&
    !router.query.redirect.startsWith("//")
      ? router.query.redirect
      : "/account";
  const fetchCustomers = useCallback(() => {
    if (!customer?.username) {
      return;
    }
    setProfileLoading(true);
    setProfileLoadError("");
    getCustomerByEmail(customer.username)
      .then((res: any) => {
        const values = res.data;
        const savedAddress = values.addresses?.[0];
        if (savedAddress) {
          setInitialValues({
            id: values.id,
            name: values.name,
            email: values.email,
            cpf: values.cpf,
            phone: values.phone,
            zip: savedAddress.zip || "",
            street: savedAddress.street || "",
            number: savedAddress.number || 0,
            district: savedAddress.district || "",
            city: savedAddress.city || "",
            state: savedAddress.state || "",
            reference: savedAddress.reference || "",
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
            state: "",
            reference: "",
          });
        }
      })
      .catch((err) => {
        setProfileLoadError(
          err.response?.data?.message ||
            "Não foi possível carregar seu perfil. Tente novamente.",
        );
        toast.error("Não foi possível carregar seu perfil.");
      })
      .finally(() => {
        setProfileLoading(false);
      });
  }, [customer?.username]);

  const onSubmit = async (values: CustomerForm) => {
    const mergedValues = { ...initialValues, ...values };
    const updateRequest = {
      name: mergedValues.name,
      email: mergedValues.email,
      age: 18,
      role: null,
      cpf: mergedValues.cpf,
      phone: mergedValues.phone,
      zip: mergedValues.zip,
      street: mergedValues.street,
      number: mergedValues.number,
      district: mergedValues.district,
      city: mergedValues.city,
      state: mergedValues.state,
      reference: mergedValues.reference,
    };

    try {
      await updateCustomer(initialValues.id, updateRequest);
      setInitialValues(mergedValues);
      setActiveEditor(null);
      toast.success(
        activeEditor === "profile"
          ? "Dados do perfil atualizados."
          : "Endereço atualizado.",
      );
      const hasCompleteCheckoutProfile = [
        mergedValues.name,
        mergedValues.email,
        mergedValues.cpf,
        mergedValues.phone,
        mergedValues.zip,
        mergedValues.street,
        mergedValues.number,
        mergedValues.district,
        mergedValues.city,
        mergedValues.state,
      ].every(Boolean);
      if (router.query.redirect && hasCompleteCheckoutProfile) {
        router.push(redirectAfterOnboarding);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Não foi possível salvar as alterações.",
      );
      throw error;
    }
  };

  useEffect(() => {
    if (customer?.username) {
      fetchCustomers();
    }
  }, [customer?.username, fetchCustomers]);

  if (profileLoading) {
    return <Loading />;
  }

  if (profileLoadError) {
    return (
      <main className="mt-16 flex min-h-[70vh] items-center justify-center px-4 md:mt-28">
        <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-950">
            Não foi possível abrir seu perfil
          </h1>
          <p className="mt-2 text-sm text-gray-600">{profileLoadError}</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={fetchCustomers}
              className="min-h-11 rounded-lg bg-gray-950 px-4 font-semibold text-white"
            >
              Tentar novamente
            </button>
            <Link
              href={redirectAfterOnboarding}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-4 font-semibold text-gray-800"
            >
              Voltar à compra
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const handleLogOut = () => {
    logOut();
    router.push("/login");
  };

  const profileFields = [
    initialValues.name,
    initialValues.email,
    initialValues.cpf,
    initialValues.phone,
  ];
  const addressFields = [
    initialValues.zip,
    initialValues.street,
    initialValues.number,
    initialValues.district,
    initialValues.city,
    initialValues.state,
  ];
  const completedFields = [...profileFields, ...addressFields].filter(
    Boolean,
  ).length;
  const totalFields = profileFields.length + addressFields.length;
  const profileComplete = profileFields.every(Boolean);
  const addressComplete = addressFields.every(Boolean);
  const checkoutProfileComplete = [
    initialValues.name,
    initialValues.email,
    initialValues.cpf,
    initialValues.phone,
    initialValues.zip,
    initialValues.street,
    initialValues.number,
    initialValues.district,
    initialValues.city,
    initialValues.state,
  ].every(Boolean);
  const addressLines = [
    [
      initialValues.street,
      initialValues.number ? String(initialValues.number) : "",
    ]
      .filter(Boolean)
      .join(", "),
    initialValues.district,
    [initialValues.city, initialValues.state].filter(Boolean).join(" / "),
  ].filter(Boolean);

  return (
    <div className="mt-16 min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-8 md:mt-28 md:px-6 md:py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-xl font-semibold text-white">
              <span>{initialValues.name.charAt(0).toUpperCase()}</span>
              {initialValues.id && (
                <Image
                  src={`${getApiBaseUrl()}/customers/${initialValues.id}/profile-image`}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
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
              type="button"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-gray-800 transition hover:bg-gray-50 sm:w-fit"
              onClick={() => router.push("/sales")}
            >
              <FiShoppingBag />
              Meus pedidos
            </button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 sm:w-fit"
              onClick={handleLogOut}
            >
              <FiLogOut />
              Sair da conta
            </button>
          </div>
        </div>

        {router.query.redirect && !checkoutProfileComplete && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
            Complete seus dados e endereço para continuar a compra. Você volta
            ao checkout quando tudo estiver preenchido.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <FiUser aria-hidden="true" className="text-lg" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-950 flex gap-4">
                    Perfil
                    <span
                      className={`rounded-full px-3 h-fit py-1 text-xs font-semibold ${profileComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {profileComplete ? "Completo" : "Pendente"}
                    </span>
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Dados para identificar você e confirmar seus pedidos.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  aria-label="Editar perfil"
                  onClick={() => setActiveEditor("profile")}
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-950"
                >
                  Editar
                </button>
              </div>
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
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Seu cadastro
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-950">
              {completedFields}/{totalFields}
            </p>
            <p className="mt-1 text-sm text-gray-600">dados preenchidos</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-900 transition-all"
                style={{
                  width: `${(completedFields / totalFields) * 100}%`,
                }}
              />
            </div>
            <p className="mt-4 text-sm leading-5 text-gray-500">
              {completedFields === totalFields
                ? "Tudo pronto para suas próximas compras."
                : "Complete seus dados e endereço para agilizar as próximas compras."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <FiMapPin aria-hidden="true" className="text-lg" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-950 flex gap-4">
                  Endereço
                  <span
                    className={`rounded-full px-3 h-fit py-1 text-xs font-semibold ${addressComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {addressComplete ? "Completo" : "Pendente"}
                  </span>
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Usado como endereço principal nas suas compras.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                type="button"
                aria-label="Editar endereço de entrega"
                onClick={() => setActiveEditor("address")}
                className="inline-flex min-h-10 items-center text-sm font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-950"
              >
                Editar
              </button>
            </div>
          </div>
          <div className="mt-5 rounded-xl">
            {addressComplete ? (
              <>
                <p className="font-semibold leading-6 text-gray-900">
                  {addressLines[0]}
                </p>
                <p className="mt-1 text-sm leading-5 text-gray-600">
                  {addressLines.slice(1).join(" · ")}
                </p>
                {initialValues.reference && (
                  <p className="mt-2 text-sm text-gray-500">
                    Referência: {initialValues.reference}
                  </p>
                )}
                <p className="mt-3 font-medium uppercase tracking-wide text-gray-500">
                  CEP {initialValues.zip}
                </p>
              </>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-5 text-gray-600">
                  {initialValues.zip || initialValues.street
                    ? "Complete os dados que faltam para usar este endereço nas entregas."
                    : "Cadastre seu endereço para agilizar as próximas compras."}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveEditor("address")}
                  className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-gray-800 underline decoration-gray-300 underline-offset-4"
                >
                  Cadastrar endereço
                </button>
              </div>
            )}
          </div>
        </div>

        {activeEditor && (
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setActiveEditor(null);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-editor-title"
              className="md:max-h-fit h-full w-full overflow-y-auto bg-white shadow-2xl md:max-w-2xl md:rounded-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-4 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Minha conta
                  </p>
                  <h2
                    id="account-editor-title"
                    className="mt-1 text-xl font-bold text-gray-950"
                  >
                    {activeEditor === "profile"
                      ? "Editar perfil"
                      : "Editar endereço"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {activeEditor === "profile"
                      ? "Atualize seus dados de contato e identificação."
                      : "Mantenha o endereço principal de entrega atualizado."}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-950"
                  aria-label="Fechar edição"
                  onClick={() => setActiveEditor(null)}
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <Formik<CustomerForm>
                key={activeEditor}
                initialValues={initialValues}
                validationSchema={
                  activeEditor === "profile"
                    ? profileValidationSchema
                    : addressValidationSchema
                }
                onSubmit={onSubmit}
              >
                {({ isSubmitting, setFieldValue }) => (
                  <Form className="flex flex-col h-full">
                    <div className="flex flex-col gap-4 px-5 py-5 sm:px-7 sm:py-6 h-full">
                      {activeEditor === "profile" ? (
                        <>
                          <div className="sm:col-span-2">
                            <TextInput
                              label="Nome completo"
                              name="name"
                              autoComplete="name"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <TextInput
                              label="E-mail da conta"
                              name="email"
                              type="email"
                              autoComplete="email"
                              disabled
                            />
                            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                              <FiLock aria-hidden="true" />O e-mail é usado para
                              entrar na conta e não pode ser alterado aqui.
                            </p>
                          </div>
                          <TextInput
                            label="CPF"
                            name="cpf"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={14}
                            placeholder="000.000.000-00"
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              setFieldValue("cpf", cpfMask(event.target.value))
                            }
                          />
                          <TextInput
                            label="Telefone com DDD"
                            name="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            maxLength={15}
                            placeholder="(00) 00000-0000"
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              setFieldValue(
                                "phone",
                                phoneMask(event.target.value),
                              )
                            }
                          />
                        </>
                      ) : (
                        <div className="sm:col-span-2">
                          <AccountAddressFields />
                        </div>
                      )}
                    </div>

                    <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting && (
                          <Spinner label="Salvando alterações" />
                        )}
                        {isSubmitting ? "Salvando..." : "Salvar alterações"}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProtectedRoute(Account);
