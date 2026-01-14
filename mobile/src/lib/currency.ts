export function fromCents(cents: number): number {
  return cents / 100;
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function formatBRL(cents: number): string {
  const value = fromCents(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
}
