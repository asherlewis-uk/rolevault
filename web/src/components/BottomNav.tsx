import { Home, Compass, PlusCircle, User } from "lucide-react";
import { AppNavLink } from "@/components/AppNavLink";

const navItems = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/create", icon: PlusCircle, label: "Create" },
  { to: "/profile", icon: User, label: "Profile" },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 flex bottom-nav ${className ?? ""}`}
    >
      {navItems.map(({ to, icon: Icon, label, end }) => (
        <AppNavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 pt-3 text-muted-foreground/55 text-[10px] font-semibold font-display transition-colors duration-200"
          activeClassName="text-primary"
        >
          <div className="relative">
            <Icon className="w-[22px] h-[22px]" strokeWidth={1.7} />
          </div>
          <span>{label}</span>
        </AppNavLink>
      ))}
    </nav>
  );
}
