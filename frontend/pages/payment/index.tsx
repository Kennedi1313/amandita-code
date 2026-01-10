'use client'

import { useAuth } from '@/components/Context/authContext';
import { MercadoPagoBrick } from '@/components/mercadoPagoBrick';
import ProductPrice from '@/components/productPrice';
import Price from '@/components/productPrice';
import TotalPrice from '@/components/TotalPrice';
import { useShoppingCart } from '@/hooks/use-shopping-cart';
import useStoreInfo from '@/hooks/use-store-info';
import { createPayment, getCustomerByEmail } from '@/lib/client';
import { formatCurrency } from '@/lib/utils';
import { Customer } from '@/types/CustomerTypes';
import { AxiosResponse } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiX } from 'react-icons/fi';

const formatPriceForMP = (price: number) => {
    return Number((price / 100).toFixed(2));
};

export default function PaymentPage() {
    const router = useRouter();
    const { cartDetails } = useShoppingCart();
    const { customer } = useAuth();
    const storeInfo = useStoreInfo();
    const [totalPrice, setTotalPrice] = useState(0);
    const [ hasMounted, setHasMounted ] = useState(false);
    const [discountPrice, setDiscountPrice] = useState(0);
    const [customerInfo, setCustomerInfo] = useState<Customer|null>(null);
    let item = window.localStorage.getItem('paymentDetails');
    if (!item) return
    let amount = JSON.parse(item).amount;
    let shippingFee = JSON.parse(item).shippingFee;

    const saleItemRequests = Object.entries(cartDetails).map(([_, product]) => ({
        productId: product.id,
        quantity: product.quantity,
    }));

    const saleRequest = {
        saleItemRequests: saleItemRequests,
        customerEmail: customer.username,
        paymentMethod: "Web",
        shippingFee: shippingFee
    };


    const fetchCustomers = () => {
        getCustomerByEmail(customer.username).then((res: AxiosResponse<Customer, any>) => {
            const values = res.data;
            setCustomerInfo(values);
        }).catch(err => { })
    }

    const fetchProducts = () => {
        const { total, fullPrice } = Object.entries(cartDetails).reduce(
            (acc, [_, product]) => {
                const itemFullPrice = parseFloat(product.price.replace('.', '').replace(',', '')) * product.quantity;
                const itemDiscountedPrice = itemFullPrice * (1 - product.promo / 100);
    
                acc.total += itemDiscountedPrice;
                acc.fullPrice += itemFullPrice;
    
                return acc;
            },
            { total: 0, fullPrice: 0 }
        );

        setTotalPrice(fullPrice);
        setDiscountPrice(total);
    };

    useEffect(() => {
        setHasMounted(true);
        fetchProducts();
        fetchCustomers();
    }, []);

    if (!hasMounted) return;


    if (customerInfo == null) return;
    if (!storeInfo) return null;
    
    return (
    <>
        <div className="md:container xl:max-w-screen-xl mx-auto py-12 p-2 md:px-6 mt-28 min-h-[40vh]">
            <h2 className="text-4xl font-semibold">Finalizar Pagamento</h2>  
            <p className="mt-1 text-xl">Informe o meio de pagamento e preencha os dados necessários</p>
            <div className='flex flex-col md:flex-row w-full md:gap-12'>
                <div className="mx-auto flex flex-col gap-2 md:px-0 md:py-5 md:my-2 w-full">
                    <MercadoPagoBrick
                        brickName="payment"
                        publicKey={storeInfo.mercadoPagoPublicKey}
                        options={{
                            initialization: {
                                amount: formatPriceForMP(amount + shippingFee),
                                payer: {
                                    firstName: customerInfo.name,
                                    email: customerInfo.email,
                                    identification: {
                                        type: 'CPF',
                                        number: customerInfo.cpf.replace(/\D/g, ''),
                                    }
                                },
                            },
                            customization: {
                                paymentMethods: {
                                    creditCard: 'all',
                                    bankTransfer: 'all',
                                }
                            },
                            callbacks: {
                                onReady: (() => {}),
                                onError: (() => {}),
                                onSubmit: async ( formdata  : any) => {
                                    const paymentData = {
                                        ...formdata.formData,
                                        saleRequest: saleRequest
                                    };
                                    const response = await createPayment(paymentData)
                                    if (response.data) {
                                        router.push('/pending?payment_id=' + response.data.id)
                                    }
                                }
                            }
                        }}
                    />
                </div>
                
                <div className='mx-auto flex flex-col gap-2 md:px-0 md:py-5 my-2 w-full md:w-min '>
                    <div className='py-6 px-4 bg-white rounded-2xl'>
                        <p className="py-6 text-xl font-bold color-[#1A1A1A]">Resumo do pedido</p>
                        <div className=' max-w-screen-sm md:max-w-full overflow-scroll md:overflow-hidden py-2 '>
                            <p className="">Produtos</p>
                            <table className="table-auto min-w-max w-full border-collapse overflow-scroll">
                                {Object.entries(cartDetails).map(([key, product]: [any, any]) => (
                                    <tbody key={key} className="">
                                        <tr>
                                            <td className=" ">
                                                {key}. {product.name}
                                            </td>
                                        </tr>
                                        <tr className="w-fit flex items-start gap-4 py-2">
                                            <td className="px-4">
                                                {product.quantity} 
                                            </td>
                                            <td className="">
                                                <FiX></FiX>
                                            </td>
                                            <td className="px-4">
                                                <ProductPrice price={product.price} promo={product.promo}></ProductPrice>
                                            </td>
                                        </tr>
                                    </tbody>
                                ))}
                            </table>
                        </div>
                        <div className="flex flex-col border-t py-4 w-full items-start">
                            <p className="pb-2">Envio</p>
                            <p className="">{shippingFee > 0 ? formatCurrency(shippingFee) : "Grátis"}</p>
                        </div>
                        <div className="flex flex-col border-t py-4 gap-2 w-full items-start">
                            <div className="text-xl flex flex-col gap-2 items-start">
                                <p className="mt-1 text-xl">Preço Total</p>
                                <TotalPrice price={amount + shippingFee} fullPrice={totalPrice + shippingFee}></TotalPrice>
                            </div>
                        </div>
                    </div>
                    <div className='flex flex-col md:flex-row gap-2'>
                        <Link href={'/checkout'} className='w-full flex justify-around px-5 py-3 md:mt-8 text-black-1000 font-bold text-center'>
                            <FiArrowLeft className='self-center'></FiArrowLeft>
                            Voltar para a revisão de pedido
                        </Link>
                    </div> 
                </div>
            </div>
        </div>
    </>)
}
