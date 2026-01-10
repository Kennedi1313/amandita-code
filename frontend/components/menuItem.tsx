import Link from "next/link";

interface MenuItemProps {
    src: string,
    name: string
}

export default function MenuItem(props: MenuItemProps) {
    return (
        <li className='py-1 px-6 hover:bg-slate-100'>
            <Link href={props.src} className='block text-white md:text-gray-500'>{props.name}</Link>
        </li>
    )
}