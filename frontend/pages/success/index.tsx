'use client'
import { useEffect, useRef, useState } from 'react';
import ProtectedRoute from '../protectedRoute';
import { useShoppingCart } from '@/hooks/use-shopping-cart';
import { useSearchParams } from 'next/navigation';
import { MercadoPagoBrick } from '@/components/mercadoPagoBrick';
import useStoreInfo from '@/hooks/use-store-info';
import { useRouter } from 'next/router';
import { AxiosResponse } from 'axios';
import { getStatusByPaymentId } from '@/lib/client';

const Pending = () => {
    const searchParams = useSearchParams()
    const paymentId = searchParams.get('payment_id')
    const { clearCart } = useShoppingCart()
    const storeInfo = useStoreInfo();
    if (!storeInfo) return null;


    return (
    <>
        <div className="md:container xl:max-w-screen-xl mx-auto py-12 p-2 md:px-6 mt-28 min-h-[40vh]">
            <h2 className="text-4xl font-semibold">Pagamento Confirmado!</h2>
            <p className="mt-1 text-xl">Parabéns! Seu pagamento foi recebido e logo entraremos em contato.</p>
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
                                error: 'https://www.' + storeInfo.domain,
                                return: 'https://www.' + storeInfo.domain
                            }
                        },
                        callbacks: {
                            onReady: () => {clearCart()},
                            onError: () => {}
                        }
                    }}
                />
            </div>
        </div>
    </>)
}

export default ProtectedRoute(Pending);