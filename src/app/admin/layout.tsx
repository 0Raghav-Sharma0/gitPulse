import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!isAdminUser(session)) {
    redirect("/?error=unauthorized");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFCFB] text-gray-900">
      <AdminSidebar />
      <main className="flex-1 overflow-auto relative">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
