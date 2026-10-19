// dataProvider con ra-data-json-server que convierte cada vista en petición HTTP

import { fetchUtils } from "react-admin";
import jsonServerProvider from "ra-data-json-server";

// fetchJson lleva el token en el header Authentication o va vacío
const fetchJsonUtil = (url: string, options: fetchUtils.Options = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: "application/json" });
  }
  (options.headers as Headers).set(
    "Authentication",
    sessionStorage.getItem("auth") ?? "",
  );
  return fetchUtils.fetchJson(url, options);
};

// jsonServerProvider con la URL del backend tomada de import.meta.env
export const dataProvider = jsonServerProvider(
  import.meta.env.VITE_BACKEND,
  fetchJsonUtil,
);
