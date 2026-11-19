export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-slate-200 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-1.5 text-center text-xs leading-relaxed text-slate-500">
        <p className="text-sm font-semibold text-slate-700">
          Building Maintenance Suite · Secured &amp; Access Controlled
        </p>
        <p>
          © {year} TensorVeda Intelligent Systems Pvt Ltd. All rights reserved.
        </p>
        <p className="mx-auto max-w-2xl">
          Figures shown are for building record-keeping only and do not
          constitute a financial, tax or legal statement. Verify balances with
          your building committee before acting on them.
        </p>
      </div>
    </footer>
  );
}
