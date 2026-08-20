import { useEffect, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Link2, Check } from 'lucide-react'

interface LinkMetaAccountButtonProps {
  // Cliente explícito a vincular — lo usa el selector de 2 pasos de la vista
  // general de Meta Ads (Header.tsx, rama sin fixedClientId), donde no hay
  // ningún cliente fijo en el AccountContext porque no estamos en la
  // subcuenta de nadie puntual. Cuando se pasa, el componente maneja su
  // propio fetch/UPDATE de clients.meta_ad_account_id en vez de depender del
  // fixedClientId/linkedAccountId del contexto (que solo existen en modo
  // subcuenta, ver AccountContext.tsx).
  clientId?: string
}

// Vinculación manual de cuenta publicitaria (punto 6) — el matching por
// nombre (matchClientToAccount, ver AccountContext.tsx) falla cuando el
// nombre de la cuenta real en Meta Business Manager no se parece al nombre
// del cliente (ej. "Adolfo x Torii" vs "Adolfo Blasco"). Este botón deja
// forzar la vinculación guardando clients.meta_ad_account_id directamente,
// usando la MISMA lista de cuentas (rawAccounts) que ya trae AccountContext
// desde el edge function meta-ads-proxy — no hay una fuente de datos nueva.
// Mismo patrón Popover+Command que SubaccountSwitcher.tsx.
export function LinkMetaAccountButton({ clientId }: LinkMetaAccountButtonProps = {}) {
  const {
    rawAccounts,
    linkedAccountId: contextLinkedAccountId,
    setLinkedAccountId: setContextLinkedAccountId,
    fixedClientId,
  } = useAccount()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Cuando viene un clientId explícito (vista general), el linkedAccountId
  // no sale del contexto (que solo conoce el fixedClientId de la subcuenta)
  // sino de un fetch propio a clients, uno por cliente elegido en el paso 1.
  const usingOwnState = !!clientId
  const [ownLinkedAccountId, setOwnLinkedAccountId] = useState<string | null>(null)
  const [ownLoading, setOwnLoading] = useState(false)

  useEffect(() => {
    if (!usingOwnState || !clientId) return
    let cancelled = false
    setOwnLoading(true)
    supabase
      .from('clients')
      .select('meta_ad_account_id')
      .eq('id', clientId)
      .maybeSingle()
      .then(({ data, error: fetchErr }) => {
        if (cancelled) return
        if (fetchErr) console.warn('[LinkMetaAccountButton] could not load client:', fetchErr.message)
        setOwnLinkedAccountId(data?.meta_ad_account_id ?? null)
        setOwnLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [usingOwnState, clientId])

  const effectiveClientId = clientId ?? fixedClientId
  const linkedAccountId = usingOwnState ? ownLinkedAccountId : contextLinkedAccountId

  if (!effectiveClientId) return null

  async function handleSelect(accountId: string) {
    setSaving(true)
    const newId = accountId === linkedAccountId ? null : accountId
    if (usingOwnState && clientId) {
      const { error: updateErr } = await supabase
        .from('clients')
        .update({ meta_ad_account_id: newId })
        .eq('id', clientId)
      if (updateErr) {
        console.error('[LinkMetaAccountButton] failed to link meta ad account:', updateErr.message)
      } else {
        setOwnLinkedAccountId(newId)
      }
    } else {
      await setContextLinkedAccountId(newId)
    }
    setSaving(false)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8" disabled={saving || ownLoading}>
          <Link2 className="h-3.5 w-3.5" />
          {linkedAccountId ? 'Cambiar cuenta' : 'Vincular cuenta'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cuenta de Meta Ads..." />
          <CommandList>
            <CommandEmpty>Sin cuentas disponibles.</CommandEmpty>
            <CommandGroup heading="Cuentas publicitarias">
              {rawAccounts.map((a) => (
                <CommandItem key={a.account_id} value={a.name} onSelect={() => handleSelect(a.account_id)}>
                  {a.account_id === linkedAccountId && <Check className="h-3.5 w-3.5 mr-2 text-primary" />}
                  <span className={a.account_id === linkedAccountId ? '' : 'ml-[22px]'}>{a.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
