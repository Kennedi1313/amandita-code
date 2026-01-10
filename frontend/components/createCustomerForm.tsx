import {Form, Formik} from 'formik';
import {findAddressByCep} from "../lib/client";
import { toast } from 'react-hot-toast';
import { cepMask, cpfMask, phoneMask } from '@/lib/utils';
import Link from 'next/link';
import { BsArrowLeft, BsArrowRight } from 'react-icons/bs';
import { AxiosError } from 'axios';
import { TextInput } from './textInput';
import { useAuth } from './Context/authContext';
import { FiTruck, FiUser } from 'react-icons/fi';

const CreateCustomerForm = ({ onSubmit, initialValues, validationSchema, newCustomer } : any) => {
    const { logOut } = useAuth();
    const getAddress = (cep: string, e: any, setFieldValue: any) => {
        e.preventDefault()
        findAddressByCep(cep).then( res => {
            if (res.data.erro) 
                console.log(res.data.erro)
            setFieldValue("street", res.data.logradouro);
            setFieldValue("district", res.data.bairro);
            setFieldValue("city", res.data.localidade);
        }).catch(err => {})}
    return (
        <>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={(customer) => {onSubmit(customer)}}>
                {({isValid, values, setFieldValue}) => (
                    <Form className="mx-auto flex flex-col gap-2 md:px-0 py-5 my-2">
                        <div className='flex flex-col md:flex-row align-top w-full justify-around gap-4'>
                            <div className='mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl px-4 py-6'>
                                <h1 className='text-2xl font-semibold mb-4 flex gap-2'><FiUser></FiUser> Informações Pessoais</h1>
                                <TextInput label="Nome" name="name" type="text" />
                                <TextInput label="Email" name="email" type="email" disabled={!newCustomer} />
                                <TextInput label="Senha" name="password" type="password" hidden={!newCustomer} placeholder={"Escolha uma senha segura"} />
                                <TextInput label="Confirme sua senha" name="confirmPassword" type="password" hidden={!newCustomer} placeholder={"Reescreva sua senha"} />
                                <TextInput label="CPF" name="cpf" type="text" disabled={!newCustomer}
                                    onChange = {(e: any) => setFieldValue("cpf", cpfMask(e.target.value))} />
                                <TextInput label="Telefone para contato (Whatsapp)" name="phone" type="text"
                                    onChange = {(e: any) => setFieldValue("phone", phoneMask(e.target.value))} />
                            </div>
                            <div className='mx-auto flex flex-col gap-2 md:py-5 my-2 w-full bg-white rounded-2xl px-4 py-6'>
                                <h1 className='text-2xl font-semibold my-4 flex gap-2'><FiTruck></FiTruck> Endereço Para Entrega</h1>
                                <TextInput label="CEP (somente os números)" name="zip" type="text"
                                    onChange = {(e: any) => setFieldValue("zip", cepMask(e.target.value))} 
                                    onBlur={(e: any) => getAddress(values.zip, e, setFieldValue)}/>
                                <TextInput label="Rua" name="street" type="text" />
                                <TextInput label="Número" name="number" type="number" />
                                <TextInput label="Bairro" name="district" type="text" />
                                <TextInput label="Cidade" name="city" type="text" />
                                <TextInput label="Ponto de referência" name="reference" type="text" />
                            </div>
                        </div>
                        {
                            newCustomer ? 
                            <div className='flex md:flex-row flex-col gap-4 md:p-0 mt-5'>
                                <Link className="flex gap-2 text-center justify-center rounded-md px-2 py-4 bg-blue-500 text-white font-bold md:w-1/2" href={"/login"}>
                                    <BsArrowLeft className='text-2xl font-bold'/>
                                    Já possui uma conta? Faça login aqui
                                </Link>
                                <button 
                                    className="flex flex-row justify-center gap-2 rounded-md px-2 py-4 bg-green-500 text-white font-bold md:w-1/2"
                                    type="submit">
                                        Cadastrar novo usuário
                                        <BsArrowRight className='text-2xl font-bold'/>
                                </button>
                            </div>
                            :
                            <div className="flex flex-row gap-2">
                                <button type="submit"
                                    className="text-white flex flex-row items-center justify-center gap-2 hover:gap-4 bg-black-1000 w-full md:w-fit self-end rounded-md px-5 py-3 md:mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!isValid}>
                                    Atualizar dados
                                </button>
                                <button className="w-full md:w-fit flex justify-around px-5 py-3 md:mt-8 text-black-1000 font-bold text-center"
                                    onClick={logOut}>
                                    Sair da sua conta
                                </button>
                            </div>}
                    </Form>)}
            </Formik>
        </>
    );
};

export default CreateCustomerForm;