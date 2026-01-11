import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-page font-display text-gray-800 overflow-hidden h-screen w-screen flex relative">
      {/* Orbes de fundo */}
      <div className="gradient-orb w-96 h-96 bg-purple-200/40 absolute" style={{ top: '-100px', left: '-100px' }} />
      <div className="gradient-orb absolute" style={{ width: '500px', height: '500px', bottom: '-100px', right: '-100px', background: 'rgba(219, 234, 254, 0.4)' }} />
      <div className="gradient-orb w-64 h-64 bg-pink-100/30 absolute" style={{ top: '20%', right: '30%' }} />
      
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
