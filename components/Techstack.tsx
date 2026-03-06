const TECH = [
  { icon: "▲", name: "Next.js 15" },
  { icon: "🔷", name: "TypeScript" },
  { icon: "🍃", name: "MongoDB" },
  { icon: "🔗", name: "Mongoose" },
  { icon: "🎨", name: "Tailwind CSS" },
  { icon: "🔑", name: "JWT" },
  { icon: "🔒", name: "Bcrypt.js" },
  { icon: "☁️", name: "Cloudinary" },
];

export default function TechStack() {
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs font-bold tracking-[0.12em] uppercase text-gray-400 mb-8">
          Powered by Industry-Standard Technologies
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {TECH.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FAF6EF] border-[1.5px] border-gray-200 rounded-full text-sm font-semibold text-[#0B1D3A] hover:border-[#C8963E] hover:bg-[#C8963E]/5 hover:text-[#C8963E] transition-all duration-200 cursor-default"
            >
              <span className="text-base">{t.icon}</span>
              {t.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
