import { useAuth } from "@/components/Context/authContext";
import ProtectedRoute from "../protectedRoute";
import { useEffect, useState } from "react";
import * as Yup from "yup";
import { getCustomerByEmail, updateCustomer } from "@/lib/client";
import toast from "react-hot-toast";
import { CustomerForm } from "@/types/CustomerTypes";
import CreateCustomerForm from "@/components/createCustomerForm";
import { FiCreditCard, FiEdit2, FiLogOut, FiMail, FiMapPin, FiPhone, FiUser, FiX } from "react-icons/fi";
import Loading from "@/components/loading";
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

  return (
    <div className="md:container xl:max-w-screen-xl mx-auto px-4 py-6 md:px-6 md:py-12 mt-16 md:mt-28 min-h-[40vh]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-950">
              Minha conta
            </h1>
            <p className="mt-2 text-base md:text-lg text-gray-600">
              Consulte seus dados e edite somente quando precisar.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <button
              className="w-full md:w-fit flex items-center justify-center gap-2 rounded-md px-4 py-3 bg-black-1000 text-white font-semibold"
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? <FiX /> : <FiEdit2 />}
              {isEditing ? "Cancelar edição" : "Editar dados"}
            </button>
            <button
              className="w-full md:w-fit flex items-center justify-center gap-2 rounded-md px-4 py-3 border border-gray-200 text-black-1000 font-semibold"
              onClick={handleLogOut}
            >
              <FiLogOut />
              Sair da conta
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-md border border-gray-100 p-4 flex gap-3 items-start">
            <FiUser className="mt-1 text-xl" />
            <div>
              <p className="text-xs uppercase text-gray-500">Nome</p>
              <p className="font-semibold">{initialValues.name}</p>
            </div>
          </div>
          <div className="bg-white rounded-md border border-gray-100 p-4 flex gap-3 items-start">
            <FiMail className="mt-1 text-xl" />
            <div>
              <p className="text-xs uppercase text-gray-500">Email</p>
              <p className="font-semibold break-all">{initialValues.email}</p>
            </div>
          </div>
          <div className="bg-white rounded-md border border-gray-100 p-4 flex gap-3 items-start">
            <FiCreditCard className="mt-1 text-xl" />
            <div>
              <p className="text-xs uppercase text-gray-500">CPF</p>
              <p className="font-semibold">
                {initialValues.cpf || "Não informado"}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-md border border-gray-100 p-4 flex gap-3 items-start">
            <FiPhone className="mt-1 text-xl" />
            <div>
              <p className="text-xs uppercase text-gray-500">WhatsApp</p>
              <p className="font-semibold">
                {initialValues.phone || "Não informado"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md border border-gray-100 p-4 flex gap-3 items-start">
          <FiMapPin className="mt-1 text-xl" />
          <div>
            <p className="text-xs uppercase text-gray-500">
              Endereço de entrega
            </p>
            <p className="font-semibold">
              {addressLabel || "Nenhum endereço cadastrado"}
            </p>
            {initialValues.zip && (
              <p className="text-sm text-gray-500">CEP {initialValues.zip}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="border-t border-gray-100 pt-2">
            <CreateCustomerForm
              onSubmit={onSubmit}
              initialValues={initialValues}
              validationSchema={validationSchema}
              newCustomer={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProtectedRoute(Account);
