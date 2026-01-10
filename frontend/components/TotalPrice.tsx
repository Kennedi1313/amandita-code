import React from 'react';
import { formatCurrency } from "@/lib/utils";

interface PriceProps {
    price: number;
    fullPrice: number;
}

const TotalPrice: React.FC<PriceProps> = ({ price, fullPrice }) => {
    const hasPromo = fullPrice > price;

    return (
        <div className="flex flex-col">
            <div className="text-xl font-semibold text-gray-800">
                {hasPromo ? (
                    <div className="flex flex-col">
                        <span className="line-through text-sm text-red-600 font-normal">
                            {formatCurrency(fullPrice)}
                        </span>
                        <span>{formatCurrency(price)}</span>
                    </div>
                ) : (
                    <span>{formatCurrency(price)}</span>
                )}
            </div>
            {price >= 10000 && (
                <span className="text-xs font-thin text-gray-700">
                    em até 3x sem juros
                </span>
            )}
        </div>
    );
};

export default TotalPrice;
