// Inicio de Enfermería con saludo y tres conteos de seguimientos
import type { ReactNode } from "react";
import { Title, useGetIdentity, useGetList } from "react-admin";
import { Button, Grid, Stack, Typography } from "@mui/material";
import SinClasificarIcon from "@mui/icons-material/HelpOutline";
import CandadoIcon from "@mui/icons-material/Lock";
import SeguimientoIcon from "@mui/icons-material/PhoneInTalk";
import { TarjetaResumen } from "./comunes";

// Cuenta seguimientos con perPage 1 y el botón abre la lista filtrada
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
  // Con isPending o error cambian valor y detalle de la tarjeta
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

// Saludo y Grid con tres tarjetas de seguimientos según su filtro
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
