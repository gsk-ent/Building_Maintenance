export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-teal-deep px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="label-mono text-[10px] tracking-[0.2em] text-gold">
            Building Maintenance Suite
          </p>
          <h1 className="mt-1 text-3xl font-bold text-paper">
            Building Maintenance
          </h1>
          <p className="label-mono mt-2 text-[11px] text-teal">
            Manage properties, requests and work orders
          </p>
        </div>
        <div className="border-t-4 border-t-gold bg-paper p-6">{children}</div>
      </div>
    </main>
  );
}
