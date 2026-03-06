import Link from "next/link";

export default function CTABand() {
  return (
    <section className="relative py-24 bg-gradient-to-br from-[#0B1D3A] to-[#1A3560] overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(200,150,62,0.1),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(200,150,62,0.07),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.1em] uppercase text-[#E4B86A] mb-6">
          <span className="block w-6 h-0.5 bg-[#C8963E] rounded-full" />
          Get Started Today
          <span className="block w-6 h-0.5 bg-[#C8963E] rounded-full" />
        </span>

        <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-black text-white mb-5 leading-[1.15]">
          Ready to Modernise Your
          <br />
          Credit Union Operations?
        </h2>

        <p className="text-[17px] text-white/55 mb-10 leading-relaxed">
          Log in to explore the full dashboard, or contact the system
          administrator to get your staff account activated.
        </p>

        <div className="flex justify-center flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold text-[15px] rounded-xl shadow-[0_6px_24px_rgba(200,150,62,0.4)] hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(200,150,62,0.55)] transition-all duration-200"
          >
            🚀 Access the System
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-white/80 font-semibold text-[15px] rounded-xl border border-white/20 hover:border-[#C8963E] hover:text-[#E4B86A] hover:bg-[#C8963E]/8 transition-all duration-200"
          >
            📩 Contact Administrator
          </Link>
        </div>
      </div>
    </section>
  );
}
