import React from 'react';
import { formatCurrency } from "@/lib/utils";

interface PriceProps {
    price: string;
    promo: number;
}

const ProductPrice: React.FC<PriceProps> = ({ price, promo }) => {
    const centsPrice = parseFloat(price.replace('.', '').replace(',', ''));
    const hasPromo = promo > 0;
    const finalPrice = centsPrice * (1 - promo / 100);

    return (
        <div className="flex flex-col">
            <div className="text-md font-normal text-gray-800">
                {hasPromo ? (
                    <div className="flex flex-col">
                        <span className="line-through text-xs text-red-600 font-normal">
                            {formatCurrency(centsPrice)}
                        </span>
                        <span>{formatCurrency(finalPrice)}</span>
                    </div>
                ) : (
                    <span>{formatCurrency(centsPrice)}</span>
                )}
            </div>
        </div>
    );
};

export default ProductPrice;
