"use client";

import React from "react";
import { initMercadoPago, Payment, StatusScreen } from "@mercadopago/sdk-react";
import {
  IAdditionalCardFormData,
  IPaymentFormData,
} from "@mercadopago/sdk-react/esm/bricks/payment/type";

interface BrickProps {
  brickName: "payment" | "statusScreen";
  publicKey: string;
  options: {
    initialization: any;
    customization?: any;
    callbacks?: {
      onReady?: () => void;
      onError?: (error: any) => void;
      onSubmit?: (
        formData: IPaymentFormData,
        additionalData?: IAdditionalCardFormData | null,
      ) => Promise<any>;
    };
  };
}

export const MercadoPagoBrick = ({
  brickName,
  publicKey,
  options,
}: BrickProps) => {
  React.useEffect(() => {
    if (publicKey) {
      initMercadoPago(publicKey);
    }
  }, [publicKey]);

  const commonProps = {
    initialization: options.initialization,
    customization: options.customization,
    onReady: options.callbacks?.onReady,
    onError: options.callbacks?.onError,
  };

  if (brickName === "payment") {
    return (
      <Payment
        {...commonProps}
        onSubmit={
          options.callbacks?.onSubmit ?? (async () => Promise.resolve())
        }
      />
    );
  } else if (brickName === "statusScreen") {
    return <StatusScreen {...commonProps} />;
  } else {
    return null;
  }
};
