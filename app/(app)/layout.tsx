import AppSidebar from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";
import CanaryFavicon from "@/components/CanaryFavicon";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <CanaryFavicon />
      <AppSidebar />
      <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
