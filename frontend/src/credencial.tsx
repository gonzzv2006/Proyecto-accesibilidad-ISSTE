// Credencial imprimible de un alumno con el QR que la docente escanea en el pase de lista.
import { useParams } from "react-router-dom";
import { useGetOne } from "react-admin";
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import ImprimirIcon from "@mui/icons-material/Print";
import RegresarIcon from "@mui/icons-material/ArrowBack";
import { ListaVacia } from "./comunes";
import { AvisoSesion } from "./sesion";

// Página sin menú ni barra para que al imprimir solo salga la tarjeta. Como no hay Layout,
// aquí mismo pongo el main y el aviso de que la sesión va a vencer.
export const Credencial = () => {
  // Saco el id de la dirección y pido la credencial; el QR solo llega de este endpoint.
  const { id } = useParams();
  const {
    data: credencial,
    isPending,
    error,
  } = useGetOne("credenciales", { id: Number(id) });

  if (isPending) {
    return (
      <Stack component="main">
        <ListaVacia mensaje="Cargando…" />
      </Stack>
    );
  }
  // Si no se encontró, lo digo y dejo un botón para regresar a Alumnos.
  if (error || !credencial) {
    return (
      <Stack component="main">
        <title>Credencial no disponible · SIRAI</title>
        <ListaVacia mensaje="No encontramos la credencial de este alumno.">
          <Button href="#/alumnos" sx={{ mt: 2 }}>
            Regresar a Alumnos
          </Button>
        </ListaVacia>
      </Stack>
    );
  }

  const nombre = `${credencial.nombre} ${credencial.apellidos}`;

  // Al imprimir se esconde todo menos la tarjeta de 85.6 x 54 mm. El QR lleva margen blanco
  // para que se lea bien y una etiqueta para que el lector de pantalla diga de quién es.
  return (
    <Stack component="main" spacing={3} sx={{ p: 2, alignItems: "center" }}>
      <title>{`Credencial de ${nombre} · SIRAI`}</title>
      <Stack spacing={1} sx={{ alignItems: "center", displayPrint: "none" }}>
        <Typography variant="h5" component="h1">
          Credencial de {nombre}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Imprímela y recórtala por la orilla. La docente la escanea en el pase
          de lista.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<ImprimirIcon />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
          <Button
            variant="outlined"
            startIcon={<RegresarIcon />}
            href="#/alumnos"
          >
            Regresar a Alumnos
          </Button>
        </Stack>
      </Stack>
      <Card
        variant="outlined"
        sx={{ width: "85.6mm", maxWidth: "100%", minHeight: "54mm" }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" color="primary">
                SIRAI · ISSSTE
              </Typography>
              <Typography variant="h6" component="h2">
                {nombre}
              </Typography>
              <Typography variant="body2">Grupo: {credencial.grupo}</Typography>
              <Typography variant="body2">
                Estancia: {credencial.estancia}
              </Typography>
            </Stack>
            <QRCodeSVG
              value={credencial.codigoQR}
              size={112}
              marginSize={4}
              role="img"
              aria-label={`Código QR de la credencial de ${nombre}`}
            />
          </Stack>
        </CardContent>
      </Card>
      <AvisoSesion />
    </Stack>
  );
};
