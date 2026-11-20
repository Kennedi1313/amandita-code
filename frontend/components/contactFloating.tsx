import useStoreInfo from "@/hooks/use-store-info";
import { useRouter } from "next/router";
import { BsInstagram, BsWhatsapp } from "react-icons/bs";

export default function ContactFloating() {
  const storeInfo = useStoreInfo();
  const router = useRouter();
  const whatsappDigits = String(storeInfo?.whatsapp || "").replace(/\D/g, "");
  const whatsappNumber = whatsappDigits
    ? whatsappDigits.startsWith("55")
      ? whatsappDigits
      : `55${whatsappDigits}`
    : "";
  const instagram = String(storeInfo?.instagram || "").trim().replace(/^@/, "");

  if (
    router.pathname === "/checkout" ||
    router.pathname === "/cart" ||
    router.pathname === "/details/[id]" ||
    (!whatsappNumber && !instagram)
  ) {
    return null;
  }

  return (
    <div>
      {whatsappNumber && (
        <a
          href={`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent("Olá, tudo bem? Gostaria de algumas informações.")}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Fale com a loja pelo WhatsApp"
          className="z-40 fixed right-3 bottom-14 w-14 h-14 rounded-full
                    bg-white flex items-center justify-center 
                    bg-gradient-to-r from-green-400 to-green-600 text-white cursor-pointer shadow-md shadow-slate-500"
        >
          <BsWhatsapp className="w-7 h-7"></BsWhatsapp>
        </a>
      )}
      {instagram && (
        <a
          className="z-40 fixed right-3 bottom-32 w-14 h-14 rounded-full
                    bg-white flex items-center justify-center 
                    bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white cursor-pointer shadow-md shadow-slate-500"
          href={`https://www.instagram.com/${instagram}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Visite o Instagram da loja"
        >
          <BsInstagram className="w-7 h-7"></BsInstagram>
        </a>
      )}
    </div>
  );
}
