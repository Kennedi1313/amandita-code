import useStoreInfo from "@/hooks/use-store-info";
import { BsArrowUpCircle, BsInstagram, BsWhatsapp } from "react-icons/bs";

export default function ContactFloating() {
  const storeInfo = useStoreInfo();
  return (
    <div>
      <a
        href={
          "https://api.whatsapp.com/send?phone=+55" +
          storeInfo?.whatsapp +
          "&text=Olá,%20tudo%20bem?%20Gostaria%20de%20algumas%20informações."
        }
        target="blank"
        className="z-50 fixed right-3 bottom-14 w-14 h-14 rounded-full 
                    bg-white flex items-center justify-center 
                    bg-gradient-to-r from-green-400 to-green-600 text-white cursor-pointer shadow-md shadow-slate-500"
      >
        <BsWhatsapp className="w-7 h-7"></BsWhatsapp>
      </a>
      <a
        className="z-50 fixed right-3 bottom-32 w-14 h-14 rounded-full 
                    bg-white flex items-center justify-center 
                    bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white cursor-pointer shadow-md shadow-slate-500"
        href={"https://www.instagram.com/" + storeInfo?.instagram}
        target="blank"
      >
        <BsInstagram className="w-7 h-7"></BsInstagram>
      </a>
    </div>
  );
}
