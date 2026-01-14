// Utilitários de formatação monetária para BRL

/**
 * Converte centavos para valor decimal
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Converte valor decimal para centavos
 */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Formatar valor em BRL
 */
export function formatBRL(cents: number): string {
  const value = fromCents(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
}

/**
 * Formatação compacta para valores grandes
 */
export function formatBRLCompact(cents: number): string {
  const value = fromCents(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

/**
 * Validar se uma string é um valor monetário válido
 */
export function isValidMoneyString(value: string): boolean {
  const cleanValue = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const numValue = parseFloat(cleanValue);
  return !isNaN(numValue) && numValue >= 0;
}

/**
 * Converter string BRL para centavos
 */
export function parseBRLToCents(value: string): number {
  const cleanValue = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const numValue = parseFloat(cleanValue);
  return toCents(numValue);
}