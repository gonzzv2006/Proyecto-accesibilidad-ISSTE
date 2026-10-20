// Inicio de Enfermería (Trabajo Social): la saluda y le dice cuántos seguimientos tiene por atender.
// Lo abre tablero.tsx cuando el rol es enfermeria.
import type { ReactNode } from "react";
import { Title, useGetIdentity, useGetList } from "react-admin";
import { Button, Grid, Stack, Typography } from "@mui/material";
import SinClasificarIcon from "@mui/icons-material/HelpOutline";
import CandadoIcon from "@mui/icons-material/Lock";
import SeguimientoIcon from "@mui/icons-material/PhoneInTalk";
import { TarjetaResumen } from "./comunes";

// Tarjeta con cuántos seguimientos cumplen un filtro y un botón que abre la lista ya filtrada.
// Pido un solo registro porque nada más me interesa el total.
const TarjetaDeSeguimientos = ({
  titulo,
  icono,
  filtro,
  singular,
  plural,
  boton,
}: {
  titulo: string;
  icono: ReactNode;
  filtro: Record<string, unknown>;
  singular: string;
  plural: string;
  boton: string;
}) => {
  const { total, isPending, error } = useGetList("seguimientos", {
    filter: filtro,
    pagination: { page: 1, perPage: 1 },
  });
  // Mientras carga o si falla, la tarjeta lo dice en vez de quedarse vacía.
  let valor = String(total ?? 0);
  let detalle = total === 1 ? singular : plural;
  if (isPending) {
    valor = "…";
    detalle = "Cargando…";
  }
  if (error) {
    valor = "—";
    detalle = "Datos no disponibles";
  }
  return (
    <TarjetaResumen
      titulo={titulo}
      icono={icono}
      valor={valor}
      detalle={detalle}
    >
      <Button
        variant="outlined"
        href={`#/seguimientos?filter=${encodeURIComponent(JSON.stringify(filtro))}`}
        sx={{ mt: 2 }}
      >
        {boton}
      </Button>
    </TarjetaResumen>
  );
};

// Saludo y tres tarjetas: los que falta clasificar, los que tienen candado y todos los abiertos.
export const InicioEnfermeria = () => {
  const { identity } = useGetIdentity();
  const fechaLarga = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TarjetaDeSeguimientos
            titulo="Sin clasificar"
            icono={<SinClasificarIcon color="primary" />}
            filtro={{ estado: "abierto", causa: "SIN_CLASIFICAR" }}
            singular="seguimiento por llamar y clasificar"
            plural="seguimientos por llamar y clasificar"
            boton="Ver sin clasificar"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TarjetaDeSeguimientos
            titulo="Requieren alta"
            icono={<CandadoIcon color="warning" />}
            filtro={{ estado: "abierto", requiereAlta: "true" }}
            singular="alumno no puede entrar sin alta"
            plural="alumnos no pueden entrar sin alta"
            boton="Ver los que requieren alta"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TarjetaDeSeguimientos
            titulo="Seguimientos abiertos"
            icono={<SeguimientoIcon color="primary" />}
            filtro={{ estado: "abierto" }}
            singular="seguimiento abierto"
            plural="seguimientos abiertos"
            boton="Ver abiertos"
          />
        </Grid>
      </Grid>
    </Stack>
  );
};
