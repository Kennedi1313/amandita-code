import React from 'react';
import { FiShare2 } from 'react-icons/fi'; // Import a share icon from Feather Icons

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
        console.log('Shared successfully');
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      alert('Web Share API is not supported in your browser');
    }
  };

  return (
    <div>
      <button 
        onClick={handleNativeShare}
        className='rounded-full absolute right-1 top-16 border-[1px] border-gray-200 flex flex-row 
            bg-white opacity-80 justify-center items-center p-3'
      >
        <FiShare2  className='w-5 h-5 opacity-100 text-gray-700'/>
      </button>
    </div>
  );
};

export default Share;
