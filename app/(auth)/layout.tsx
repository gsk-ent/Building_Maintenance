export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-teal-deep px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            Building Maintenance Suite
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Building Maintenance
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Manage properties, requests and work orders
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
          {children}
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-white/60">
          © {new Date().getFullYear()} TensorVeda Intelligent Systems Pvt Ltd
          <br />
          Building Maintenance Suite · Secured &amp; Access Controlled
        </p>
      </div>
    </main>
  );
}
