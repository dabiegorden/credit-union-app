const STEPS = [
  {
    number: "01",
    title: "Member Onboarding",
    description:
      "Staff registers new members with personal details, ID verification, and initial share contribution captured securely and digitally.",
  },
  {
    number: "02",
    title: "Account Activation",
    description:
      "Member accounts are activated, linked to savings products, and a unique member ID is auto-generated for all future transactions.",
  },
  {
    number: "03",
    title: "Service Transactions",
    description:
      "Members apply for loans, make deposits or withdrawals — all validated server-side and logged in real-time for full traceability.",
  },
  {
    number: "04",
    title: "Reports & Insights",
    description:
      "Management generates comprehensive financial reports and audit trails with a single click, ensuring compliance and strategic oversight.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 bg-[#0B1D3A] relative overflow-hidden"
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-linear(ellipse_80%_50%_at_50%_100%,rgba(200,150,62,0.07),transparent)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#E4B86A] mb-4">
            <span className="block w-6 h-0.5 bg-[#C8963E] rounded-full" />
            Simple Process
          </span>
          <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-extrabold text-white leading-[1.15] mb-5">
            From Registration to Report
            <br />
            in Four Simple Steps
          </h2>
          <p className="text-[17px] text-white/55 leading-relaxed max-w-140">
            The system guides staff through every workflow with clear,
            structured steps that minimise errors and save time.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-9 left-[calc(12.5%+16px)] right-[calc(12.5%+16px)] h-px bg-linear-to-r from-transparent via-[#C8963E]/30 to-transparent" />

          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="flex flex-col items-center text-center group"
            >
              {/* Number circle */}
              <div className="relative w-18 h-18 rounded-full bg-[#C8963E]/10 border-2 border-[#C8963E]/30 flex items-center justify-center mb-5 z-10 group-hover:bg-[#C8963E]/20 group-hover:border-[#C8963E]/60 transition-all duration-300">
                <span className="font-serif text-[26px] font-black text-[#C8963E]">
                  {step.number}
                </span>
              </div>

              <h3 className="font-serif text-[17px] font-bold text-white mb-2.5">
                {step.title}
              </h3>
              <p className="text-[13.5px] text-white/50 leading-[1.65]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
