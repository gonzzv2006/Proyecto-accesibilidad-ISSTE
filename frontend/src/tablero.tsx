// Tablero por estancia de GET /estadisticas y otros roles a su inicio
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
import SeguimientoIcon from "@mui/icons-material/PhoneInTalk";
import { InicioDocente } from "./inicioDocente";
import { InicioEnfermeria } from "./inicioEnfermeria";
import { TarjetaResumen } from "./comunes";

// Math.round de presentes entre marcados o null si no hay marcados
const porcentajeDe = (presentes: number, marcados: number) =>
  marcados === 0 ? null : Math.round((presentes / marcados) * 100);

// Columna % Asistencia con presentes y marcados de useRecordContext
const PorcentajeAsistencia = () => {
  const estancia = useRecordContext();
  if (!estancia) return null;
  const porcentaje = porcentajeDe(estancia.presentes, estancia.marcados);
  return <span>{porcentaje === null ? "—" : `${porcentaje} %`}</span>;
};

// Estado con ícono y texto según porcentajeDe sin depender del color
const EstadoAsistencia = () => {
  const estancia = useRecordContext();
  if (!estancia) return null;
  const porcentaje = porcentajeDe(estancia.presentes, estancia.marcados);
  if (porcentaje === null) {
    return (
      <Typography component="span" variant="body2" color="textSecondary">
        <SinDatosIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> Sin
        pase de lista
      </Typography>
    );
  }
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

// Compara grupos con pasesCerrados y sin grupos no cuenta como Completo
const PaseDeLaEstancia = () => {
  const estancia = useRecordContext();
  if (!estancia) return null;
  if (estancia.grupos > 0 && estancia.pasesCerrados === estancia.grupos) {
    return (
      <Typography component="span" variant="body2" color="success">
        <CerradoIcon fontSize="small" sx={{ verticalAlign: "middle" }} />{" "}
        Completo
      </Typography>
    );
  }
  if (estancia.pasesCerrados > 0) {
    return (
      <Typography component="span" variant="body2" color="warning">
        <EnCursoIcon fontSize="small" sx={{ verticalAlign: "middle" }} />{" "}
        {estancia.pasesCerrados} de {estancia.grupos} grupos
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

// Tarjetas del día que suman con reduce las filas de useGetList estadisticas
const ResumenDelDia = ({ fecha }: { fecha: string }) => {
  const { data, isPending, error } = useGetList("estadisticas", {
    filter: { fecha },
    pagination: { page: 1, perPage: 100 },
  });

  if (isPending) return <span>Cargando…</span>;
  if (error) return <span>Datos no disponibles</span>;

  const presentes = data.reduce((suma, fila) => suma + fila.presentes, 0);
  const marcados = data.reduce((suma, fila) => suma + fila.marcados, 0);
  const abiertos = data.reduce(
    (suma, fila) => suma + fila.seguimientosAbiertos,
    0,
  );
  const porcentajes = data.map((fila) =>
    porcentajeDe(fila.presentes, fila.marcados),
  );
  const criticas = porcentajes.filter((p) => p !== null && p < 60).length;
  const enAtencion = porcentajes.filter(
    (p) => p !== null && p >= 60 && p < 90,
  ).length;
  const general = porcentajeDe(presentes, marcados);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TarjetaResumen
          titulo="Asistencia general"
          icono={<GeneralIcon color="primary" />}
          valor={general === null ? "—" : `${general} %`}
          detalle={
            general === null
              ? "Sin pase de lista"
              : `${presentes} presentes de ${marcados} marcados`
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
        <TarjetaResumen
          titulo="Seguimientos abiertos"
          icono={<SeguimientoIcon color="primary" />}
          valor={String(abiertos)}
          detalle={
            abiertos === 1 ? "seguimiento abierto" : "seguimientos abiertos"
          }
        />
      </Grid>
    </Grid>
  );
};

// Dashboard de App.tsx y usePermissions elige el inicio de cada rol
export const Tablero = () => {
  const { permissions, isPending } = usePermissions();
  // useState con la fecha elegida que empieza en hoy
  const [fecha, setFecha] = useState(new Date().toLocaleDateString("en-CA"));
  // useMediaQuery con sm cambia la tabla por SimpleList en pantalla chica
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));

  // Espera isPending para no mostrar el tablero al rol equivocado
  if (isPending) return <span>Cargando…</span>;

  // Enfermería y docente a su inicio y supervisor y administrador siguen aquí
  if (permissions === "enfermeria") return <InicioEnfermeria />;
  if (permissions !== "supervisor" && permissions !== "administrador") {
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

  // List de estadisticas con filter fecha y disableSort en columnas calculadas
  return (
    <Stack spacing={2} sx={{ mt: 2, maxWidth: 1280 }}>
      <title>Tablero de asistencia · SIRAI</title>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between" }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h1">
            Tablero de asistencia
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
      {fecha && <ResumenDelDia fecha={fecha} />}
      <Card>
        <CardHeader
          title="Asistencia por estancia"
          slotProps={{
            title: { component: "h2", variant: "h6", id: "titulo-estancias" },
          }}
          sx={{ pb: 0 }}
        />
        {fecha && (
          <List
            resource="estadisticas"
            title="Tablero de asistencia"
            component="div"
            filter={{ fecha }}
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
                secondaryText={(record) => (
                  <span>
                    <EstadoAsistencia /> · <PorcentajeAsistencia /> ·{" "}
                    {record.inscritos} inscritos · Pase: <PaseDeLaEstancia />
                  </span>
                )}
                rowClick={false}
              />
            ) : (
              <DataTable
                aria-labelledby="titulo-estancias"
                bulkActionButtons={false}
                rowClick={false}
              >
                <DataTable.Col source="nombre" label="Estancia" />
                <DataTable.Col
                  source="inscritos"
                  label="Inscritos"
                  disableSort
                />
                <DataTable.Col label="% Asistencia">
                  <PorcentajeAsistencia />
                </DataTable.Col>
                <DataTable.Col label="Estado">
                  <EstadoAsistencia />
                </DataTable.Col>
                <DataTable.Col label="Pase de lista">
                  <PaseDeLaEstancia />
                </DataTable.Col>
              </DataTable>
            )}
          </List>
        )}
      </Card>
    </Stack>
  );
};
