import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Link2, ArrowLeft, User } from 'lucide-react'
import { LinkMetaAccountButton } from './LinkMetaAccountButton'

interface ClientOption {
  id: string
  name: string | null
}

// Selector de 2 pasos para la vista general de Meta Ads (sidebar Torii, sin
// fixedClientId — ver Header.tsx). Ahí el <Select> de "Seleccionar cuenta"
// solo sirve para elegir qué cuenta ver en el dashboard actual: nunca hubo
// forma de vincular manualmente la cuenta de un cliente puntual sin entrar a
// su subcuenta (/c/:id/meta-ads), que es donde vive LinkMetaAccountButton.
// Acá se resuelve eso: paso 1 elegís el cliente (buscador Command, mismo
// patrón que SubaccountSwitcher.tsx), paso 2 se muestra el mismo
// LinkMetaAccountButton de siempre pero con un clientId explícito en vez de
// depender del fixedClientId del contexto.
export function LinkClientAccountFlow() {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)

  useEffect(() => {
    if (!open) return
    // es_interno = false: el casillero interno de Torii no es un cliente
    // vinculable acá, mismo criterio que el resto de la sesión anterior.
    supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .eq('es_interno', false)
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.warn('[LinkClientAccountFlow] could not load clients:', error.message)
          return
        }
        setClients(data ?? [])
      })
  }, [open])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSelectedClient(null)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Link2 className="h-3.5 w-3.5" />
          Vincular cuenta de cliente
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {!selectedClient ? (
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandList>
              <CommandEmpty>Sin clientes disponibles.</CommandEmpty>
              <CommandGroup heading="Clientes">
                {clients.map((c) => (
                  <CommandItem key={c.id} value={c.name ?? c.id} onSelect={() => setSelectedClient(c)}>
                    <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    {c.name ?? '(sin nombre)'}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="p-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSelectedClient(null)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-fit"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver
            </button>
            <div className="text-sm font-medium">{selectedClient.name ?? '(sin nombre)'}</div>
            <LinkMetaAccountButton clientId={selectedClient.id} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
