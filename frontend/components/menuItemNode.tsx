import Link from "next/link";
import React, { ReactNode } from "react";

interface MenuItemNodeProps {
    src: string,
    name: string,
    children?: ReactNode
}

export default function MenuItemNode({children, src, name, ...props}: any) {
    return (
        <Link href={src} >
            <div {...props}
                className='group relative dropdown cursor-pointer p-5 text-lg 
                    border-solid border-b-[1px] md:border-b-[3px] text-white md:text-gray-900 md:border-white hover:border-gray-600 z-50'>
                {name}
                <div className='group-hover:block dropdown-menu absolute hidden h-auto my-[23px] left-0'>
                    <div className='top-0 w-60 bg-white shadow text-sm'>
                        {children}
                    </div>
                </div>
            </div>
        </Link>
    )
}