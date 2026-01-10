import { useAuth } from "@/components/Context/authContext";
import ProtectedRoute from "../protectedRoute"
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import { getCustomerByEmail, updateCustomer } from "@/lib/client";
import toast from "react-hot-toast";
import { CustomerForm } from "@/types/CustomerTypes";
import CreateCustomerForm from "@/components/createCustomerForm";
import { FiUser } from "react-icons/fi";
  
const Account = () => {
    const { customer } = useAuth();
    const [validationSchema] = useState(Yup.object({
        name: Yup.string().required('Obrigatório'),
        email: Yup.string().email("Email tem um formato inválido").required('Obrigatório'),
        cpf: Yup.string().required('Obrigatório'),
        phone: Yup.string().required('Obrigatório')
    }))
    const [initialValues, setInitialValues] = useState<CustomerForm>({id: 0, name: '', email: '', cpf: '', phone: '', zip: '', street: '', number: 0, district: '', city: '', reference: ''});
    const fetchCustomers = () => {
        getCustomerByEmail(customer.username).then((res: any) => {
            const values = res.data;
            if(values.addresses.length > 0) {
                setInitialValues({ id: values.id, name: values.name, email: values.email, cpf: values.cpf, phone: values.phone, zip: values.addresses[0].zip, street: values.addresses[0].street, number: values.addresses[0].number, district: values.addresses[0].district, city: values.addresses[0].city, reference: values.addresses[0].reference})
            } else {
                setInitialValues({ id: values.id, name: values.name, email: values.email, cpf: values.cpf, phone: values.phone, zip: "", street: "", number: 0, district: "", city: "", reference: ""})
            }

        }).catch(err => { console.log(err) , toast(err.code, err) })
    }

    const onSubmit = (values: any) => {
        const customerId = initialValues.id; 
        const updateRequest = {name: values.name, email: values.email, age: null, role: null, cpf: values.cpf, phone: values.phone, zip: values.zip, street: values.street, number: values.number, district: values.district, city: values.city, reference: values.reference}
        updateCustomer(customerId, updateRequest).then(resp => {
            toast.success("Dados atualizados com sucesso!");
        }).catch(err => {toast.error("Erro ao atualizar os dados.")})
    }

    useEffect(() => {
        fetchCustomers();
    }, []);

    if (initialValues.name === '') {
        return <span>Carregando dados...</span>;
    }

    return (
        <div className="md:container xl:max-w-screen-xl mx-auto py-12 p-2 md:px-6 mt-28 min-h-[40vh]">
            <h2 className="text-4xl font-semibold">Seu Perfil</h2>  
            <p className="mt-1 text-xl">
                Edite informações de nome e endereço</p>
            <CreateCustomerForm onSubmit={onSubmit} initialValues={initialValues} validationSchema={validationSchema} newCustomer={false} />     
        </div>  
    );
};

export default ProtectedRoute(Account);
