export const GENDERS = [
  { value: 'WOMAN', label: 'Woman' },
  { value: 'MAN', label: 'Man' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'OTHER', label: 'Another gender' },
] as const;
export type Gender = typeof GENDERS[number]['value'];
