// Tablero del supervisor por estancia y otros roles van a su inicio
import { useState } from "react";
import {
  List,
  DataTable,
  SimpleList,
  useRecordContext,
  useGetList,
  usePermissions,
} from "react-admin";
import {
  Card,
  CardHeader,
  Grid,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  Theme,
} from "@mui/material";
import NormalIcon from "@mui/icons-material/CheckCircle";
import AtencionIcon from "@mui/icons-material/Warning";
import CriticoIcon from "@mui/icons-material/Error";
import SinDatosIcon from "@mui/icons-material/HelpOutline";
import GeneralIcon from "@mui/icons-material/Groups";
import CerradoIcon from "@mui/icons-material/Lock";
import EnCursoIcon from "@mui/icons-material/Pending";
import SinCerrarIcon from "@mui/icons-material/LockOpen";
import { InicioDocente } from "./inicioDocente";
import { InicioEnfermeria } from "./inicioEnfermeria";
import { SeguimientosAbiertos, TarjetaResumen } from "./comunes";

// Columna Inscritos cuenta los alumnos activos de la estancia
const Inscritos = () => {
  const estancia = useRecordContext();
  // perPage 1 para leer el total de X-Total-Count sin traer la lista
  const { total, isPending, error } = useGetList(
    "alumnos",
    {
      filter: { estanciaId: estancia?.id, activo: true },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );

  // Texto de carga o error para que la celda no quede vacía
  if (isPending) return <span>Cargando…</span>;
  if (error) return <span>Datos no disponibles</span>;

  return <span>{total}</span>;
};

// Porcentaje de presentes entre marcados sin contar los pendientes
const PorcentajeAsistencia = ({ fecha }: { fecha: string }) => {
  const estancia = useRecordContext();
  // Tres useGetList con perPage 1 para presentes todos y pendientes
  const presentes = useGetList(
    "asistencias",
    {
      filter: { estanciaId: estancia?.id, fecha, estado: "presente" },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );
  const todos = useGetList(
    "asistencias",
    {
      filter: { estanciaId: estancia?.id, fecha },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );
  const pendientes = useGetList(
    "asistencias",
    {
      filter: { estanciaId: estancia?.id, fecha, estado: "pendiente" },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );

  if (presentes.isPending || todos.isPending || pendientes.isPending) {
    return <span>Cargando…</span>;
  }
  if (presentes.error || todos.error || pendientes.error) {
    return <span>Datos no disponibles</span>;
  }

  const marcados = (todos.total ?? 0) - (pendientes.total ?? 0);
  // Sin marcados se muestra un guion para no dividir entre cero
  if (marcados === 0) return <span>—</span>;

  return <span>{Math.round(((presentes.total ?? 0) / marcados) * 100)} %</span>;
};

// Estado según el porcentaje con los mismos useGetList ya cargados
const EstadoAsistencia = ({ fecha }: { fecha: string }) => {
  const estancia = useRecordContext();
  const presentes = useGetList(
    "asistencias",
    {
      filter: { estanciaId: estancia?.id, fecha, estado: "presente" },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );
  const todos = useGetList(
    "asistencias",
    {
      filter: { estanciaId: estancia?.id, fecha },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );
  const pendientes = useGetList(
    "asistencias",
    {
      filter: { estanciaId: estancia?.id, fecha, estado: "pendiente" },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );

  if (presentes.isPending || todos.isPending || pendientes.isPending) {
    return <span>Cargando…</span>;
  }
  if (presentes.error || todos.error || pendientes.error) {
    return <span>Datos no disponibles</span>;
  }

  const marcados = (todos.total ?? 0) - (pendientes.total ?? 0);
  // Sin marcados se muestra Sin pase de lista y no Crítico
  if (marcados === 0) {
    return (
      <Typography component="span" variant="body2" color="textSecondary">
        <SinDatosIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> Sin
        pase de lista
      </Typography>
    );
  }

  // Math.round igual que la columna para que estado y porcentaje coincidan
  const porcentaje = Math.round(((presentes.total ?? 0) / marcados) * 100);
  // Cada estado lleva ícono y texto para no depender solo del color
  if (porcentaje >= 90) {
    return (
      <Typography component="span" variant="body2" color="success">
        <NormalIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> Normal
      </Typography>
    );
  }
  if (porcentaje >= 60) {
    return (
      <Typography component="span" variant="body2" color="warning">
        <AtencionIcon fontSize="small" sx={{ verticalAlign: "middle" }} />{" "}
        Atención
      </Typography>
    );
  }
  return (
    <Typography component="span" variant="body2" color="error">
      <CriticoIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> Crítico
    </Typography>
  );
};

// Compara los grupos de la estancia con los pases cerrados del día
const PaseDeLaEstancia = ({ fecha }: { fecha: string }) => {
  const estancia = useRecordContext();
  const grupos = useGetList(
    "grupos",
    {
      filter: { estanciaId: estancia?.id },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );
  const pases = useGetList(
    "pases",
    {
      filter: { estanciaId: estancia?.id, fecha },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );

  if (grupos.isPending || pases.isPending) return <span>Cargando…</span>;
  if (grupos.error || pases.error) return <span>Datos no disponibles</span>;

  const totalGrupos = grupos.total ?? 0;
  const cerrados = pases.total ?? 0;
  // Una estancia sin grupos no cuenta como Completo
  if (totalGrupos > 0 && cerrados === totalGrupos) {
    return (
      <Typography component="span" variant="body2" color="success">
        <CerradoIcon fontSize="small" sx={{ verticalAlign: "middle" }} />{" "}
        Completo
      </Typography>
    );
  }
  // Con algunos pases cerrados se muestra cuántos grupos van
  if (cerrados > 0) {
    return (
      <Typography component="span" variant="body2" color="warning">
        <EnCursoIcon fontSize="small" sx={{ verticalAlign: "middle" }} />{" "}
        {cerrados} de {totalGrupos} grupos
      </Typography>
    );
  }
  return (
    <Typography component="span" variant="body2" color="textSecondary">
      <SinCerrarIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> Sin
      cerrar
    </Typography>
  );
};

// Tarjetas del día con un solo useGetList de asistencias
const ResumenDelDia = ({ fecha }: { fecha: string }) => {
  // perPage alto para traer todas las asistencias del día en una página
  const asistencias = useGetList("asistencias", {
    filter: { fecha },
    pagination: { page: 1, perPage: 1000 },
  });
  const estancias = useGetList("estancias", {
    pagination: { page: 1, perPage: 100 },
  });

  if (asistencias.isPending || estancias.isPending) {
    return <span>Cargando…</span>;
  }
  if (asistencias.error || estancias.error) {
    return <span>Datos no disponibles</span>;
  }

  // Separa presentes y marcados con filter igual que la tabla
  const presentes = asistencias.data.filter((a) => a.estado === "presente");
  const conMarca = asistencias.data.filter((a) => a.estado !== "pendiente");
  const marcados = conMarca.length;
  // Porcentaje por estancia con map o null si no hay marcados
  const porcentajes = estancias.data.map((estancia) => {
    const p = presentes.filter(
      (asistencia) => asistencia.estanciaId === estancia.id,
    ).length;
    const m = conMarca.filter(
      (asistencia) => asistencia.estanciaId === estancia.id,
    ).length;
    return m === 0 ? null : Math.round((p / m) * 100);
  });
  // Cuenta estancias en Crítico y en Atención según el porcentaje
  const criticas = porcentajes.filter((p) => p !== null && p < 60).length;
  const enAtencion = porcentajes.filter(
    (p) => p !== null && p >= 60 && p < 90,
  ).length;

  // Grid con size responsivo para acomodar las tarjetas según la pantalla
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TarjetaResumen
          titulo="Asistencia general"
          icono={<GeneralIcon color="primary" />}
          valor={
            marcados === 0
              ? "—"
              : `${Math.round((presentes.length / marcados) * 100)} %`
          }
          detalle={
            marcados === 0
              ? "Sin pase de lista"
              : `${presentes.length} presentes de ${marcados} marcados`
          }
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TarjetaResumen
          titulo="Estancias en Crítico"
          icono={<CriticoIcon color="error" />}
          valor={String(criticas)}
          detalle="menos de 60 % de asistencia"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TarjetaResumen
          titulo="Estancias en Atención"
          icono={<AtencionIcon color="warning" />}
          valor={String(enAtencion)}
          detalle="entre 60 y 89 % de asistencia"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <SeguimientosAbiertos titulo="Seguimientos abiertos" />
      </Grid>
    </Grid>
  );
};

// Pantalla del tablero que App.tsx usa como dashboard de React Admin
export const Tablero = () => {
  // usePermissions da el rol guardado en sessionStorage
  const { permissions, isPending } = usePermissions();
  // useState con la fecha elegida que empieza en hoy
  const [fecha, setFecha] = useState(new Date().toLocaleDateString("en-CA"));
  // useMediaQuery con sm cambia la tabla por SimpleList en pantalla chica
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));

  // Espera isPending para no mostrar el tablero al rol equivocado
  if (isPending) return <span>Cargando…</span>;

  // Enfermería y docente van a su inicio y el supervisor sigue aquí
  if (permissions === "enfermeria") return <InicioEnfermeria />;
  if (permissions !== "supervisor") {
    return <InicioDocente />;
  }

  // Fecha en palabras con toLocaleDateString sin que cambie de día
  const fechaLarga = fecha
    ? new Date(fecha + "T12:00").toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Elige una fecha";

  // pagination en false y perPage 100 porque son pocas estancias
  return (
    <Stack spacing={2} sx={{ mt: 2, maxWidth: 1280 }}>
      <title>Tablero del supervisor · SIRAI</title>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between" }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h1">
            Tablero del supervisor
          </Typography>
          <Typography color="textSecondary">{fechaLarga}</Typography>
        </Stack>
        <TextField
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
          sx={{ width: { xs: "100%", sm: 220 } }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      <ResumenDelDia fecha={fecha} />
      <Card>
        <CardHeader
          title="Asistencia por estancia"
          slotProps={{
            title: { component: "h2", variant: "h6", id: "titulo-estancias" },
          }}
          sx={{ pb: 0 }}
        />
        <List
          resource="estancias"
          title="Tablero del supervisor"
          component="div"
          disableSyncWithLocation
          storeKey={false}
          actions={false}
          exporter={false}
          pagination={false}
          perPage={100}
        >
          {isSmall ? (
            <SimpleList
              primaryText={(record) => record.nombre}
              secondaryText={
                <span>
                  <EstadoAsistencia fecha={fecha} /> ·{" "}
                  <PorcentajeAsistencia fecha={fecha} /> · <Inscritos />{" "}
                  inscritos · Pase: <PaseDeLaEstancia fecha={fecha} />
                </span>
              }
              rowClick={false}
            />
          ) : (
            // aria-labelledby usa el título de la tarjeta como nombre de la tabla
            <DataTable
              aria-labelledby="titulo-estancias"
              bulkActionButtons={false}
              rowClick={false}
            >
              <DataTable.Col source="nombre" label="Estancia" />
              <DataTable.Col label="Inscritos">
                <Inscritos />
              </DataTable.Col>
              <DataTable.Col label="% Asistencia">
                <PorcentajeAsistencia fecha={fecha} />
              </DataTable.Col>
              <DataTable.Col label="Estado">
                <EstadoAsistencia fecha={fecha} />
              </DataTable.Col>
              <DataTable.Col label="Pase de lista">
                <PaseDeLaEstancia fecha={fecha} />
              </DataTable.Col>
            </DataTable>
          )}
        </List>
      </Card>
    </Stack>
  );
};
