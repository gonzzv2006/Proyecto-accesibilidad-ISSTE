// authProvider de React Admin con login y permisos guardados en sessionStorage

import { AuthProvider } from "react-admin";

export const authProvider: AuthProvider = {
  // Envía usuario y contraseña por POST a /login que no pide token
  login: async ({ username, password }) => {
    const request = new Request(import.meta.env.VITE_BACKEND + "/login", {
      method: "POST",
      body: JSON.stringify({ username: username, password: password }),
      headers: new Headers({ "Content-Type": "application/json" }),
    });

    // try y catch en fetch separan servidor apagado de contraseña incorrecta
    let res: Response;
    try {
      res = await fetch(request);
    } catch {
      throw new Error(
        "No se pudo conectar con el servidor. Revisa que el backend esté encendido y que aceptaste su certificado.",
      );
    }
    // 401 o 400 dan un solo mensaje para no revelar qué falló
    if (res.status === 401 || res.status === 400) {
      throw new Error("Usuario o contraseña incorrectos");
    }
    // Otro status fuera de 2xx se toma como error del servidor
    if (res.status < 200 || res.status >= 300) {
      throw new Error(
        "El servidor tuvo un problema al iniciar sesión. Intenta de nuevo en un momento.",
      );
    }
    // Token en sessionStorage para que se borre al cerrar la pestaña
    const auth = await res.json();
    sessionStorage.setItem("auth", auth.token);
    // Guarda id nombre y rol en identity con JSON.stringify
    sessionStorage.setItem(
      "identity",
      JSON.stringify({ id: auth.id, fullName: auth.nombre, rol: auth.rol }),
    );
    return Promise.resolve();
  },
  // logout borra auth e identity de sessionStorage con removeItem
  logout: () => {
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("identity");
    return Promise.resolve();
  },
  // checkAuth solo revisa que haya token y el 401 lo maneja checkError
  checkAuth: () => {
    return sessionStorage.getItem("auth")
      ? Promise.resolve()
      : Promise.reject();
  },
  // checkError cierra sesión con 401 y con 403 solo avisa
  checkError: (error) => {
    const status = error.status;
    // Con 401 borra auth e identity y rechaza para volver al login
    if (status == 401) {
      sessionStorage.removeItem("auth");
      sessionStorage.removeItem("identity");
      return Promise.reject();
    }
    // Con 403 rechaza sin cerrar sesión y muestra el mensaje del backend
    if (status == 403) {
      return Promise.reject({
        logoutUser: false,
        message: error.body?.message ?? "No tienes permiso para esta acción",
      });
    }
    return Promise.resolve();
  },
  // getPermissions da el rol y solo afecta el menú no los datos
  getPermissions: () => {
    const identity = sessionStorage.getItem("identity");
    return Promise.resolve(identity ? JSON.parse(identity).rol : undefined);
  },
  // getIdentity da fullName para el UserMenu y el id para filtrar grupos
  getIdentity: () => {
    const identity = sessionStorage.getItem("identity");
    if (!identity) {
      return Promise.reject();
    }
    const { id, fullName } = JSON.parse(identity);
    return Promise.resolve({ id: id, fullName: fullName });
  },
};
