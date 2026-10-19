// Inicio de la docente con el pase de hoy y sus alumnos
import { Title, useGetIdentity, useGetList, RaRecord } from "react-admin";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import PaseDeListaIcon from "@mui/icons-material/FactCheck";
import AlumnoIcon from "@mui/icons-material/ChildCare";
import CerradoIcon from "@mui/icons-material/Lock";
import FaltaTerminarIcon from "@mui/icons-material/LockOpen";
import EnCursoIcon from "@mui/icons-material/Pending";
import SinEmpezarIcon from "@mui/icons-material/HelpOutline";
import { SeguimientosAbiertos } from "./comunes";

// Chip del estado del pase con ícono y texto además del color
const EstadoDelPase = ({
  total,
  marcados,
  cerrado,
}: {
  total: number;
  marcados: number;
  cerrado: boolean;
}) => {
  // Si el pase ya se cerró regresa el Chip success con candado
  if (cerrado) {
    return <Chip icon={<CerradoIcon />} label="Cerrado" color="success" />;
  }
  // Sin asistencias de hoy el pase aparece como Sin empezar
  if (total === 0) {
    return <Chip icon={<SinEmpezarIcon />} label="Sin empezar" />;
  }
  // Todos marcados pero el pase sigue abierto y falta terminarlo
  if (marcados === total) {
    return (
      <Chip
        icon={<FaltaTerminarIcon />}
        label="Falta terminar"
        color="warning"
      />
    );
  }
  // Pase a medias y el Chip muestra cuántos van marcados del total
  return (
    <Chip
      icon={<EnCursoIcon />}
      label={`${marcados} de ${total} marcados`}
      color="warning"
    />
  );
};

// Renglón por grupo con el estado del pase y botón para tomarlo
const PaseDeHoy = ({ grupo, fecha }: { grupo: RaRecord; fecha: string }) => {
  // Tres useGetList con perPage 1 para leer solo los totales
  const todas = useGetList("asistencias", {
    filter: { grupoId: grupo.id, fecha },
    pagination: { page: 1, perPage: 1 },
  });
  const pendientes = useGetList("asistencias", {
    filter: { grupoId: grupo.id, fecha, estado: "pendiente" },
    pagination: { page: 1, perPage: 1 },
  });
  const pase = useGetList("pases", {
    filter: { grupoId: grupo.id, fecha },
    pagination: { page: 1, perPage: 1 },
  });
  // Enlace a asistencias con grupoId y fecha como filtro en JSON
  const enlace =
    "#/asistencias?filter=" +
    encodeURIComponent(JSON.stringify({ grupoId: grupo.id, fecha }));

  // Avisa con texto si alguna consulta sigue cargando o falló
  if (todas.isPending || pendientes.isPending || pase.isPending) {
    return <span>Cargando…</span>;
  }
  if (todas.error || pendientes.error || pase.error) {
    return <span>Datos no disponibles</span>;
  }

  // Marcados es total menos pendientes y si hay pase ya está cerrado
  const total = todas.total ?? 0;
  const marcados = total - (pendientes.total ?? 0);
  const cerrado = (pase.total ?? 0) > 0;

  // Stack en columna en móvil y aria-label con el nombre del grupo
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{ alignItems: { sm: "center" }, py: 1.5 }}
    >
      <Typography variant="subtitle1" component="h3" sx={{ minWidth: 120 }}>
        {grupo.nombre}
      </Typography>
      <EstadoDelPase total={total} marcados={marcados} cerrado={cerrado} />
      <Button
        variant="contained"
        href={enlace}
        aria-label={`Ir a pase de lista de ${grupo.nombre}`}
        sx={{ ml: { sm: "auto" } }}
      >
        Ir a pase de lista
      </Button>
    </Stack>
  );
};

// Total de alumnos activos del grupo con useGetList y perPage 1
const AlumnosDelGrupo = ({ grupo }: { grupo: RaRecord }) => {
  const { total, isPending, error } = useGetList("alumnos", {
    filter: { grupoId: grupo.id, activo: true },
    pagination: { page: 1, perPage: 1 },
  });

  if (isPending) return <span>Cargando…</span>;
  if (error) return <span>Datos no disponibles</span>;

  return (
    <Stack
      direction="row"
      sx={{ justifyContent: "space-between", alignItems: "center", py: 1 }}
    >
      <Typography>{grupo.nombre}</Typography>
      <Typography variant="h5" component="p">
        {total}
      </Typography>
    </Stack>
  );
};

// Aviso cuando la docente no tiene grupos asignados
const SinGrupos = () => (
  <Typography>
    Aún no tienes grupos asignados. Pídele al administrador que te asigne uno.
  </Typography>
);

// Pantalla de inicio que pide los grupos de la docente con useGetList
export const InicioDocente = () => {
  // useGetIdentity da el id y el nombre de quien inició sesión
  const { identity, isPending: cargandoIdentidad } = useGetIdentity();
  // Fecha local AAAA-MM-DD con formato de Canadá como se guardan asistencias
  const fecha = new Date().toLocaleDateString("en-CA");
  // Fecha de hoy en palabras con formato de México para el subtítulo
  const fechaLarga = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Grupos filtrados por docenteId y enabled espera a que exista identity
  const {
    data: grupos,
    isPending,
    error,
  } = useGetList(
    "grupos",
    {
      filter: { docenteId: identity?.id },
      sort: { field: "nombre", order: "ASC" },
      pagination: { page: 1, perPage: 50 },
    },
    { enabled: !!identity },
  );

  // Si no llega identity avisa en lugar de quedarse cargando
  if (!cargandoIdentidad && !identity) {
    return <span>No se pudo cargar tu usuario. Vuelve a iniciar sesión.</span>;
  }
  if (isPending) return <span>Cargando…</span>;
  if (error) return <span>Datos no disponibles</span>;

  // Saludo con h1 y Grid de tres tarjetas y pase más ancho
  return (
    <Stack spacing={2} sx={{ mt: 2, maxWidth: 1280 }}>
      <Title title="Inicio" />
      <title>Inicio · SIRAI</title>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1">
          Hola, {identity?.fullName}
        </Typography>
        <Typography color="textSecondary">{fechaLarga}</Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              avatar={<PaseDeListaIcon color="primary" />}
              title="Pase de lista de hoy"
              slotProps={{ title: { component: "h2", variant: "subtitle1" } }}
            />
            <CardContent sx={{ pt: 0 }}>
              {grupos.length === 0 ? (
                <SinGrupos />
              ) : (
                <Stack divider={<Divider />}>
                  {grupos.map((grupo) => (
                    <PaseDeHoy key={grupo.id} grupo={grupo} fecha={fecha} />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SeguimientosAbiertos titulo="Alumnos con seguimiento" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              avatar={<AlumnoIcon color="primary" />}
              title="Mis alumnos"
              slotProps={{ title: { component: "h2", variant: "subtitle1" } }}
            />
            <CardContent sx={{ pt: 0 }}>
              {grupos.length === 0 ? (
                <SinGrupos />
              ) : (
                <Stack divider={<Divider />}>
                  {grupos.map((grupo) => (
                    <AlumnosDelGrupo key={grupo.id} grupo={grupo} />
                  ))}
                </Stack>
              )}
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Alumnos inscritos por grupo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};
