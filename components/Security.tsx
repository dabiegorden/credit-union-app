const SECURITY_ITEMS = [
  {
    icon: "🔑",
    name: "JWT Authentication",
    text: "Stateless, token-based authentication with short-lived access tokens and secure HTTP-only refresh token rotation.",
  },
  {
    icon: "🔐",
    name: "Bcrypt Password Hashing",
    text: "All passwords are salted and hashed with bcrypt at 12 rounds, making brute-force attacks computationally infeasible.",
  },
  {
    icon: "✅",
    name: "Input Validation & Sanitisation",
    text: "All data inputs are validated server-side via Mongoose schemas and sanitised to prevent injection and XSS attacks.",
  },
  {
    icon: "📋",
    name: "Full Audit Trail",
    text: "Every transaction and administrative action is time-stamped and logged with user identifiers for accountability.",
  },
];

const SECURITY_CHECKS = [
  "HTTPS / TLS Encrypted",
  "JWT Token Auth Active",
  "Bcrypt v12 Rounds",
  "MongoDB Atlas Secured",
  "Role-Based Access Control",
  "Audit Logs Enabled",
  "Cloudinary Media Secured",
];

export default function Security() {
  return (
    <section id="security" className="py-24 bg-[#FAF6EF]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* ── Left: Text ── */}
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#C8963E] mb-4">
              <span className="block w-6 h-0.5 bg-[#C8963E] rounded-full" />
              Data Protection
            </span>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-extrabold text-[#0B1D3A] leading-[1.15] mb-5">
              Built with Security
              <br />
              at Its Core
            </h2>
            <p className="text-[17px] text-gray-500 leading-relaxed mb-10">
              Every layer of the system is designed with robust security
              mechanisms to protect sensitive member financial data.
            </p>

            <div className="space-y-6">
              {SECURITY_ITEMS.map((item) => (
                <div key={item.name} className="flex gap-4 items-start">
                  <div className="w-11 h-11 rounded-xl bg-[#0B1D3A] flex items-center justify-center text-lg shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[15px] text-[#0B1D3A] mb-1">
                      {item.name}
                    </p>
                    <p className="text-[13.5px] text-gray-500 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Shield Visual ── */}
          <div className="bg-[#0B1D3A] rounded-4xl p-9 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(200,150,62,0.1),transparent_60%)] pointer-events-none" />

            {/* Shield icon */}
            <div className="text-[64px] text-center mb-6 relative z-10">🛡️</div>

            {/* Score */}
            <div className="text-center mb-7 relative z-10">
              <span className="font-serif text-[56px] font-black text-[#C8963E] leading-none block">
                A+
              </span>
              <p className="text-sm text-white/45 mt-1">Security Rating</p>
            </div>

            {/* Checks list */}
            <div className="space-y-2.5 relative z-10">
              {SECURITY_CHECKS.map((check) => (
                <div
                  key={check}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-lg text-sm text-white/65"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  {check}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
