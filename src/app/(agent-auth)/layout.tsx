export default function AgentAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 flex items-center justify-center p-3">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
