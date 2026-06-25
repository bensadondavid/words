"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { setOpen, setOpenMobile } = useSidebar();
  const pathname = usePathname();

  return (
    <SidebarMenuItem className="py-1">
      <SidebarMenuButton asChild isActive={pathname === href}>
        <Link
          href={href}
          onClick={() => {
            setOpen(false);
            setOpenMobile(false);
          }}
        >
          {children}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}