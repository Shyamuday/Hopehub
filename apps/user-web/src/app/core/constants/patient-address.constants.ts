export const ADDRESS_TYPE_OPTIONS = [
  { value: 'HOME', label: 'Home' },
  { value: 'WORK', label: 'Work' },
  { value: 'OTHER', label: 'Other' }
] as const;

export type PatientAddress = {
  id: string;
  label: string;
  addressType: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  deliveryInstructions?: string | null;
  isDefault: boolean;
  formatted?: string;
};

export function emptyAddressForm(defaultName = '', defaultPhone = '') {
  return {
    label: '',
    addressType: 'HOME',
    recipientName: defaultName,
    phone: defaultPhone,
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    deliveryInstructions: '',
    isDefault: false
  };
}

export function addressToForm(addr: PatientAddress) {
  return {
    label: addr.label,
    addressType: addr.addressType,
    recipientName: addr.recipientName,
    phone: addr.phone,
    addressLine1: addr.addressLine1,
    addressLine2: addr.addressLine2 || '',
    landmark: addr.landmark || '',
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    country: addr.country || 'India',
    deliveryInstructions: addr.deliveryInstructions || '',
    isDefault: addr.isDefault
  };
}

export function formToAddressPayload(form: ReturnType<typeof emptyAddressForm>) {
  return {
    label: form.label.trim(),
    addressType: form.addressType,
    recipientName: form.recipientName.trim(),
    phone: form.phone.trim(),
    addressLine1: form.addressLine1.trim(),
    addressLine2: form.addressLine2.trim() || null,
    landmark: form.landmark.trim() || null,
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
    country: form.country.trim() || 'India',
    deliveryInstructions: form.deliveryInstructions.trim() || null,
    isDefault: form.isDefault
  };
}

export function addressTypeLabel(type: string): string {
  return ADDRESS_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
