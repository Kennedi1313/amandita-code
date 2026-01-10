'use client'
import { useEffect, useRef, useState } from 'react';
import ProtectedRoute from '../protectedRoute';
import { useShoppingCart } from '@/hooks/use-shopping-cart';
import { useSearchParams } from 'next/navigation';
import { MercadoPagoBrick } from '@/components/mercadoPagoBrick';
import useStoreInfo from '@/hooks/use-store-info';
import { useRouter } from 'next/navigation';
import { AxiosResponse } from 'axios';
import { getStatusByPaymentId } from '@/lib/client';

const Pending = () => {
    const searchParams = useSearchParams()
    const paymentId = searchParams.get('payment_id')
    const router = useRouter();
    const storeInfo = useStoreInfo();
    
    useEffect(() => {
        if (!paymentId) return;
        console.log(paymentId)
        const interval = setInterval(async () => {
            getStatusByPaymentId(paymentId).then((res: AxiosResponse<String, any>) => {
                console.log('Status:', res.data);
                if (res.data === 'approved') {
                    clearInterval(interval);
                    router.push('/success?payment_id=' + paymentId);
                }
            }).catch((err: any) => { console.error('Error fetching payment status:', err); })
        }, 5000); 
    
        return () => clearInterval(interval);
    }, [paymentId]);

    if (!storeInfo) return null;

    return (
    <>
        <div className="md:container xl:max-w-screen-xl mx-auto py-12 p-2 md:px-6 mt-28 min-h-[40vh]">
            <h2 className="text-4xl font-semibold">Confirmação de Pagamento</h2>
            <p className="mt-1 text-xl">Quase lá! A confirmação pode demorar alguns segundos</p>
            <div className='mx-auto flex flex-col gap-2 md:px-0 py-5 my-2 w-full md:max-w-lg'>
                <MercadoPagoBrick
                    brickName="statusScreen"
                    publicKey={storeInfo.mercadoPagoPublicKey}
                    options={{
                        initialization: { paymentId },
                        customization: {
                            visual: {
                                hideStatusDetails: false,
                                hideTransactionDate: false,
                                style: { theme: 'default' }
                            },
                            backUrls: {
                                error: 'https://www.' + storeInfo.domain + '/pending?payment_id=' + paymentId,
                                return: 'https://www.' + storeInfo.domain + '/success'
                            }
                        },
                        callbacks: {
                            onReady: () => {},
                            onError: () => {}
                        }
                    }}
                />
            </div>
        </div>
    </>)
}

export default ProtectedRoute(Pending);