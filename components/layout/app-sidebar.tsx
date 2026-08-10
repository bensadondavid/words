import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { LogOutBtn } from "../ui/logOutBtn";
import { NavLink } from "./NavLinks";

type AppSidebarProps = {
  user: {
    name: string
    email: string
    image?: string | null
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user.image ?? ""}
              alt={user.name ?? "User avatar"}
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
              {user.name?.slice(0, 1).toUpperCase() ||
                user.email?.slice(0, 1).toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name ?? "Utilisateur"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email ?? ""}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <NavLink href="/account/home">Accueil</NavLink>
          <NavLink href="/account/game">Jeu</NavLink>
          <NavLink href="/account/lists">Listes</NavLink>
          <NavLink href="/account/words">Mots</NavLink>
          <NavLink href="/account/import">Importer</NavLink>
          <NavLink href="/account/parametres">Paramètres</NavLink>
      </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <LogOutBtn />
      </SidebarFooter>
    </Sidebar>
  );
}
