// Escáner QR con react-qr-scanner que manda cada código a /asistencias/qr
import { useRef, useState } from "react";
import { useLogout, useRefresh } from "react-admin";
import { Stack, Typography } from "@mui/material";
import { Scanner, setZXingModuleOverrides } from "@yudiel/react-qr-scanner";
import type {
  IDetectedBarcode,
  IScannerError,
  IScannerProps,
} from "@yudiel/react-qr-scanner";
import lectorWasm from "zxing-wasm/reader/zxing_reader.wasm?url";
import { DialogoAccesible, INCIDENCIAS } from "./comunes";

// setZXingModuleOverrides sirve el wasm del lector desde el propio servidor sin CDN
setZXingModuleOverrides({
  locateFile: (ruta: string, prefijo: string) =>
    ruta.endsWith(".wasm") ? lectorWasm : prefijo + ruta,
});

// Opciones fuera del render para no reiniciar la cámara y solo qr_code
const FORMATOS: IScannerProps["formats"] = ["qr_code"];
// Resolución ideal en constraints sin mínimo para que sirvan webcams sencillas
const CAMARA = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
};
// Apaga los controles extra de la librería y solo queda el video
const SIN_EXTRAS = { finder: false, torch: false, onOff: false, zoom: false };
// Video pequeño con aspectRatio 4/3 como una webcam normal
const TAMANO = {
  container: { width: 320, maxWidth: "100%", aspectRatio: "4/3" },
};

// Textos repetidos que mandan a elegir la incidencia en la lista
const ALTERNATIVA = "Puedes elegir la incidencia de cada alumno en la lista.";
const SIN_RED =
  "No se pudo marcar (revisa la conexión). Elige la incidencia en la lista.";

// Tipo del JSON que responde POST /asistencias/qr
type Respuesta = {
  motivo?: string;
  alumno?: string;
  grupo?: string;
  incidencia?: string;
};

// Convierte status y motivo en un mensaje con el nombre del alumno
const avisoDeRespuesta = (estado: number, datos: Respuesta) => {
  if (estado === 200) return `${datos.alumno}: Presente`;
  if (datos.motivo === "ya presente")
    return `${datos.alumno} ya estaba presente.`;
  if (datos.motivo === "otro grupo") {
    return `${datos.alumno} es de ${datos.grupo}, no de este grupo.`;
  }
  if (datos.motivo === "no está en el pase") {
    return `${datos.alumno} no está en este pase de lista.`;
  }
  if (datos.motivo === "no existe") {
    return "Este código no es de ningún alumno de SIRAI.";
  }
  if (datos.motivo === "pase cerrado") {
    return "El pase de lista ya está cerrado; ya no se puede marcar.";
  }
  if (datos.motivo === "requiere alta") {
    return `${datos.alumno} requiere alta de Enfermería para ingresar.`;
  }
  // Con otra incidencia previa el backend la respeta y se muestra cuál
  if (datos.motivo === "tiene incidencia") {
    const incidencia =
      INCIDENCIAS[datos.incidencia ?? ""]?.nombre ?? "otra incidencia";
    return `${datos.alumno} ya tiene «${incidencia}». Si de verdad llegó, cámbialo en la lista.`;
  }
  // El 403 genérico va al final porque los otros traen motivo
  if (estado === 403) return "No tienes permiso para marcar a este grupo.";
  return SIN_RED;
};

// Mensaje según error.kind de la cámara con la lista como alternativa
const avisoDeCamara = (error: IScannerError) => {
  if (error.kind === "permission-denied") {
    return `No diste permiso para usar la cámara. ${ALTERNATIVA} Para usar la cámara, permítela en la configuración del navegador y vuelve a abrir el escáner.`;
  }
  if (error.kind === "no-camera") {
    return `No se encontró ninguna cámara. ${ALTERNATIVA}`;
  }
  if (error.kind === "in-use") {
    return `Otra aplicación está usando la cámara; ciérrala y vuelve a abrir el escáner. ${ALTERNATIVA}`;
  }
  if (error.kind === "insecure-context") {
    return `La cámara solo funciona si SIRAI se abre con https. ${ALTERNATIVA}`;
  }
  return `No se pudo usar la cámara. ${ALTERNATIVA}`;
};

// Scanner pide la cámara al montarse y la apaga al cerrar
const EscanerCredencial = ({
  grupoId,
  fecha,
  onClose,
}: {
  grupoId: number;
  fecha: string;
  onClose: () => void;
}) => {
  const [aviso, setAviso] = useState("");
  const [sinCamara, setSinCamara] = useState(false);
  // useRef guarda los códigos de la lectura anterior sin redibujar
  const anteriores = useRef<string[]>([]);
  const refresh = useRefresh();
  const logout = useLogout();

  // fetch con token de sessionStorage en vez del dataProvider para mensajes propios
  const marcar = async (codigo: string) => {
    try {
      const res = await fetch(
        import.meta.env.VITE_BACKEND + "/asistencias/qr",
        {
          method: "POST",
          headers: new Headers({
            "Content-Type": "application/json",
            Authentication: sessionStorage.getItem("auth") ?? "",
          }),
          body: JSON.stringify({ codigo, grupoId, fecha }),
        },
      );
      // Con 401 la sesión venció y logout lleva al login
      if (res.status === 401) {
        logout();
        return;
      }
      // Si la respuesta no trae JSON queda un objeto vacío
      const datos: Respuesta = await res.json().catch(() => ({}));
      setAviso(avisoDeRespuesta(res.status, datos));
      // Con res.ok refresh actualiza la tabla para mostrar al alumno Presente
      if (res.ok) refresh();
    } catch {
      // Error de fetch sin respuesta casi siempre por falta de red
      setAviso(SIN_RED);
    }
  };

  // includes descarta los códigos ya leídos para evitar envíos duplicados
  const alLeer = (codigos: IDetectedBarcode[]) => {
    const valores = codigos.map((codigo) => codigo.rawValue);
    valores
      .filter((valor) => !anteriores.current.includes(valor))
      .forEach(marcar);
    anteriores.current = valores;
  };

  // onError activa sinCamara para quitar el video negro y explica el fallo
  const alFallarCamara = (error: IScannerError) => {
    setSinCamara(true);
    setAviso(avisoDeCamara(error));
  };

  // role="status" montado y vacío para que el lector lea cada resultado
  return (
    <DialogoAccesible abierto titulo="Escanear credencial" onClose={onClose}>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="body2">
          Pon el código QR de la credencial frente a la cámara.
        </Typography>
        {!sinCamara && (
          <Scanner
            onScan={alLeer}
            onError={alFallarCamara}
            formats={FORMATOS}
            constraints={CAMARA}
            components={SIN_EXTRAS}
            styles={TAMANO}
            sound={false}
          />
        )}
        <Typography role="status" sx={{ minHeight: 24 }}>
          {aviso}
        </Typography>
      </Stack>
    </DialogoAccesible>
  );
};

// Export default porque lazy() en asistencias.tsx lo requiere
export default EscanerCredencial;
