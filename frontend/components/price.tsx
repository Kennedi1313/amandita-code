import React from 'react';
import { formatCurrency } from "@/lib/utils";

interface PriceProps {
    price: number;
    promo: number;
  }
const Price: React.FC<PriceProps> = ({ price, promo }) => {
return (
    <div className='flex flex-col'>
                    <span className='text-xl font-semibold text-gray-800'>
                    {price >= 5000 
                        ?   
                        promo > 0
                            ?
                            <span className='flex flex-col'>
                                <span className='line-through text-sm text-red-600 font-normal'>{ formatCurrency(price) }</span>
                                <span>
                                    <span> { formatCurrency(price, promo) }</span>
                                    <span className='text-sm font-thin'> no pix</span>
                                </span>
                            </span>
                            :
                            <span>
                                <span>{ formatCurrency(price * 0.95) }</span>
                                <span className='text-sm font-thin'> no pix</span>
                            </span>
                        : 
                        promo > 0
                            ?
                            <span className='flex flex-col'>
                                <span className='line-through text-sm text-red-600 font-normal'>{ formatCurrency(price) }</span>
                                <span>{ formatCurrency(price, promo) }</span>
                            </span>
                            :
                            <span>
                                <span>{ formatCurrency(price, promo) }</span>
                            </span>
                    }
                    </span>
                    {price >= 10000
                        ? 
                        <span className='text-xs font-thin text-gray-700'>ou 3x de {formatCurrency(price, promo, 3)} sem juros</span>
                        : 
                        price >= 5000 
                            ? <span className='text-xs font-thin text-gray-700'>ou 1x de {formatCurrency(price, promo)} sem juros</span>
                            : ""
                    }
                </div>
)};
export default Price;