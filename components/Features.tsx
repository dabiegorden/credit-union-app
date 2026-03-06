const FEATURES = [
  {
    icon: "👤",
    name: "Member Management",
    text: "Register and manage member profiles with complete KYC data, account history, and real-time status tracking in one centralized system.",
  },
  {
    icon: "💰",
    name: "Loan Processing",
    text: "Automate the entire loan lifecycle — from application and eligibility checks to approval workflows, disbursement, and repayment tracking.",
  },
  {
    icon: "🏦",
    name: "Savings Management",
    text: "Track individual savings accounts with automated interest calculation, full transaction history, and withdrawal management built right in.",
  },
  {
    icon: "📊",
    name: "Financial Reporting",
    text: "Generate detailed reports on member activity, loan portfolios, and financial summaries — exportable in PDF or Excel format instantly.",
  },
  {
    icon: "🔔",
    name: "Notifications & Alerts",
    text: "Automated alerts for loan due dates, application status updates, and system events keep staff and members informed in real-time.",
  },
  {
    icon: "🛡️",
    name: "Role-Based Access",
    text: "Fine-grained permission system ensures staff, managers, and members only access data and features relevant to their specific role.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.1em] uppercase text-[#C8963E] mb-4">
            <span className="block w-6 h-0.5 bg-[#C8963E] rounded-full" />
            Platform Capabilities
          </span>
          <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-extrabold text-[#0B1D3A] leading-[1.15] mb-5">
            Everything You Need to Run
            <br />a Modern Credit Union
          </h2>
          <p className="text-[17px] text-gray-500 leading-relaxed max-w-[560px]">
            Built with modern web technologies to give your staff and members a
            seamless digital banking experience.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.name}
              className="group relative bg-[#FAF6EF] border-[1.5px] border-transparent hover:border-[#C8963E] rounded-2xl p-8 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(11,29,58,0.12)] transition-all duration-300 overflow-hidden"
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C8963E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />

              {/* Icon */}
              <div className="relative w-14 h-14 rounded-[14px] bg-gradient-to-br from-[#0B1D3A] to-[#1A3560] flex items-center justify-center text-2xl mb-5 shadow-[0_6px_20px_rgba(11,29,58,0.25)]">
                {f.icon}
              </div>

              <h3 className="font-serif text-xl font-bold text-[#0B1D3A] mb-2.5 relative">
                {f.name}
              </h3>
              <p className="text-[14.5px] text-gray-500 leading-[1.65] relative">
                {f.text}
              </p>

              <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-[#C8963E] mt-5 group-hover:gap-3 transition-all duration-200">
                Learn more →
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
