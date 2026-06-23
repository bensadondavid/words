import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { LogOutBtn } from "../ui/logOutBtn";
import { NavLink } from "./NavLinks";

export async function AppSidebar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={session?.user.image ?? ""}
              alt={session?.user.name ?? "User avatar"}
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
              {session?.user.name?.slice(0, 1).toUpperCase() ||
                session?.user.email?.slice(0, 1).toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {session?.user.name ?? "Utilisateur"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {session?.user.email ?? ""}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <NavLink href="/account/home">Accueil</NavLink>
          <NavLink href="/account/test">Test</NavLink>
          <NavLink href="/account/lists">Listes</NavLink>
          <NavLink href="/account/words">Mots</NavLink>
          <NavLink href="/account/parametres">Paramètres</NavLink>
      </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <LogOutBtn />
      </SidebarFooter>
    </Sidebar>
  );
}
