// Inicio de la docente: la saluda y le muestra el pase de lista de hoy de sus grupos, sus
// alumnos con seguimiento y cuántos alumnos tiene. Lo abre tablero.tsx cuando es docente.
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

// Etiqueta de cómo va el pase de hoy de un grupo, siempre con ícono y texto además del color.
const EstadoDelPase = ({
  total,
  marcados,
  cerrado,
}: {
  total: number;
  marcados: number;
  cerrado: boolean;
}) => {
  // Si ya está cerrado no importa lo demás, por eso lo reviso primero.
  if (cerrado) {
    return <Chip icon={<CerradoIcon />} label="Cerrado" color="success" />;
  }
  // Sin asistencias hoy quiere decir que la docente todavía no empieza el pase.
  if (total === 0) {
    return <Chip icon={<SinEmpezarIcon />} label="Sin empezar" />;
  }
  // Ya marcó a todos pero le falta darle a terminar, así que se lo recuerdo.
  if (marcados === total) {
    return (
      <Chip
        icon={<FaltaTerminarIcon />}
        label="Falta terminar"
        color="warning"
      />
    );
  }
  // Si no, va a la mitad y digo cuántos lleva marcados.
  return (
    <Chip
      icon={<EnCursoIcon />}
      label={`${marcados} de ${total} marcados`}
      color="warning"
    />
  );
};

// Un renglón por grupo con cómo va su pase de hoy y un botón para ir a tomarlo.
const PaseDeHoy = ({ grupo, fecha }: { grupo: RaRecord; fecha: string }) => {
  // Tres conteos pidiendo solo 1 registro: las de hoy, las pendientes y el pase cerrado.
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
  // El botón abre el pase de lista ya filtrado por este grupo y la fecha de hoy.
  const enlace =
    "#/asistencias?filter=" +
    encodeURIComponent(JSON.stringify({ grupoId: grupo.id, fecha }));

  // Mientras carga o si algo falla lo digo con texto.
  if (todas.isPending || pendientes.isPending || pase.isPending) {
    return <span>Cargando…</span>;
  }
  if (todas.error || pendientes.error || pase.error) {
    return <span>Datos no disponibles</span>;
  }

  // Marcados son todos menos los pendientes; si ya hay un pase guardado es que se cerró.
  const total = todas.total ?? 0;
  const marcados = total - (pendientes.total ?? 0);
  const cerrado = (pase.total ?? 0) > 0;

  // En pantalla chica va todo en columna. El aria-label dice el grupo para que el lector de pantalla
  // no lea puros botones iguales.
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

// Renglón de Mis alumnos: el grupo y cuántos alumnos activos tiene, con el mismo truco.
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

// Mensaje para cuando la docente no tiene grupos, así la tarjeta no se ve vacía.
const SinGrupos = () => (
  <Typography>
    Aún no tienes grupos asignados. Pídele a tu supervisor que te asigne uno.
  </Typography>
);

// La pantalla completa. Pido los grupos de la docente que inició sesión y armo las tarjetas.
export const InicioDocente = () => {
  // Quién inició sesión; de aquí saco su id y su nombre para el saludo.
  const { identity, isPending: cargandoIdentidad } = useGetIdentity();
  // Hoy en formato AAAA-MM-DD con la fecha local, igual que se guardan las asistencias.
  const fecha = new Date().toLocaleDateString("en-CA");
  // Hoy en palabras para el subtítulo.
  const fechaLarga = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Solo traigo sus grupos y espero a tener su id para no filtrar con undefined.
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

  // Si no se pudo leer quién es, aviso en vez de quedarme cargando para siempre.
  if (!cargandoIdentidad && !identity) {
    return <span>No se pudo cargar tu usuario. Vuelve a iniciar sesión.</span>;
  }
  if (isPending) return <span>Cargando…</span>;
  if (error) return <span>Datos no disponibles</span>;

  // Saludo y tres tarjetas. En pantalla chica van una debajo de otra y en compu el pase ocupa la mitad.
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
