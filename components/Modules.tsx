const MODULES = [
  {
    icon: "📝",
    name: "Membership Registration",
    text: "Complete digital onboarding for new and existing members with document uploads, photo capture via Cloudinary, and full KYC validation.",
    tags: ["KYC Verification", "Photo Upload", "ID Validation"],
  },
  {
    icon: "🤝",
    name: "Loan Management",
    text: "End-to-end loan processing with eligibility checks, guarantor management, multi-level approval workflows, and repayment scheduling.",
    tags: ["Loan Calculator", "Guarantors", "Repayment Plan"],
  },
  {
    icon: "💵",
    name: "Savings & Deposits",
    text: "Track all member savings accounts with automated interest computation, transaction ledger, and downloadable account statements.",
    tags: ["Interest Calc", "Statements", "Transaction Ledger"],
  },
  {
    icon: "📈",
    name: "Reports & Analytics",
    text: "Generate monthly, quarterly, and annual financial summaries, loan performance reports, and member activity analytics with export support.",
    tags: ["PDF Export", "Charts", "Audit Trail"],
  },
  {
    icon: "⚙️",
    name: "Staff Administration",
    text: "Manage staff accounts, assign roles and permissions, monitor activity logs, and control system access levels with full oversight.",
    tags: ["Role Assignment", "Activity Logs", "Permissions"],
  },
  {
    icon: "🔔",
    name: "Notifications Centre",
    text: "Automated in-app and email notifications for loan approvals, repayment reminders, account updates, and important system events.",
    tags: ["In-App Alerts", "Email", "Reminders"],
  },
];

export default function Modules() {
  return (
    <section id="modules" className="py-24 bg-[#FAF6EF]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.1em] uppercase text-[#C8963E] mb-4">
            <span className="block w-6 h-0.5 bg-[#C8963E] rounded-full" />
            System Modules
          </span>
          <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-extrabold text-[#0B1D3A] leading-[1.15] mb-5">
            Comprehensive Automation
            <br />
            Across Every Department
          </h2>
          <p className="text-[17px] text-gray-500 leading-relaxed max-w-[560px]">
            Each module is purpose-built to digitise and streamline a specific
            administrative function of the credit union.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MODULES.map((mod) => (
            <div
              key={mod.name}
              className="bg-white border-[1.5px] border-gray-200 rounded-2xl p-7 flex gap-5 items-start hover:border-[#C8963E] hover:shadow-[0_4px_20px_rgba(11,29,58,0.1)] hover:-translate-y-0.5 transition-all duration-300 group"
            >
              {/* Icon */}
              <div className="w-[52px] h-[52px] rounded-xl bg-gradient-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center text-[22px] flex-shrink-0 shadow-[0_4px_12px_rgba(200,150,62,0.3)] group-hover:shadow-[0_6px_18px_rgba(200,150,62,0.45)] transition-shadow duration-300">
                {mod.icon}
              </div>

              <div className="min-w-0">
                <h3 className="font-serif text-[18px] font-bold text-[#0B1D3A] mb-2">
                  {mod.name}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">
                  {mod.text}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mod.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#0B1D3A]/7 text-[#122549]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
