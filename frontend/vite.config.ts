// Configuración de Vite con defineConfig y el plugin de React

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    // Con host en true el servidor escucha en la red local
    host: true,
    // HTTPS con certificados autofirmados porque la cámara solo funciona con HTTPS
    https: {
      key: fs.readFileSync("./frontend.key"),
      cert: fs.readFileSync("./frontend.crt"),
    },
  },
  build: {
    // sourcemap solo en modo development para depurar con el código original
    sourcemap: mode === "development",
  },
  // Rutas relativas con base para servir el build desde una subcarpeta
  base: "./",
}));
