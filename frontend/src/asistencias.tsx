// Pantalla de pase de lista: aquí la docente marca a sus alumnos, escanea credenciales
// y termina el pase del día.
import { lazy, Suspense, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  List,
  DataTable,
  ReferenceField,
  ReferenceInput,
  DateInput,
  TopToolbar,
  Exporter,
  useRecordContext,
  useUpdate,
  useUpdateMany,
  useListContext,
  useGetList,
  useGetManyAggregate,
  useGetOne,
  useCreate,
  useGetIdentity,
  usePermissions,
  useNotify,
  useRefresh,
} from "react-admin";
import {
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  Theme,
} from "@mui/material";
import TerminarIcon from "@mui/icons-material/Lock";
import EscanearIcon from "@mui/icons-material/QrCodeScanner";
import TodosIcon from "@mui/icons-material/DoneAll";
import {
  BotonExportar,
  CANDADOS,
  ChipCandado,
  ChipIncidencia,
  ConfirmAccesible,
  DialogoAccesible,
  Encabezado,
  INCIDENCIAS,
  ListaVacia,
  PaseCerrado,
  SelectNativo,
  descargarCSV,
  fechaMX,
} from "./comunes";

// Si no se pudo descargar el escáner (por ejemplo sin internet), muestro este aviso
// en vez de dejar la página en blanco.
const SinEscaner = ({ onClose }: { onClose: () => void }) => (
  <DialogoAccesible abierto titulo="Escanear credencial" onClose={onClose}>
    <Typography role="status">
      No se pudo abrir el escáner (revisa la conexión y recarga la página).
      Mientras, elige la incidencia de cada alumno en la lista.
    </Typography>
  </DialogoAccesible>
);

// El escáner pesa bastante, así que solo se descarga cuando aprietan "Escanear credencial".
// Si la descarga falla, uso SinEscaner para que la página no truene.
const EscanerCredencial = lazy(() =>
  import("./escaner").catch(() => ({ default: SinEscaner })),
);

// Chip "Requiere alta para ingresar" debajo del nombre si el alumno tiene candado de Enfermería.
// Todos los renglones piden la lista de candados, pero es la misma consulta y React Admin la hace una sola vez.
export const CandadoDelAlumno = () => {
  const asistencia = useRecordContext();
  const { data: candados } = useGetList("seguimientos", CANDADOS);
  const conCandado = candados?.some(
    (seguimiento) => seguimiento.alumnoId === asistencia?.alumnoId,
  );
  return conCandado ? <ChipCandado /> : null;
};

// La incidencia de cada renglón. Con el pase abierto es un select nativo: una sola parada de Tab,
// se lee el texto y guarda al cambiar. Lo exporto porque pases.tsx lo usa para que el supervisor corrija.
export const IncidenciaDelAlumno = () => {
  const asistencia = useRecordContext();
  const { permissions } = usePermissions();
  const refresh = useRefresh();
  const [update] = useUpdate();
  // Pregunto si este pase ya se cerró; en pases solo se guardan los cerrados.
  const pase = useGetList(
    "pases",
    {
      filter: { grupoId: asistencia?.grupoId, fecha: asistencia?.fecha },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!asistencia },
  );
  // El nombre sale de la misma caché que la columna Alumno, así no hago más peticiones.
  const { data: alumnos } = useGetManyAggregate(
    "alumnos",
    { ids: [asistencia?.alumnoId] },
    { enabled: !!asistencia },
  );
  const { data: candados } = useGetList("seguimientos", CANDADOS);

  if (!asistencia) return null;
  // Con el pase cerrado la docente solo ve el chip; el supervisor sigue con el select para corregir.
  const cerrado = (pase.total ?? 0) > 0;
  if (pase.isPending || (cerrado && permissions !== "supervisor")) {
    return <ChipIncidencia estado={asistencia.estado} />;
  }
  const alumno = alumnos?.[0];
  const nombre = alumno ? `${alumno.nombre} ${alumno.apellidos}` : "el alumno";
  const conCandado = !!candados?.some(
    (seguimiento) => seguimiento.alumnoId === asistencia.alumnoId,
  );
  // Mando el registro completo con la incidencia nueva. Si el backend no deja (403 por candado), React Admin
  // ya enseñó su mensaje y no regresa id, así que recargo para que el select vuelva a como estaba.
  const cambiar = (evento: ChangeEvent<HTMLInputElement>) =>
    update(
      "asistencias",
      {
        id: asistencia.id,
        data: { ...asistencia, estado: evento.target.value },
        previousData: asistencia,
      },
      {
        onSuccess: (guardada) => {
          if (!guardada?.id || cerrado) refresh();
        },
      },
    );

  // No lo deshabilito mientras guarda para que el foco no se pierda. Con candado, Presente queda
  // deshabilitado y el texto de ayuda dice por qué (MUI lo conecta con aria-describedby).
  return (
    <TextField
      id={`incidencia-${asistencia.id}`}
      select
      size="small"
      value={asistencia.estado}
      onChange={cambiar}
      helperText={
        conCandado
          ? "Enfermería debe darle de alta para marcarlo Presente."
          : undefined
      }
      sx={{ minWidth: 180 }}
      slotProps={{
        select: { native: true },
        htmlInput: { "aria-label": `Incidencia de ${nombre}` },
      }}
    >
      {Object.entries(INCIDENCIAS).map(([valor, incidencia]) => (
        <option
          key={valor}
          value={valor}
          disabled={
            valor === "pendiente" || (valor === "presente" && conCandado)
          }
        >
          {valor === "presente" && conCandado
            ? "Presente (requiere alta)"
            : incidencia.nombre}
        </option>
      ))}
    </TextField>
  );
};

// Aviso de "Faltan N alumnos". Pongo el texto medio segundo después para que VoiceOver
// lo tome como cambio y lo lea también al abrir el pase.
const AvisoFaltantes = ({ texto }: { texto: string }) => {
  const [anunciado, setAnunciado] = useState("");
  // Si el texto cambia antes del medio segundo, cancelo la espera para no poner uno viejo.
  useEffect(() => {
    const espera = setTimeout(() => setAnunciado(texto), 500);
    return () => clearTimeout(espera);
  }, [texto]);
  return (
    <Typography
      id="faltan-por-marcar"
      role="status"
      variant="body2"
      color="textSecondary"
    >
      {anunciado}
    </Typography>
  );
};
