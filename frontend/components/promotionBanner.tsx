import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { BsInstagram, BsPinMapFill, BsTruckFrontFill } from 'react-icons/bs'
export default function PromotionBanner() {
    const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay()])
    return (
        <div className='w-full text-center text-sm p-2 font-semibold bg-black-1000 text-white embla z-50 fixed' ref={emblaRef}>
            <div className="embla__container">
                <div className="embla__slide">
                    <BsTruckFrontFill className='inline mx-2'></BsTruckFrontFill>
                    Entregas para Natal/RN
                </div>
                <div className="embla__slide">
                    <BsPinMapFill className='inline mx-2'></BsPinMapFill>
                    Visite nossa loja física
                </div>
                <div className="embla__slide">
                    <BsInstagram className='inline mx-2'></BsInstagram>
                    Siga nosso instagram
                </div>
                <div className="embla__slide">
                    Toda a loja em até 3x sem juros*
                </div>
            </div>
        </div>
    )
}