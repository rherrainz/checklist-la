export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        reflex: "#001489", // Reflex Blue aprox
        celeste: {
          50:"#eaf6ff",100:"#d6edff",200:"#a8d7ff",300:"#7cc1ff",
          400:"#4daaf7",500:"#2396ee",600:"#1973c3",700:"#145a9b",
          800:"#0f4576",900:"#0b355c"
        }
      }
    }
  },
  plugins: []
}
