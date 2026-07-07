// The 6 buckets the Resultado/Métricas tabs group expenses.category into —
// same grouping used for the totals confirmed against real data (see
// 20260707150000_expenses_reclassify_categories.sql and the conversation
// where these totals were verified row-by-row). Anything outside the 5
// canonical non-Otros labels falls back to Otros, including categories that
// were deliberately NOT remapped in the DB (e.g. 'Seiiki' stays literally
// 'Seiiki' in expenses.category for traceability, but buckets as Otros
// here for display).
export type ExpenseCategoryBucket = 'Equipo' | 'Adquisición' | 'Software' | 'Publicidad' | 'Mentoría' | 'Otros';

const NON_OTROS_BUCKETS: readonly ExpenseCategoryBucket[] = ['Equipo', 'Adquisición', 'Software', 'Publicidad', 'Mentoría'];

export function categorize(rawCategory: string | null | undefined): ExpenseCategoryBucket {
  if (rawCategory && (NON_OTROS_BUCKETS as readonly string[]).includes(rawCategory)) {
    return rawCategory as ExpenseCategoryBucket;
  }
  return 'Otros';
}
