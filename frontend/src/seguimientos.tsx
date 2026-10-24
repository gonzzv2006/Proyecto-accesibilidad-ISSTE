// Seguimientos de faltas con List Edit y Create que atiende Enfermería
// Hecho con IA (solo estructura): esqueleto del botón con useUpdate y orientación sobre las props de confirmación en BotonesSeguimiento; los datos que actualiza, las notificaciones y la lógica de confirmación los escribimos manualmente.
// Hecho con IA (solo estructura): esqueleto del Chip de estado EstadoSeguimiento; los estados, colores e íconos los escribimos manualmente.
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

// Opciones abierto y alta para el filtro y el campo Estado
const estadosSeguimiento = [
  { id: "abierto", name: "Abierto" },
  { id: "alta", name: "Dado de alta" },
];

// Valores true y false como texto que el backend convierte a booleano
const opcionesCandado = [
  { id: "true", name: "Sí" },
  { id: "false", name: "No" },
];

// Total de fechasFalta y debajo la última incidencia del alumno
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

// Chip de estado con ícono y texto y ChipCandado si requiereAlta
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

// nombreDeCausa convierte la clave de la causa en texto legible
const CausaSeguimiento = () => {
  const seguimiento = useRecordContext();
  return <span>{nombreDeCausa(seguimiento?.causa)}</span>;
};

// Dos ReferenceField anidados van del alumno al teléfono de su tutor
const TelefonoTutor = () => (
  <ReferenceField source="alumnoId" reference="alumnos" link={false}>
    <ReferenceField source="tutorId" reference="tutores" link={false}>
      <TextField source="telefono" />
    </ReferenceField>
  </ReferenceField>
);

// Botones Llamar tutor Clasificar y Dar alta para cada renglón
const BotonesSeguimiento = () => {
  const seguimiento = useRecordContext();
  // useUpdate manda el PUT e isPending desactiva los botones mientras guarda
  const [update, { isPending, error }] = useUpdate();
  const [confirmando, setConfirmando] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();
  // useGetManyAggregate reusa el nombre del alumno ya cargado para confirmar
  const { data: alumnos } = useGetManyAggregate(
    "alumnos",
    { ids: [seguimiento?.alumnoId] },
    { enabled: !!seguimiento },
  );

  if (!seguimiento) return null;
  // Si useUpdate falla aparece No se pudo guardar sin botones
  if (error) return <span>No se pudo guardar</span>;
  const nombre = alumnos?.[0]
    ? `${alumnos[0].nombre} ${alumnos[0].apellidos}`
    : "este alumno";

  // useUpdate pone estado alta y refresh recarga la lista
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

  // Llamar tutor guarda fechaLlamada y Dar alta pide confirmación con ConfirmAccesible
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

// filterDefaultValues muestra los abiertos y la docente ve menos columnas
export const SeguimientoList = () => {
  // useMediaQuery oculta columnas y en pantalla chica todo va en Alumno
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("md"));
  const isXs = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  const { permissions } = usePermissions();
  const detalle = permissions === "enfermeria" || permissions === "supervisor";

  // Filtros con SelectNativo y alwaysOn y el de causa solo si detalle
  const filtros = [
    <SelectNativo
      key="estado"
      source="estado"
      label="Estado"
      choices={estadosSeguimiento}
      emptyText="Todos"
      alwaysOn
    />,
    <SelectNativo
      key="requiereAlta"
      source="requiereAlta"
      label="Requiere alta"
      choices={opcionesCandado}
      emptyText="Todos"
      alwaysOn
    />,
  ];
  if (detalle) {
    filtros.push(
      <SelectNativo
        key="causa"
        source="causa"
        label="Causa"
        choices={CAUSAS}
        emptyText="Todas"
        alwaysOn
      />,
    );
  }

  // Exporter con fetchRelatedRecords para nombres y columnas extra solo si detalle
  const exportar: Exporter = async (seguimientos, fetchRelatedRecords) => {
    const alumnos = await fetchRelatedRecords(
      seguimientos,
      "alumnoId",
      "alumnos",
    );
    const grupos = await fetchRelatedRecords(seguimientos, "grupoId", "grupos");
    const filas = seguimientos.map((seguimiento) => {
      const alumno = alumnos[seguimiento.alumnoId];
      const fila = {
        Alumno: alumno ? `${alumno.nombre} ${alumno.apellidos}` : "",
        Grupo: grupos[seguimiento.grupoId]?.nombre ?? "",
        Estado: seguimiento.estado === "alta" ? "Dado de alta" : "Abierto",
        "Requiere alta": seguimiento.requiereAlta ? "Sí" : "No",
      };
      if (!detalle) return fila;
      return {
        ...fila,
        Faltas: seguimiento.fechasFalta?.length ?? 0,
        "Última incidencia":
          INCIDENCIAS[seguimiento.ultimaIncidencia]?.nombre ?? "",
        Causa: nombreDeCausa(seguimiento.causa),
        "Fecha probable de retorno": fechaMX(seguimiento.fechaRetorno),
        "Fecha de la llamada": fechaMX(seguimiento.fechaLlamada ?? ""),
        Notas: seguimiento.notas ?? "",
      };
    });
    descargarCSV(filas, "seguimientos");
  };

  // rowClick en false porque las acciones van en los botones
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Seguimiento de faltas"
        ayuda={
          detalle
            ? "Cada falta del pase de lista abre un seguimiento. Llama al tutor, clasifica la causa y da de alta cuando regrese."
            : "Enfermería da seguimiento a las faltas. Aquí ves qué alumnos tienen seguimiento."
        }
      />
      <List
        title="Seguimiento de faltas"
        filters={filtros}
        filterDefaultValues={{ estado: "abierto" }}
        exporter={exportar}
        actions={
          <AccionesLista
            singular="seguimiento"
            plural="seguimientos"
            nuevo={detalle ? "Nuevo seguimiento" : undefined}
            exportar
          />
        }
        empty={
          <Card>
            <ListaVacia mensaje="Todavía no hay seguimientos. Se abren solos al cerrar un pase de lista con faltas." />
          </Card>
        }
      >
        <DataTable
          aria-label="Seguimiento de faltas"
          bulkActionButtons={false}
          rowClick={false}
          empty={
            <ListaVacia mensaje="No hay seguimientos con estos filtros. Cambia el filtro «Estado» para ver los demás." />
          }
        >
          <DataTable.Col source="alumnoId" label="Alumno">
            <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
              <ReferenceField
                source="alumnoId"
                reference="alumnos"
                link={false}
              />
              <ReferenceField source="grupoId" reference="grupos" link={false}>
                <TextField
                  source="nombre"
                  variant="body2"
                  color="textSecondary"
                />
              </ReferenceField>
              {isXs && <EstadoSeguimiento />}
              {isXs && detalle && <BotonesSeguimiento />}
            </Stack>
          </DataTable.Col>
          {detalle && !isSmall && (
            <DataTable.Col label="Faltas">
              <FaltasAlumno />
            </DataTable.Col>
          )}
          {detalle && !isSmall && (
            <DataTable.Col label="Teléfono del tutor">
              <TelefonoTutor />
            </DataTable.Col>
          )}
          {detalle && !isSmall && (
            <DataTable.Col source="causa" label="Causa">
              <CausaSeguimiento />
            </DataTable.Col>
          )}
          {detalle && !isSmall && (
            <DataTable.Col
              source="fechaRetorno"
              label="Fecha probable de retorno"
            >
              <DateField
                source="fechaRetorno"
                locales="es-MX"
                emptyText="Sin fecha"
              />
            </DataTable.Col>
          )}
          {!isXs && (
            <DataTable.Col source="estado" label="Estado">
              <EstadoSeguimiento />
            </DataTable.Col>
          )}
          {detalle && !isXs && (
            <DataTable.Col label="Acciones">
              <BotonesSeguimiento />
            </DataTable.Col>
          )}
        </DataTable>
      </List>
    </Stack>
  );
};

// Edit para clasificar y sin botón Borrar si no es supervisor
export const SeguimientoEdit = () => {
  const { permissions } = usePermissions();
  return (
    <Edit title="Clasificar seguimiento" sx={{ maxWidth: 720 }}>
      <SimpleForm
        toolbar={
          permissions === "supervisor" ? undefined : (
            <Toolbar>
              <SaveButton />
            </Toolbar>
          )
        }
      >
        <TituloFormulario texto="Clasificar seguimiento" />
        <Labeled label="Alumno">
          <ReferenceField source="alumnoId" reference="alumnos" link={false} />
        </Labeled>
        <Labeled label="Faltas">
          <FaltasAlumno />
        </Labeled>
        <Labeled label="Teléfono del tutor">
          <TelefonoTutor />
        </Labeled>
        <SelectNativo
          source="causa"
          label="Causa"
          choices={CAUSAS}
          helperText="Enfermedad en casa y Accidente fuera de la estancia ponen el candado de «Requiere alta para ingresar»."
          sinVacio
        />
        <DateInput source="fechaRetorno" label="Fecha probable de retorno" />
        <DateInput source="fechaLlamada" label="Fecha de la llamada" />
        <SelectNativo
          source="estado"
          label="Estado"
          choices={estadosSeguimiento}
          sinVacio
        />
        <TextInput source="notas" label="Notas" multiline rows={4} />
      </SimpleForm>
    </Edit>
  );
};

// Create con estado abierto y fecha de hoy por defecto
export const SeguimientoCreate = () => (
  <Create title="Nuevo seguimiento" redirect="list" sx={{ maxWidth: 720 }}>
    <SimpleForm
      defaultValues={{
        estado: "abierto",
        causa: "SIN_CLASIFICAR",
        fechaApertura: new Date().toLocaleDateString("en-CA"),
        fechaLlamada: null,
      }}
    >
      <TituloFormulario texto="Nuevo seguimiento" />
      <ReferenceInput source="alumnoId" reference="alumnos">
        <AutocompleteInput label="Alumno" validate={required()} />
      </ReferenceInput>
      <SelectNativo source="causa" label="Causa" choices={CAUSAS} sinVacio />
      <DateInput source="fechaRetorno" label="Fecha probable de retorno" />
      <DateInput source="fechaApertura" label="Fecha de apertura" />
      <TextInput source="notas" label="Notas" multiline rows={4} />
    </SimpleForm>
  </Create>
);
