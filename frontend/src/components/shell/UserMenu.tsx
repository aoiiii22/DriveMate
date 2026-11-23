import { Link, useNavigate } from 'react-router';
import { Bell, Briefcase, Car, CircleUser, IdCard, LayoutDashboard, LogOut, Menu, UserRound } from 'lucide-react';
import { useAuth } from '@/auth';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dashboardLink, initials } from './nav';

const item = 'cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm';

/** Airbnb-style "☰ + avatar" button that opens the account menu. */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dash = user ? dashboardLink(user) : null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="flex items-center gap-2.5 rounded-full border border-border bg-background py-1.5 pr-1.5 pl-3 transition-shadow hover:shadow-md data-[state=open]:shadow-md"
        aria-label="Account menu"
      >
        <Menu className="size-4 text-foreground" aria-hidden="true" />
        {user ? (
          <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials(user.fullName)}
          </span>
        ) : (
          <CircleUser className="size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-64 rounded-xl p-2 shadow-xl">
        {user ? (
          <>
            <DropdownMenuLabel className="px-3 py-2">
              <p className="truncate font-semibold">{user.fullName}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className={item}><Link to="/trips"><Briefcase aria-hidden="true" />My trips</Link></DropdownMenuItem>
            {dash && <DropdownMenuItem asChild className={item}><Link to={dash.to}><LayoutDashboard aria-hidden="true" />{dash.label}</Link></DropdownMenuItem>}
            <DropdownMenuItem asChild className={item}><Link to="/alerts"><Bell aria-hidden="true" />Alerts</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className={item}><Link to="/account"><UserRound aria-hidden="true" />Account</Link></DropdownMenuItem>
            <DropdownMenuItem className={item} onSelect={() => { logout(); navigate('/'); }}>
              <LogOut aria-hidden="true" />Log out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild className={`${item} font-semibold`}><Link to="/register">Sign up</Link></DropdownMenuItem>
            <DropdownMenuItem asChild className={item}><Link to="/login">Log in</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className={item}><Link to="/partner/owner"><Car aria-hidden="true" />List your car</Link></DropdownMenuItem>
            <DropdownMenuItem asChild className={item}><Link to="/partner/drive"><IdCard aria-hidden="true" />Drive for DriveMate</Link></DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
