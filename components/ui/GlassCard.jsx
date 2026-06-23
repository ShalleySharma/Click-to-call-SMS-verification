export default function GlassCard({ className = "", children }) {
  return (
    <section
      className={
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-glow " +
        "supports-[backdrop-filter]:bg-white/5 " +
        "transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:border-white/15 " +
        className
      }
    >
      {children}
    </section>
  );
}

