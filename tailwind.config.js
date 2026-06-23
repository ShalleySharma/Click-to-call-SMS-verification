/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 30px rgba(59, 130, 246, 0.35)",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(168,85,247,0.25) 50%, rgba(34,197,94,0.18) 100%)",
      },
    },
  },
  plugins: [],
};

