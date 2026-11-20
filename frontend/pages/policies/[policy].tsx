import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import useStoreInfo from "@/hooks/use-store-info";

const policies = {
  shipping: {
    title: "Entrega e retirada",
    paragraphs: [
      "As opções, valores e prazos disponíveis para este pedido são informados pela loja durante a compra. A disponibilidade pode variar conforme o CEP, os produtos e a modalidade escolhida.",
      "Para dúvidas sobre o andamento, entrega, retirada ou problemas com um pedido, fale diretamente com a loja pelos canais informados nesta página. A loja é responsável pela venda, separação e atendimento do pedido.",
    ],
  },
  returns: {
    title: "Trocas, devoluções e arrependimento",
    paragraphs: [
      "Solicitações de troca, devolução, arrependimento, defeito ou reembolso devem ser feitas diretamente à loja pelos canais de atendimento informados nesta página, com o número do pedido e os detalhes do caso.",
      "A loja deve orientar o procedimento e cumprir os direitos e prazos previstos na legislação aplicável. Esta página é um texto informativo padrão e não substitui os direitos legais do consumidor.",
    ],
  },
  privacy: {
    title: "Privacidade",
    paragraphs: [
      "A loja utiliza os dados fornecidos durante a compra para atender o pedido, combinar entrega ou retirada, prestar suporte e cumprir obrigações legais. Para dúvidas sobre um pedido ou sobre o uso de dados pela loja, entre em contato com ela pelos canais abaixo.",
      "A KIZI fornece a tecnologia usada para operar esta loja e também pode tratar dados necessários à hospedagem, segurança e funcionamento da plataforma. O papel e as responsabilidades de cada parte dependem do tratamento realizado e da legislação aplicável. Para solicitações relacionadas a dados tratados pela KIZI, use o canal de contato da plataforma informado no site KIZI.",
      "Este texto padrão deve ser complementado pela loja com informações específicas sobre ferramentas, pagamentos, comunicação e prazos de retenção utilizados em sua operação.",
    ],
  },
  terms: {
    title: "Termos de uso",
    paragraphs: [
      "Esta loja é operada pelo lojista identificado nesta página. A loja é a responsável por anunciar e vender os produtos, definir as condições comerciais, processar os pedidos e prestar atendimento ao comprador.",
      "A KIZI fornece a plataforma tecnológica para que lojas independentes publiquem seus produtos e recebam pedidos. A KIZI não é a vendedora dos produtos desta loja nem parte da compra entre cliente e lojista. Isso não afasta responsabilidades que possam caber a cada parte conforme sua atuação e a legislação aplicável.",
      "Ao comprar, confira os dados do produto, a loja, o preço, a forma de entrega e as condições mostradas no checkout. Dúvidas ou solicitações sobre a compra devem ser encaminhadas diretamente à loja.",
    ],
  },
} as const;

export default function StorePolicyPage() {
  const router = useRouter();
  const store = useStoreInfo();
  const policy = policies[router.query.policy as keyof typeof policies];

  if (!policy || !store) return null;

  const instagram = store.instagram?.replace(/^@/, "");
  const whatsapp = store.whatsapp?.replace(/\D/g, "");

  return (
    <main className="mx-auto mt-24 min-h-[60vh] max-w-3xl px-4 py-10 md:mt-32">
      <Head>
        <title>{policy.title} | {store.name}</title>
        <meta name="robots" content="noindex,follow" />
      </Head>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span aria-current="page">{policy.title}</span>
      </nav>
      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{store.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">{policy.title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-gray-700">
          {policy.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <section className="mt-8 border-t border-gray-100 pt-6">
          <h2 className="font-semibold text-gray-900">Fale com a loja</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {whatsapp && <a className="underline" href={`https://api.whatsapp.com/send?phone=${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            {instagram && <a className="underline" href={`https://www.instagram.com/${instagram}`} target="_blank" rel="noreferrer">Instagram</a>}
            {!whatsapp && !instagram && <p className="text-gray-600">Consulte os dados de contato informados pela loja.</p>}
          </div>
        </section>
        <p className="mt-8 text-xs leading-5 text-gray-500">Este é um texto padrão da plataforma. A loja deve revisar e complementar as informações específicas da sua operação.</p>
      </article>
    </main>
  );
}
