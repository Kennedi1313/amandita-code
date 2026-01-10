import { BsInstagram, BsWhatsapp, BsTelephone } from 'react-icons/bs'
import Image from 'next/image'
import useStoreInfo from '@/hooks/use-store-info'

export default function Footer() {
    const storeInfo = useStoreInfo();
    return (
        <div className='flex flex-col items-center mt-14  bg-white'>
            
            <div className='md:p-16 flex flex-col md:flex-row gap-5 w-full justify-around p-3 pt-10'>
                <div className='flex flex-col w-full justify-center items-center'>
                    <span className='font-semibold'>Pague com </span>
                    <div className='w-full h-12 relative mt-2'>
                        <Image 
                            src={"/cartoes.png"}
                            alt='cartoes'
                            fill
                            className='object-contain'
                            sizes="(max-width: 768px) 50vw,
                            (max-width: 1200px) 50vw,
                            33vw"/>
                    </div>
                </div>
                <div className='flex flex-col w-full justify-center items-center md:items-center text-sm'>
                <span className='font-semibold'>Contato</span>
                    <div>
                        
                        <div className='flex flex-row gap-2 items-center'>
                            <BsInstagram></BsInstagram>
                            {storeInfo?.instagram}
                        </div>
                        <div className='flex flex-row gap-2 items-center'>
                            <BsTelephone></BsTelephone>
                            {storeInfo?.whatsapp}
                        </div>
                        <div className='flex flex-row gap-2 items-center'>
                            <BsWhatsapp></BsWhatsapp>
                            {storeInfo?.whatsapp}
                        </div>
                    </div>
                </div>
            </div>
            <div className='flex flex-col md:flex-row w-full items-center justify-center md:gap-2 p-5 md:p-4 text-xs'>
                
                <div className='flex'>
                    Copyright © 2024. Todos os direitos reservados. 
                </div>
                <div className='flex flex-col'>
                    <div>
                        MOSTRA DIGITAL - CNPJ: 53.484.412/0001-00 - @mostra.digital
                    </div>
                </div>
            </div>
        </div>
    )
}