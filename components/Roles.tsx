const ROLES = [
  {
    badge: "Admin",
    name: "System Administrator",
    description:
      "Full system control with unrestricted access to all modules, user management, financial data, and configuration settings.",
    permissions: [
      "Manage all staff accounts",
      "Configure system settings",
      "Access all reports & analytics",
      "Approve or reject any transaction",
      "View full audit trail",
      "Manage all member records",
    ],
    cardClass: "bg-[#0B1D3A]",
    accentGlow: "shadow-[inset_0_0_60px_rgba(200,150,62,0.05)]",
  },
  {
    badge: "Staff",
    name: "Credit Union Officer",
    description:
      "Handles day-to-day member services including registrations, loan processing, deposits, and withdrawals.",
    permissions: [
      "Register new members",
      "Process loan applications",
      "Record deposits & withdrawals",
      "Generate member statements",
      "View assigned reports",
    ],
    cardClass: "bg-gradient-to-br from-[#1A3560] to-[#122549]",
    accentGlow: "shadow-[inset_0_0_60px_rgba(200,150,62,0.04)]",
  },
  {
    badge: "Member",
    name: "Credit Union Member",
    description:
      "Self-service portal for members to view their financial information, track loan status, and apply for services online.",
    permissions: [
      "View account balance",
      "Check loan status",
      "Download account statements",
      "Apply for loans online",
      "Update personal profile",
    ],
    cardClass: "bg-[#0f2040]",
    accentGlow: "shadow-[inset_0_0_60px_rgba(200,150,62,0.03)]",
  },
];

export default function Roles() {
  return (
    <section id="roles" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#C8963E] mb-4">
            <span className="block w-6 h-0.5 bg-[#C8963E] rounded-full" />
            User Access Control
          </span>
          <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-extrabold text-[#0B1D3A] leading-[1.15] mb-5">
            Designed for Every Role
            <br />
            in Your Organisation
          </h2>
          <p className="text-[17px] text-gray-500 leading-relaxed max-w-140">
            Three distinct access levels ensure every user sees and does exactly
            what they need — nothing more.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROLES.map((role) => (
            <div
              key={role.name}
              className={`${role.cardClass} ${role.accentGlow} rounded-4xl p-8 text-white relative overflow-hidden hover:-translate-y-1 transition-transform duration-300`}
            >
              {/* Decorative corner circle */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#C8963E]/6 pointer-events-none" />

              {/* Role badge */}
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.08em] uppercase bg-[#C8963E]/15 text-[#E4B86A] border border-[#C8963E]/25 mb-5">
                {role.badge}
              </span>

              <h3 className="font-serif text-[22px] font-extrabold text-white mb-3 leading-tight">
                {role.name}
              </h3>
              <p className="text-sm text-white/55 leading-relaxed mb-6">
                {role.description}
              </p>

              <ul className="space-y-2.5">
                {role.permissions.map((perm) => (
                  <li
                    key={perm}
                    className="flex items-start gap-2.5 text-[13px] text-white/70"
                  >
                    <span className="text-[#C8963E] font-bold text-xs mt-0.5 shrink-0">
                      ✓
                    </span>
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
