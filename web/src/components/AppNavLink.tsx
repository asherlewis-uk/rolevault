import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  end?: boolean;
  onClick?: () => void;
}

export function AppNavLink({
  to,
  children,
  className,
  activeClassName,
  end = false,
  onClick,
}: NavLinkProps) {
  const { pathname } = useLocation();
  const isActive = end ? pathname === to : pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(className, isActive && activeClassName)}
    >
      {children}
    </Link>
  );
}
