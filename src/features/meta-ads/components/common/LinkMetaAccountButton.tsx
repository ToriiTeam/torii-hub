import { useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Link2, Check } from 'lucide-react'

// Vinculación manual de cuenta publicitaria (punto 6) — el matching por
// nombre (matchClientToAccount, ver AccountContext.tsx) falla cuando el
// nombre de la cuenta real en Meta Business Manager no se parece al nombre
// del cliente (ej. "Adolfo x Torii" vs "Adolfo Blasco"). Este botón deja
// forzar la vinculación guardando clients.meta_ad_account_id directamente,
// usando la MISMA lista de cuentas (rawAccounts) que ya trae AccountContext
// desde el edge function meta-ads-proxy — no hay una fuente de datos nueva.
// Mismo patrón Popover+Command que SubaccountSwitcher.tsx.
export function LinkMetaAccountButton() {
  const { rawAccounts, linkedAccountId, setLinkedAccountId, fixedClientId } = useAccount()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!fixedClientId) return null

  async function handleSelect(accountId: string) {
    setSaving(true)
    await setLinkedAccountId(accountId === linkedAccountId ? null : accountId)
    setSaving(false)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8" disabled={saving}>
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
