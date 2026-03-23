module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        label: ["var(--font-label)"],
      },
      colors: {
        arenaBg: "#0d0d1c",
        arenaSurface: "#121222",
        arenaSurfaceHi: "#1e1e32",
        arenaSurfaceMax: "#24243a",
        arenaText: "#e9e6fc",
        arenaMuted: "#aba9be",
        arenaElectric: "#c799ff",
        arenaPulse: "#ff63c2",
        arenaBeam: "#81ecff",
        arenaDanger: "#ff6e84",
      },
      boxShadow: {
        glow: "0 0 18px rgba(199, 153, 255, 0.22)",
        pulse: "0 0 22px rgba(255, 99, 194, 0.28)",
      },
      dropShadow: {
        neon: "0 0 18px rgba(199,153,255,0.4)",
      },
      borderRadius: {
        shell: "2rem",
      },
      backgroundImage: {
        "arena-grid":
          "radial-gradient(circle at top, rgba(199,153,255,0.14), transparent 38%), linear-gradient(120deg, rgba(255,99,194,0.08), transparent 34%), linear-gradient(180deg, #0d0d1c 0%, #111122 48%, #0d0d1c 100%)",
      },
    },
  },
  plugins: [],
};
