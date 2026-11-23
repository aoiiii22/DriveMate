import { Link } from 'react-router';
import { Car, ChevronDown, IdCard } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const choices = [
  { to: '/partner/owner', icon: Car, title: 'List your car', text: 'Earn from your car when you don’t use it' },
  { to: '/partner/drive', icon: IdCard, title: 'Drive for DriveMate', text: 'Get booked as a professional driver' },
];

/** "Be our partner" dropdown in the top bar. Radix handles keyboard, focus and closing for us. */
export function PartnerMenu() {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="group flex items-center gap-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted data-[state=open]:bg-muted">
        Be our partner
        <ChevronDown className="size-4 text-primary transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-80 rounded-xl p-2 shadow-xl">
        {choices.map((c) => (
          <DropdownMenuItem key={c.to} asChild className="cursor-pointer items-start gap-3 rounded-lg p-3">
            <Link to={c.to}>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary"><c.icon className="size-5" aria-hidden="true" /></span>
              <span>
                <span className="block text-sm font-semibold">{c.title}</span>
                <span className="block text-xs text-muted-foreground">{c.text}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
