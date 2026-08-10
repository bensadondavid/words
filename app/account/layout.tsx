
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { getCurrentSession } from '@/lib/auth/get-current-session'
import { withQueryProfile } from '@/lib/database/query-profiler'


export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return withQueryProfile('layout:/account', () => renderAppLayout(children))
}

async function renderAppLayout(children: React.ReactNode) {
  const session = await getCurrentSession()
    if(!session){
      redirect('/login')
    }
  

  return (
    <>
      <SidebarProvider>
        <AppSidebar user={session.user} />
          <main className="min-w-0 flex-1">
            <SidebarTrigger />
            {children}
          </main>
      </SidebarProvider>
    </>
  );
}
