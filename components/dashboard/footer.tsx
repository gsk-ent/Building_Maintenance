export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-line px-4 py-6">
      <div className="label-mono mx-auto max-w-6xl space-y-1.5 text-center text-[9.5px] leading-relaxed">
        <p className="text-teal-deep">
          Building Maintenance Suite · Secured &amp; Access Controlled
        </p>
        <p>
          © {year} TensorVeda Intelligent Systems Pvt Ltd. All rights reserved.
        </p>
        <p className="mx-auto max-w-2xl normal-case tracking-normal">
          Figures shown are for building record-keeping only and do not
          constitute a financial, tax or legal statement. Verify balances with
          your building committee before acting on them.
        </p>
      </div>
    </footer>
  );
}
