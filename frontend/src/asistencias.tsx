// Pase de lista donde useUpdate guarda incidencias y useCreate cierra el pase
// Hecho con IA (solo estructura): esqueleto del Exporter exportarAsistencias con fetchRelatedRecords y descargarCSV; las columnas del CSV las escribimos manualmente.
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

// Aviso con role="status" si falla la carga del escáner
const SinEscaner = ({ onClose }: { onClose: () => void }) => (
  <DialogoAccesible abierto titulo="Escanear credencial" onClose={onClose}>
    <Typography role="status">
      No se pudo abrir el escáner (revisa la conexión y recarga la página).
      Mientras, elige la incidencia de cada alumno en la lista.
    </Typography>
  </DialogoAccesible>
);

// Carga diferida del escáner con lazy y SinEscaner si falla el import
const EscanerCredencial = lazy(() =>
  import("./escaner").catch(() => ({ default: SinEscaner })),
);

// Chip de candado si el alumno tiene seguimiento abierto según useGetList
export const CandadoDelAlumno = () => {
  const asistencia = useRecordContext();
  const { data: candados } = useGetList("seguimientos", CANDADOS);
  const conCandado = candados?.some(
    (seguimiento) => seguimiento.alumnoId === asistencia?.alumnoId,
  );
  return conCandado ? <ChipCandado /> : null;
};

// Select nativo de incidencia guardado con useUpdate y usado también en pases.tsx
export const IncidenciaDelAlumno = () => {
  const asistencia = useRecordContext();
  const { permissions } = usePermissions();
  const refresh = useRefresh();
  const [update] = useUpdate();
  // useGetList con perPage 1 para saber si el pase ya se cerró
  const pase = useGetList(
    "pases",
    {
      filter: { grupoId: asistencia?.grupoId, fecha: asistencia?.fecha },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!asistencia },
  );
  // Nombre del alumno con useGetManyAggregate reutilizando los datos de la tabla
  const { data: alumnos } = useGetManyAggregate(
    "alumnos",
    { ids: [asistencia?.alumnoId] },
    { enabled: !!asistencia },
  );
  const { data: candados } = useGetList("seguimientos", CANDADOS);

  if (!asistencia) return null;
  // Solo ChipIncidencia mientras carga o con pase cerrado sin rol supervisor
  const cerrado = (pase.total ?? 0) > 0;
  if (pase.isPending || (cerrado && permissions !== "supervisor")) {
    return <ChipIncidencia estado={asistencia.estado} />;
  }
  const alumno = alumnos?.[0];
  const nombre = alumno ? `${alumno.nombre} ${alumno.apellidos}` : "el alumno";
  const conCandado = !!candados?.some(
    (seguimiento) => seguimiento.alumnoId === asistencia.alumnoId,
  );
  // PUT con useUpdate y refresh si falta id o hay pase cerrado
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

  // Sin disabled para no perder el foco y helperText ligado con aria-describedby
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

// Aviso de faltantes en role="status" con setTimeout para que VoiceOver lo lea
const AvisoFaltantes = ({ texto }: { texto: string }) => {
  const [anunciado, setAnunciado] = useState("");
  // clearTimeout en el return del useEffect si el texto cambia antes
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

// TopToolbar del pase con aviso y botones siempre montada para role="status"
const TerminarPase = () => {
  const { filterValues, data, isPending } = useListContext();
  const { grupoId, fecha } = filterValues;
  // useGetList trae el pase cerrado para mostrar su horaCierre
  const pase = useGetList(
    "pases",
    { filter: { grupoId, fecha }, pagination: { page: 1, perPage: 1 } },
    { enabled: !!grupoId && !!fecha },
  );
  // useGetOne trae el nombre del grupo para el diálogo de confirmación
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
  // useEffect cierra los diálogos si cambian grupoId o fecha
  useEffect(() => {
    setConfirmando(false);
    setEscaneando(false);
  }, [grupoId, fecha]);
  const notify = useNotify();
  const refresh = useRefresh();

  // Calcula si el pase está abierto o cerrado y cuántos faltan
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
  // Con some se apartan los alumnos con candado de marcar todos presentes
  const conCandado = sinMarcar.filter((asistencia) =>
    candados?.some(
      (seguimiento) => seguimiento.alumnoId === asistencia.alumnoId,
    ),
  );
  const aMarcar = sinMarcar.filter(
    (asistencia) => !conCandado.includes(asistencia),
  );

  // Texto de role="status" en singular o plural y vacío sin pase abierto
  let aviso = "";
  if (abierto && faltan === 0) aviso = "Todos los alumnos están marcados";
  if (abierto && faltan === 1) aviso = "Falta 1 alumno por marcar";
  if (abierto && faltan > 1) aviso = `Faltan ${faltan} alumnos por marcar`;

  // Fecha a mediodía para que la zona horaria no reste un día
  const fechaCorta = new Date(fecha + "T12:00").toLocaleDateString("es-MX");

  // useCreate manda el POST y el backend calcula horaCierre y totales
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

  // useUpdateMany marca Presente con un PUT por alumno validado en backend
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
        // Si un PUT falla los demás quedan guardados y refresh lo muestra
        onError: () => {
          notify("No se pudo marcar a todos; revisa la lista", {
            type: "error",
          });
          refresh();
        },
      },
    );
  };

  // Terminar disabled si faltan alumnos con aria-describedby hacia el aviso
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

// Sin asistencias useCreate crea una pendiente por alumno para empezar
const EmpezarPaseDeLista = () => {
  const { filterValues } = useListContext();
  const { identity } = useGetIdentity();
  // useGetList solo pide alumnos con activo true y deja fuera las bajas
  const {
    data: alumnos,
    isPending,
    error,
  } = useGetList(
    "alumnos",
    {
      filter: { grupoId: filterValues.grupoId, activo: true },
      pagination: { page: 1, perPage: 100 },
    },
    { enabled: !!filterValues.grupoId },
  );
  const [create, creacion] = useCreate();

  // Sin grupoId o fecha solo aparece ListaVacia con instrucciones
  if (!filterValues.grupoId || !filterValues.fecha) {
    return <ListaVacia mensaje="Elige un grupo y una fecha para empezar." />;
  }
  if (isPending) return <ListaVacia mensaje="Cargando…" />;
  if (error) return <ListaVacia mensaje="Alumnos no disponibles" />;

  return (
    <ListaVacia mensaje="Este grupo todavía no tiene pase de lista en esta fecha.">
      <Button
        variant="contained"
        sx={{ mt: 2 }}
        disabled={creacion.isPending || alumnos.length === 0}
        onClick={() =>
          alumnos.forEach((alumno) =>
            create("asistencias", {
              data: {
                alumnoId: alumno.id,
                grupoId: alumno.grupoId,
                estanciaId: alumno.estanciaId,
                fecha: filterValues.fecha,
                estado: "pendiente",
                usuarioId: identity?.id,
              },
            }),
          )
        }
      >
        Empezar pase de lista
      </Button>
    </ListaVacia>
  );
};

// Exporter del CSV con fetchRelatedRecords para nombres en vez de ids
const exportarAsistencias: Exporter = async (
  asistencias,
  fetchRelatedRecords,
) => {
  const alumnos = await fetchRelatedRecords(asistencias, "alumnoId", "alumnos");
  const grupos = await fetchRelatedRecords(asistencias, "grupoId", "grupos");
  const filas = asistencias.map((asistencia) => ({
    Fecha: fechaMX(asistencia.fecha),
    Grupo: grupos[asistencia.grupoId]?.nombre ?? "",
    Alumno: `${alumnos[asistencia.alumnoId]?.nombre ?? ""} ${alumnos[asistencia.alumnoId]?.apellidos ?? ""}`,
    Incidencia: INCIDENCIAS[asistencia.estado]?.nombre ?? asistencia.estado,
  }));
  descargarCSV(filas, `asistencias-${asistencias[0]?.fecha ?? ""}`);
};

// aria-label del DataTable con el nombre del grupo traído con useGetOne
const TablaDelPase = () => {
  // useMediaQuery pone la incidencia bajo el nombre en pantalla chica
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  const { filterValues } = useListContext();
  const { data: grupo } = useGetOne(
    "grupos",
    { id: filterValues.grupoId },
    { enabled: !!filterValues.grupoId },
  );
  return (
    <DataTable
      aria-label={grupo ? `Alumnos de ${grupo.nombre}` : "Alumnos"}
      bulkActionButtons={false}
      rowClick={false}
      empty={<EmpezarPaseDeLista />}
    >
      <DataTable.Col source="alumnoId" label="Alumno">
        <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
          <ReferenceField source="alumnoId" reference="alumnos" link={false} />
          <CandadoDelAlumno />
          {isSmall && <IncidenciaDelAlumno />}
        </Stack>
      </DataTable.Col>
      {!isSmall && (
        <DataTable.Col source="estado" label="Incidencia">
          <IncidenciaDelAlumno />
        </DataTable.Col>
      )}
    </DataTable>
  );
};

// List del pase con filtros de grupo y fecha y TerminarPase arriba
export const AsistenciaList = () => {
  const { identity } = useGetIdentity();
  // ReferenceInput muestra solo los grupos del docenteId de useGetIdentity
  const asistenciaFilters = [
    <ReferenceInput
      key="grupoId"
      source="grupoId"
      reference="grupos"
      filter={{ docenteId: identity?.id }}
      queryOptions={{ enabled: !!identity }}
      alwaysOn
    >
      <SelectNativo label="Grupo" emptyText="Elige un grupo" />
    </ReferenceInput>,
    <DateInput key="fecha" source="fecha" label="Fecha" alwaysOn />,
  ];

  // perPage 50 para todo el grupo y storeKey false para iniciar hoy
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Pase de lista"
        ayuda="Elige el grupo y la fecha; elige la incidencia de cada alumno y al final termina el pase."
      />
      <List
        title="Pase de lista"
        filters={asistenciaFilters}
        filterDefaultValues={{ fecha: new Date().toLocaleDateString("en-CA") }}
        sort={{ field: "alumnoId", order: "ASC" }}
        perPage={50}
        storeKey={false}
        exporter={exportarAsistencias}
        actions={<TerminarPase />}
      >
        <TablaDelPase />
      </List>
    </Stack>
  );
};
