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

// Barra de arriba de la lista con el aviso, el escáner y el botón para terminar el pase.
// La dibujo siempre para que el aviso exista desde el principio.
const TerminarPase = () => {
  const { filterValues, data, isPending } = useListContext();
  const { grupoId, fecha } = filterValues;
  // Si ya hay pase cerrado, lo uso para mostrar la hora de cierre.
  const pase = useGetList(
    "pases",
    { filter: { grupoId, fecha }, pagination: { page: 1, perPage: 1 } },
    { enabled: !!grupoId && !!fecha },
  );
  // Traigo el grupo solo para poner su nombre en la pregunta de confirmación.
  const { data: grupo } = useGetOne(
    "grupos",
    { id: grupoId },
    { enabled: !!grupoId },
  );
  const [create, { isPending: cerrando }] = useCreate();
  const [updateMany, { isPending: marcando }] = useUpdateMany();
  const { identity } = useGetIdentity();
  const { data: candados } = useGetList("seguimientos", CANDADOS);
  const [confirmando, setConfirmando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  // Si cambian el grupo o la fecha (por ejemplo con Atrás), cierro los diálogos abiertos.
  useEffect(() => {
    setConfirmando(false);
    setEscaneando(false);
  }, [grupoId, fecha]);
  const notify = useNotify();
  const refresh = useRefresh();

  // Reviso si el pase ya empezó, si ya está cerrado y cuántos alumnos faltan por marcar.
  const hayPase =
    !!grupoId &&
    !!fecha &&
    !isPending &&
    !pase.isPending &&
    !!data &&
    data.length > 0;
  const cerrado = hayPase && !!pase.data && pase.data.length > 0;
  const abierto = hayPase && !cerrado;
  const sinMarcar = abierto
    ? data.filter((asistencia) => asistencia.estado === "pendiente")
    : [];
  const faltan = sinMarcar.length;
  // Para "Marcar a todos presentes" separo a los que tienen candado: a esos no se les puede poner Presente.
  const conCandado = sinMarcar.filter((asistencia) =>
    candados?.some(
      (seguimiento) => seguimiento.alumnoId === asistencia.alumnoId,
    ),
  );
  const aMarcar = sinMarcar.filter(
    (asistencia) => !conCandado.includes(asistencia),
  );

  // Armo el texto del aviso en singular o plural; con el pase cerrado se queda vacío.
  let aviso = "";
  if (abierto && faltan === 0) aviso = "Todos los alumnos están marcados";
  if (abierto && faltan === 1) aviso = "Falta 1 alumno por marcar";
  if (abierto && faltan > 1) aviso = `Faltan ${faltan} alumnos por marcar`;

  // Le pongo mediodía a la fecha porque a medianoche UTC en México salía el día anterior.
  const fechaCorta = new Date(fecha + "T12:00").toLocaleDateString("es-MX");

  // Cierra el pase después de confirmar. Solo mando grupo y fecha; la hora y los totales
  // los calcula el backend.
  const terminar = () => {
    setConfirmando(false);
    create(
      "pases",
      { data: { grupoId, fecha } },
      {
        onSuccess: (nuevo) => {
          if (nuevo?.id) notify("Pase de lista cerrado", { type: "success" });
          refresh();
        },
        onError: () =>
          notify("No se pudo cerrar el pase de lista", { type: "error" }),
      },
    );
  };

  // Marca Presente a todos los que siguen sin marcar y no tienen candado. React Admin manda un PUT por
  // alumno, así cada uno pasa por las mismas revisiones del backend (pase cerrado, candado y log).
  const marcarTodos = () => {
    const pendientesConCandado = conCandado.length;
    updateMany(
      "asistencias",
      {
        ids: aMarcar.map((asistencia) => asistencia.id),
        data: { estado: "presente", usuarioId: identity?.id },
      },
      {
        onSuccess: (ids) => {
          let mensaje = `Se marcaron ${ids?.length ?? 0} alumnos como Presente.`;
          if (pendientesConCandado === 1) {
            mensaje += " 1 alumno requiere alta y sigue sin marcar.";
          }
          if (pendientesConCandado > 1) {
            mensaje += ` ${pendientesConCandado} alumnos requieren alta y siguen sin marcar.`;
          }
          if (ids?.length) notify(mensaje, { type: "success" });
          refresh();
        },
        // Si algún PUT falla, los demás ya se guardaron: recargo para que la lista diga lo que de verdad quedó.
        onError: () => {
          notify("No se pudo marcar a todos; revisa la lista", {
            type: "error",
          });
          refresh();
        },
      },
    );
  };

  // Terminar solo se activa cuando ya no falta nadie, y con aria-describedby el lector
  // dice el aviso para que se sepa por qué está desactivado.
  return (
    <TopToolbar>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { xs: "flex-end", sm: "center" } }}
      >
        <AvisoFaltantes texto={aviso} />
        {cerrado && pase.data && (
          <PaseCerrado horaCierre={pase.data[0].horaCierre} />
        )}
        {abierto && faltan > 0 && (
          <Button
            variant="outlined"
            startIcon={<TodosIcon />}
            disabled={aMarcar.length === 0 || marcando}
            onClick={marcarTodos}
          >
            Marcar a todos presentes
          </Button>
        )}
        {abierto && (
          <Button
            variant="outlined"
            startIcon={<EscanearIcon />}
            onClick={() => setEscaneando(true)}
          >
            Escanear credencial
          </Button>
        )}
        {hayPase && <BotonExportar />}
        {abierto && (
          <Button
            variant="contained"
            startIcon={<TerminarIcon />}
            disabled={faltan > 0 || cerrando}
            aria-describedby={faltan > 0 ? "faltan-por-marcar" : undefined}
            onClick={() => setConfirmando(true)}
          >
            Terminar pase de lista
          </Button>
        )}
      </Stack>
      {abierto && (
        <ConfirmAccesible
          isOpen={confirmando}
          loading={cerrando}
          title="Terminar pase de lista"
          content={`¿Terminar el pase de lista de ${grupo?.nombre ?? "este grupo"} del ${fechaCorta}?`}
          confirm="Terminar"
          cancel="Cancelar"
          onConfirm={terminar}
          onClose={() => setConfirmando(false)}
        />
      )}
      {abierto && escaneando && (
        <Suspense fallback={<CircularProgress size={24} />}>
          <EscanerCredencial
            grupoId={grupoId}
            fecha={fecha}
            onClose={() => setEscaneando(false)}
          />
        </Suspense>
      )}
    </TopToolbar>
  );
};
