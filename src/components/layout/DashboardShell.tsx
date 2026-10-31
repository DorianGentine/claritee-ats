import { cookies } from "next/headers"
import { AppSidebar } from "./AppSidebar"
import { SIDEBAR_COLLAPSED_COOKIE } from "./sidebar-cookie"
import { NoteChatWidget } from "./NoteChatWidget"

export const DashboardShell = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const cookieStore = await cookies()
  const defaultCollapsed =
    cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1"

  return (
    <div className="flex flex-1 flex-col bg-background lg:flex-row">
      <AppSidebar defaultCollapsed={defaultCollapsed} />
      <div className="bg-grid flex min-w-0 flex-1 flex-col print:bg-none">{children}</div>
      <NoteChatWidget />
    </div>
  )
}
