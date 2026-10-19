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
