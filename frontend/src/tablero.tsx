// Tablero del supervisor, la pantalla de inicio con la asistencia de cada estancia por día.
// Si entra una docente o Enfermería, desde aquí le mando su propio inicio.
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

// Columna de inscritos: cuántos alumnos activos tiene la estancia de ese renglón.
const Inscritos = () => {
  const estancia = useRecordContext();
  // Truco para contar: pido solo 1 registro y leo el total que el backend manda en el header.
  // Así sé cuántos hay sin descargar la lista completa.
  const { total, isPending, error } = useGetList(
    "alumnos",
    {
      filter: { estanciaId: estancia?.id, activo: true },
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: !!estancia },
  );

  // Mientras carga o si falla lo digo con texto, para que la celda no se quede vacía.
  if (isPending) return <span>Cargando…</span>;
  if (error) return <span>Datos no disponibles</span>;

  return <span>{total}</span>;
};

// Columna de porcentaje: presentes entre los ya marcados. Solo Presente cuenta como asistencia; las 4 faltas
// no, y los sin marcar no cuentan para que un pase que va a la mitad no haga ver peor a la estancia.
const PorcentajeAsistencia = ({ fecha }: { fecha: string }) => {
  const estancia = useRecordContext();
  // Tres conteos con el truco de 1 registro: presentes, todos y sin marcar. Marcados = todos menos sin marcar.
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
  // Si nadie está marcado todavía pongo un guion en lugar de 0 %.
  if (marcados === 0) return <span>—</span>;

  return <span>{Math.round(((presentes.total ?? 0) / marcados) * 100)} %</span>;
};

// Estado de la estancia: Normal desde 90 %, Atención de 60 a 89 % y Crítico abajo de 60 %.
// Pide lo mismo que el porcentaje y React Admin reusa esa respuesta en vez de pedirla otra vez.
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
  // Si no han pasado lista no la pongo en Crítico, solo aviso que no hay pase.
  if (marcados === 0) {
    return (
      <Typography component="span" variant="body2" color="textSecondary">
        <SinDatosIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> Sin
        pase de lista
      </Typography>
    );
  }

  // Uso el porcentaje redondeado para que siempre coincida con el que se ve en la tabla.
  const porcentaje = Math.round(((presentes.total ?? 0) / marcados) * 100);
  // Cada estado lleva ícono y texto además del color, para que no dependa solo del color.
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

// Columna del pase de lista: cuento los grupos de la estancia y los pases cerrados ese día.
// En pases solo se guardan los cerrados, así que cada pase es un grupo que ya terminó.
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
  // Completo solo cuando todos los grupos ya cerraron. Reviso que haya grupos para que una
  // estancia sin grupos no salga como Completo.
  if (totalGrupos > 0 && cerrados === totalGrupos) {
    return (
      <Typography component="span" variant="body2" color="success">
        <CerradoIcon fontSize="small" sx={{ verticalAlign: "middle" }} />{" "}
        Completo
      </Typography>
    );
  }
  // Si ya cerraron algunos pero no todos, digo cuántos van, por ejemplo 2 de 4 grupos.
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

// Las cuatro tarjetas de arriba. Pido todas las asistencias del día de una vez y hago
// las cuentas aquí, para no hacer una petición por cada estancia.
const ResumenDelDia = ({ fecha }: { fecha: string }) => {
  // 1000 es un tope alto para que lleguen todas las asistencias del día en una página.
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

  // Separo presentes y marcados (todo lo que no está sin marcar), igual que en la tabla.
  const presentes = asistencias.data.filter((a) => a.estado === "presente");
  const conMarca = asistencias.data.filter((a) => a.estado !== "pendiente");
  const marcados = conMarca.length;
  // Porcentaje de cada estancia con la misma fórmula de la tabla, o null si nadie está marcado.
  const porcentajes = estancias.data.map((estancia) => {
    const p = presentes.filter(
      (asistencia) => asistencia.estanciaId === estancia.id,
    ).length;
    const m = conMarca.filter(
      (asistencia) => asistencia.estanciaId === estancia.id,
    ).length;
    return m === 0 ? null : Math.round((p / m) * 100);
  });
  // Cuento las estancias en Crítico y en Atención con los mismos límites del estado.
  const criticas = porcentajes.filter((p) => p !== null && p < 60).length;
  const enAtencion = porcentajes.filter(
    (p) => p !== null && p >= 60 && p < 90,
  ).length;

  // En pantalla chica las tarjetas van en una sola columna, en tablet de dos en dos y en compu las cuatro.
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

// La pantalla completa del tablero. La exporto porque App.tsx la usa como dashboard.
export const Tablero = () => {
  // Reviso el rol porque el profe pidió permisos por rol y el tablero es solo del supervisor.
  const { permissions, isPending } = usePermissions();
  // La fecha que se está viendo. Empieza en hoy, con la fecha local en formato AAAA-MM-DD.
  const [fecha, setFecha] = useState(new Date().toLocaleDateString("en-CA"));
  // En pantalla chica cambio la tabla por una lista simple para que no haya scroll de lado.
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));

  // Mientras no sé el rol no dibujo nada, para no enseñar el tablero por error.
  if (isPending) return <span>Cargando…</span>;

  // Cada rol tiene su inicio: Enfermería el suyo, la docente el de ella y el supervisor este tablero.
  if (permissions === "enfermeria") return <InicioEnfermeria />;
  if (permissions !== "supervisor") {
    return <InicioDocente />;
  }

  // La fecha en palabras para el subtítulo. Le pongo las 12:00 para que la zona horaria
  // no la recorra al día anterior.
  const fechaLarga = fecha
    ? new Date(fecha + "T12:00").toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Elige una fecha";

  // Título, fecha, tarjetas y tabla. La tabla va sin paginación porque son pocas estancias
  // y WAVE marcaba el selector de filas por página; con perPage 100 salen todas.
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
            // El título de la tarjeta le da nombre a la tabla para el lector de pantalla.
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
