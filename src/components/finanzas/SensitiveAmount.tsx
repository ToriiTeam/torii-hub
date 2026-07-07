import { useSensitiveData } from '@/features/meta-ads/context/SensitiveDataContext';
import { cn } from '@/lib/utils';

// Reuses the exact same context/hook/localStorage key as Meta Ads'
// "Ocultar" toggle (SensitiveDataContext, key 'hidesSensitiveData') rather
// than duplicating that state logic. The blur itself can't reuse Meta Ads'
// .sensitive-hidden CSS class though — that class is scoped under
// .meta-ads-root in meta-ads.css and simply wouldn't apply here — so this
// wraps the same idea in Tailwind's blur-sm utility instead, matching how
// the rest of this feature is styled.
export function SensitiveAmount({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isHidden } = useSensitiveData();
  return (
    <span className={cn(className, isHidden && 'blur-sm select-none')}>
      {children}
    </span>
  );
}
