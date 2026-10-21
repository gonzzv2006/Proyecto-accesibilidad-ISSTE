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
