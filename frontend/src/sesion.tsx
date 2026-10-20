// Aviso de sesión por vencer con exp del JWT y POST /renovar

import { useEffect, useRef, useState } from "react";
import { useLogout, useNotify } from "react-admin";
import { ConfirmAccesible } from "./comunes";

// Anticipación de dos minutos para mostrar el aviso antes del vencimiento
const DOS_MINUTOS = 2 * 60 * 1000;

// JWT de 15 minutos y useState guarda token y estado del aviso
export const AvisoSesion = () => {
  const [token, setToken] = useState(sessionStorage.getItem("auth"));
  const [abierto, setAbierto] = useState(false);
  const [renovando, setRenovando] = useState(false);
  const logout = useLogout();
  const notify = useNotify();
  // useRef guarda logout para no reprogramar los setTimeout al navegar
  const cerrarSesion = useRef(logout);
  cerrarSesion.current = logout;

  // Lee exp del JWT con atob y usa 0 si falla
  let vence = 0;
  try {
    const datos = JSON.parse(
      atob((token ?? "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    vence = datos.exp * 1000 || 0;
  } catch {
    vence = 0;
  }

  // useEffect programa el aviso y el logout con setTimeout y los limpia
  useEffect(() => {
    if (!vence) return;
    const aviso = setTimeout(
      () => setAbierto(true),
      vence - Date.now() - DOS_MINUTOS,
    );
    const fin = setTimeout(() => cerrarSesion.current(), vence - Date.now());
    return () => {
      clearTimeout(aviso);
      clearTimeout(fin);
    };
  }, [vence]);

  // renovar pide un token nuevo por POST a /renovar y lo guarda
  const renovar = async () => {
    setRenovando(true);
    // fetch directo con Authentication porque /renovar no es un Resource
    try {
      const res = await fetch(import.meta.env.VITE_BACKEND + "/renovar", {
        method: "POST",
        headers: new Headers({ Authentication: token ?? "" }),
      });
      if (res.status < 200 || res.status >= 300) {
        throw new Error(res.statusText);
      }
      const respuesta = await res.json();
      sessionStorage.setItem("auth", respuesta.token);
      setToken(respuesta.token);
      notify("Listo: tu sesión sigue abierta 15 minutos más", {
        type: "success",
      });
    } catch {
      notify("No se pudo renovar la sesión; vuelve a iniciar sesión", {
        type: "error",
      });
    }
    setRenovando(false);
    setAbierto(false);
  };

  // Hora de vencimiento con toLocaleTimeString en formato de 24 horas
  const hora = new Date(vence).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  // ConfirmAccesible vuelve inert el fondo y mantiene el foco en el diálogo
  return (
    <ConfirmAccesible
      isOpen={abierto}
      loading={renovando}
      title="Tu sesión está por terminar"
      content={`Por seguridad, tu sesión se cerrará a las ${hora}. ¿Quieres seguir conectado?`}
      confirm="Seguir conectado"
      cancel="Ahora no"
      onConfirm={renovar}
      onClose={() => setAbierto(false)}
    />
  );
};
