import Link from "next/link";

const FOOTER_LINKS = {
  Modules: [
    { label: "Member Management", href: "/dashboard/members" },
    { label: "Loan Processing", href: "/dashboard/loans" },
    { label: "Savings Accounts", href: "/dashboard/savings" },
    { label: "Reports", href: "/dashboard/reports" },
    { label: "Notifications", href: "/dashboard/notifications" },
  ],
  Access: [
    { label: "Admin Dashboard", href: "/dashboard/admin" },
    { label: "Staff Portal", href: "/dashboard" },
    { label: "Member Portal", href: "/portal" },
    { label: "Sign In", href: "/login" },
    { label: "Register", href: "/register" },
  ],
  System: [
    { label: "Documentation", href: "/docs" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use", href: "/terms" },
    { label: "Contact Support", href: "/contact" },
    { label: "About", href: "/about" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0B1D3A] pt-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12">
          {/* Brand column */}
          <div>
            <Link href="/" className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center font-serif font-black text-lg text-[#0B1D3A] shadow-[0_4px_12px_rgba(200,150,62,0.35)]">
                FC
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-serif font-bold text-white text-[15px] tracking-wide">
                  First Choice
                </span>
                <span className="text-[10px] font-medium text-[#E4B86A] tracking-[0.15em] uppercase">
                  Credit Union
                </span>
              </div>
            </Link>
            <p className="text-sm text-white/45 leading-[1.75] max-w-[280px]">
              A web-based office automation system developed as a Computer
              Science Final Year Project to digitise the operations of First
              Choice Credit Union.
            </p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mt-6 text-xs text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-bold tracking-[0.1em] uppercase text-[#E4B86A] mb-5">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-white/45 hover:text-[#E4B86A] transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom Bar ── */}
        <div className="border-t border-white/7 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-white/30">
          <span>
            © {new Date().getFullYear()} First Choice Credit Union Automation
            System — CS Final Year Project.
          </span>
          <span className="flex items-center gap-1.5">
            Built with ❤️ using{" "}
            <Link
              href="https://nextjs.org"
              target="_blank"
              className="text-[#E4B86A] hover:underline"
            >
              Next.js
            </Link>{" "}
            &{" "}
            <Link
              href="https://www.typescriptlang.org"
              target="_blank"
              className="text-[#E4B86A] hover:underline"
            >
              TypeScript
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
