// The 6 buckets the Resultado/Métricas tabs group expenses.category into —
// same grouping used for the totals confirmed against real data (see
// 20260707150000_expenses_reclassify_categories.sql and the conversation
// where these totals were verified row-by-row). Anything outside the 5
// canonical non-Otros labels falls back to Otros, including categories that
// were deliberately NOT remapped in the DB (e.g. 'Seiiki' stays literally
// 'Seiiki' in expenses.category for traceability, but buckets as Otros
// here for display).
export type ExpenseCategoryBucket = 'Equipo' | 'Adquisición' | 'Software' | 'Publicidad' | 'Mentoría' | 'Otros';

// Process rule, not a code rule (nothing enforces this — it's a note for
// whoever loads expenses by hand): as of the CAC/ROAS switch to
// ads_metricas_diarias (see ToriiView.tsx/businessHealth.ts), 'Publicidad'
// should NOT be used to manually log Meta ad spend anymore — that's
// synced automatically via meta-ads-proxy, and a manual entry on top of it
// double-counts (or disagrees with the real number, which is what an
// audit against ads_metricas_diarias found: manual entries off by 5-7x on
// some days). Only log 'Publicidad' for ad spend the Meta sync doesn't
// cover — another platform, or a one-off manual boost outside the tracked
// ad accounts. Finanzas' own CAC/cost breakdowns (TabMetricas.tsx,
// TabDashboard.tsx) still read this category as before — not migrated in
// this pass, so they inherit whatever discipline is followed here.

const NON_OTROS_BUCKETS: readonly ExpenseCategoryBucket[] = ['Equipo', 'Adquisición', 'Software', 'Publicidad', 'Mentoría'];

export function categorize(rawCategory: string | null | undefined): ExpenseCategoryBucket {
  if (rawCategory && (NON_OTROS_BUCKETS as readonly string[]).includes(rawCategory)) {
    return rawCategory as ExpenseCategoryBucket;
  }
  return 'Otros';
}
