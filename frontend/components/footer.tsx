import { BsInstagram, BsWhatsapp, BsTelephone } from "react-icons/bs";
import Image from "next/image";
import Link from "next/link";
import useStoreInfo from "@/hooks/use-store-info";

export default function Footer() {
  const storeInfo = useStoreInfo();
  const instagram = storeInfo?.instagram?.replace(/^@/, "");
  const whatsapp = storeInfo?.whatsapp?.replace(/\D/g, "");

  return (
    <div className="flex flex-col items-center mt-14  bg-white">
      <div className="md:p-16 flex flex-col md:flex-row gap-5 w-full justify-around p-3 pt-10">
        {storeInfo?.mercadoPagoConfigured && (
          <div className="flex w-full flex-col items-center justify-center">
            <span className="font-semibold">Pagamento online</span>
            <div className="relative mt-2 h-12 w-full">
              <Image
                src="/cartoes.png"
                alt="Bandeiras aceitas no pagamento online"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          </div>
        )}
        <div className="flex flex-col w-full justify-center items-center md:items-center text-sm">
          <span className="font-semibold">Contato</span>
          <div>
            {instagram && (
              <a
                className="flex flex-row gap-2 items-center"
                href={`https://www.instagram.com/${instagram}`}
                target="_blank"
                rel="noreferrer"
              >
              <BsInstagram></BsInstagram>
                @{instagram}
              </a>
            )}
            {whatsapp && (
              <a
                className="flex flex-row gap-2 items-center"
                href={`https://api.whatsapp.com/send?phone=55${whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
              <BsWhatsapp></BsWhatsapp>
                {storeInfo?.whatsapp}
              </a>
            )}
            {!instagram && !whatsapp && (
              <div className="flex flex-row gap-2 items-center">
                <BsTelephone></BsTelephone>
                Contato não informado
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row w-full items-center justify-center md:gap-2 p-5 md:p-4 text-xs">
        <div className="flex">
          © {new Date().getFullYear()} {storeInfo?.name || "Loja"}. Todos os direitos reservados.
        </div>
        {storeInfo?.taxDocument && (
          <div className="flex">CNPJ: {storeInfo.taxDocument}</div>
        )}
      </div>
      <nav aria-label="Informações da loja" className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-gray-100 px-4 py-4 text-xs text-gray-600">
        <Link className="hover:text-gray-950" href="/policies/shipping">Entrega</Link>
        <Link className="hover:text-gray-950" href="/policies/returns">Trocas e devoluções</Link>
        <Link className="hover:text-gray-950" href="/policies/privacy">Privacidade</Link>
        <Link className="hover:text-gray-950" href="/policies/terms">Termos de uso</Link>
      </nav>
    </div>
  );
}
