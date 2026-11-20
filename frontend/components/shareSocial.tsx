import React from "react";
import { FiShare2 } from "react-icons/fi"; // Import a share icon from Feather Icons
import { toast } from "react-hot-toast";

interface ShareProps {
  productName: string;
  productUrl: string;
}

const Share: React.FC<ShareProps> = ({ productName, productUrl }) => {
  const shareData = {
    title: productName,
    text: `${productName}: `,
    url: productUrl,
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          toast.error("Não foi possível compartilhar este produto.");
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      toast.success("Link do produto copiado!");
    } catch {
      window.prompt("Copie o link do produto:", productUrl);
    }
  };

  return (
    <div className="pointer-events-none">
      <button
        type="button"
        aria-label={`Compartilhar ${productName}`}
        title="Compartilhar produto"
        onClick={handleNativeShare}
        className="pointer-events-auto absolute right-2 top-14 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm backdrop-blur"
      >
        <FiShare2 className="w-5 h-5 opacity-100 text-gray-700" />
      </button>
    </div>
  );
};

export default Share;
