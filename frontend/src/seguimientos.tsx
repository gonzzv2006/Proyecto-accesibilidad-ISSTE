// Seguimiento de faltas: al cerrar el pase, cada falta abre un seguimiento. Enfermería llama al tutor,
// lo clasifica con su causa y lo da de alta; la docente solo ve qué alumnos tienen seguimiento.
import { useState } from "react";
import {
  List,
  DataTable,
  ReferenceField,
  DateField,
  TextField,
  Labeled,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  ReferenceInput,
  AutocompleteInput,
  Toolbar,
  SaveButton,
  Exporter,
  required,
  useRecordContext,
  useUpdate,
  useNotify,
  useRefresh,
  usePermissions,
  useGetManyAggregate,
} from "react-admin";
import {
  Button,
  Card,
  Chip,
  Stack,
  Typography,
  useMediaQuery,
  Theme,
} from "@mui/material";
import AbiertoIcon from "@mui/icons-material/Warning";
import AltaIcon from "@mui/icons-material/CheckCircle";
import {
  AccionesLista,
  CAUSAS,
  ChipCandado,
  ConfirmAccesible,
  Encabezado,
  INCIDENCIAS,
  ListaVacia,
  TituloFormulario,
  SelectNativo,
  descargarCSV,
  fechaMX,
  nombreDeCausa,
} from "./comunes";

// Los dos estados de un seguimiento, para el filtro y el campo Estado de los formularios.
const estadosSeguimiento = [
  { id: "abierto", name: "Abierto" },
  { id: "alta", name: "Dado de alta" },
];

// Para el filtro de "Requiere alta"; el backend convierte "true" y "false" en booleano.
const opcionesCandado = [
  { id: "true", name: "Sí" },
  { id: "false", name: "No" },
];

// Las faltas salen de las fechas que guarda el backend al cerrar cada pase; abajo va la última incidencia.
const FaltasAlumno = () => {
  const seguimiento = useRecordContext();
  if (!seguimiento) return null;
  const total = seguimiento.fechasFalta?.length ?? 0;
  const ultima = INCIDENCIAS[seguimiento.ultimaIncidencia]?.nombre;
  return (
    <Stack>
      <span>{total === 1 ? "1 falta" : `${total} faltas`}</span>
      {ultima && (
        <Typography variant="body2" color="textSecondary">
          última: {ultima}
        </Typography>
      )}
    </Stack>
  );
};

// Etiqueta del estado con ícono y texto además del color. Si tiene candado lo digo con el chip de "requiere alta".
const EstadoSeguimiento = () => {
  const seguimiento = useRecordContext();
  if (!seguimiento) return null;
  if (seguimiento.estado === "alta") {
    return (
      <Chip
        size="small"
        icon={<AltaIcon />}
        label="Dado de alta"
        color="success"
      />
    );
  }
  if (seguimiento.requiereAlta) return <ChipCandado />;
  return (
    <Chip size="small" icon={<AbiertoIcon />} label="Abierto" color="warning" />
  );
};

// La causa en texto, por ejemplo "Enfermedad en casa".
const CausaSeguimiento = () => {
  const seguimiento = useRecordContext();
  return <span>{nombreDeCausa(seguimiento?.causa)}</span>;
};

// El seguimiento no trae el teléfono, así que salto del alumno a su tutor con dos
// ReferenceField. Así Enfermería tiene el número a la mano para llamar.
const TelefonoTutor = () => (
  <ReferenceField source="alumnoId" reference="alumnos" link={false}>
    <ReferenceField source="tutorId" reference="tutores" link={false}>
      <TextField source="telefono" />
    </ReferenceField>
  </ReferenceField>
);

// Botones de cada renglón para Enfermería y el supervisor: Llamar tutor, Clasificar y Dar alta.
const BotonesSeguimiento = () => {
  const seguimiento = useRecordContext();
  // update manda el cambio al backend; isPending lo uso para bloquear los botones mientras guarda.
  const [update, { isPending, error }] = useUpdate();
  const [confirmando, setConfirmando] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();
  // El nombre del alumno para la pregunta de confirmación, de la misma caché que la columna Alumno.
  const { data: alumnos } = useGetManyAggregate(
    "alumnos",
    { ids: [seguimiento?.alumnoId] },
    { enabled: !!seguimiento },
  );

  if (!seguimiento) return null;
  // Si no se pudo guardar lo digo con texto en lugar de los botones.
  if (error) return <span>No se pudo guardar</span>;
  const nombre = alumnos?.[0]
    ? `${alumnos[0].nombre} ${alumnos[0].apellidos}`
    : "este alumno";

  // Dar alta cierra el seguimiento y quita el candado; recargo para que ya no salga entre los abiertos.
  const darAlta = () => {
    setConfirmando(false);
    update(
      "seguimientos",
      {
        id: seguimiento.id,
        data: { ...seguimiento, estado: "alta" },
        previousData: seguimiento,
      },
      {
        onSuccess: (guardado) => {
          if (guardado?.id) {
            notify("alta", { messageArgs: { _: "Seguimiento dado de alta" } });
          }
          refresh();
        },
      },
    );
  };

  // Llamar tutor guarda la fecha de hoy en fechaLlamada (no hace la llamada). Clasificar abre el formulario
  // para la causa y la fecha de retorno. Dar alta pide confirmación porque deja entrar otra vez al alumno.
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        disabled={isPending}
        sx={{ m: 0.5 }}
        onClick={() =>
          update(
            "seguimientos",
            {
              id: seguimiento.id,
              data: {
                ...seguimiento,
                fechaLlamada: new Date().toLocaleDateString("en-CA"),
              },
              previousData: seguimiento,
            },
            {
              onSuccess: () =>
                notify("llamada", { messageArgs: { _: "Llamada registrada" } }),
            },
          )
        }
      >
        Llamar tutor
      </Button>
      <Button
        size="small"
        variant="outlined"
        href={`#/seguimientos/${seguimiento.id}`}
        sx={{ m: 0.5 }}
      >
        Clasificar
      </Button>
      <Button
        size="small"
        variant="contained"
        disabled={isPending || seguimiento.estado === "alta"}
        sx={{ m: 0.5 }}
        onClick={() => setConfirmando(true)}
      >
        Dar alta
      </Button>
      <ConfirmAccesible
        isOpen={confirmando}
        loading={isPending}
        title="Dar de alta"
        content={`¿Dar de alta a ${nombre}? Si tenía el candado de "requiere alta", ya se le podrá marcar Presente.`}
        confirm="Dar alta"
        cancel="Cancelar"
        onConfirm={darAlta}
        onClose={() => setConfirmando(false)}
      />
    </>
  );
};
