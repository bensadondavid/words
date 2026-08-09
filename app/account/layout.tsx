
import { auth } from '@/lib/auth/auth'
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"


export default async function AppLayout({ children }: { children: React.ReactNode }) {

  const session = await auth.api.getSession({
      headers : await headers()
    })
    if(!session){
      redirect('/login')
    }
  

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
          <main className="min-w-0 flex-1">
            <SidebarTrigger />
            {children}
          </main>
      </SidebarProvider>
    </>
  );
}
