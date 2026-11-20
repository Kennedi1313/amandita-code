export type GuestCheckoutAddress = {
  zip: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  reference: string;
};

export type GuestCheckoutDraft = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: GuestCheckoutAddress;
};

const STORAGE_KEY = "kizi_guest_checkout";
const GUEST_CHECKOUT_ACCESS_KEY = "kizi_guest_checkout_access";

export const enableGuestCheckout = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(GUEST_CHECKOUT_ACCESS_KEY, "true");
  } catch {
    // Checkout can still be opened if browser storage is unavailable.
  }
};

export const hasGuestCheckoutAccess = () => {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(GUEST_CHECKOUT_ACCESS_KEY) === "true";
  } catch {
    return false;
  }
};

export const clearGuestCheckoutAccess = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(GUEST_CHECKOUT_ACCESS_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
};

const emptyAddress = (): GuestCheckoutAddress => ({
  zip: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  reference: "",
});

export const readGuestCheckoutDraft = (): GuestCheckoutDraft => {
  const emptyDraft = {
    name: "",
    email: "",
    phone: "",
    cpf: "",
    address: emptyAddress(),
  };
  if (typeof window === "undefined") return emptyDraft;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return emptyDraft;
    const parsed = JSON.parse(stored);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      cpf: typeof parsed.cpf === "string" ? parsed.cpf : "",
      address: { ...emptyAddress(), ...(parsed.address || {}) },
    };
  } catch {
    return emptyDraft;
  }
};

export const saveGuestCheckoutDraft = (
  updates: Partial<GuestCheckoutDraft>,
) => {
  if (typeof window === "undefined") return;
  try {
    const current = readGuestCheckoutDraft();
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...current,
        ...updates,
        address: { ...current.address, ...(updates.address || {}) },
      }),
    );
  } catch {
    // Checkout remains usable when browser storage is unavailable.
  }
};

export const clearGuestCheckoutDraft = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
};

export const isGuestCheckoutDraftComplete = (draft: GuestCheckoutDraft) =>
  Boolean(
    draft.name.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) &&
    draft.phone.replace(/\D/g, "").length >= 10 &&
    draft.phone.replace(/\D/g, "").length <= 15 &&
    isValidCpf(draft.cpf),
  );

export const isValidCpf = (value: string) => {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split("")
      .reduce(
        (total, number, index) => total + Number(number) * (length + 1 - index),
        0,
      );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
};
