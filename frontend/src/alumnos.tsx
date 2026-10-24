// CRUD de alumnos con List filtrable y formularios Edit y Create
// Hecho con IA (solo estructura): alternancia con useMediaQuery entre SimpleList y DataTable en AlumnoList; primaryText y secondaryText los escribimos manualmente.
// Hecho con IA (solo estructura): Edit con SimpleForm vacío en AlumnoEdit; los inputs los escribimos manualmente.
import {
  List,
  DataTable,
  SimpleList,
  ReferenceField,
  useRecordContext,
  Labeled,
  TextField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  ReferenceInput,
  BooleanInput,
  TopToolbar,
  required,
} from "react-admin";
import { Button, Card, Chip, Stack, useMediaQuery, Theme } from "@mui/material";
import InscritoIcon from "@mui/icons-material/CheckCircle";
import BajaIcon from "@mui/icons-material/RemoveCircleOutline";
import CredencialIcon from "@mui/icons-material/QrCode2";
import {
  AccionesLista,
  Encabezado,
  ListaVacia,
  TituloFormulario,
  SelectNativo,
} from "./comunes";

// Chip con ícono y texto según activo para no depender del color
const Inscrito = () => {
  const alumno = useRecordContext();
  if (!alumno) return null;
  if (alumno.activo) {
    return (
      <Chip
        size="small"
        icon={<InscritoIcon />}
        label="Inscrito"
        color="success"
      />
    );
  }
  return <Chip size="small" icon={<BajaIcon />} label="Baja" />;
};

// stopPropagation evita abrir el editar y aria-label lleva el nombre
const BotonCredencial = () => {
  const alumno = useRecordContext();
  if (!alumno) return null;
  return (
    <Button
      size="small"
      startIcon={<CredencialIcon />}
      href={`#/credenciales/${alumno.id}`}
      aria-label={`Ver credencial de ${alumno.nombre} ${alumno.apellidos}`}
      onClick={(evento) => evento.stopPropagation()}
    >
      Ver credencial
    </Button>
  );
};

// Filtros alwaysOn con buscador q y select nativo de estancia y grupo
const alumnoFilters = [
  <TextInput key="q" source="q" label="Buscar" alwaysOn />,
  <ReferenceInput
    key="estanciaId"
    source="estanciaId"
    reference="estancias"
    alwaysOn
  >
    <SelectNativo label="Estancia" emptyText="Todas las estancias" />
  </ReferenceInput>,
  <ReferenceInput key="grupoId" source="grupoId" reference="grupos" alwaysOn>
    <SelectNativo label="Grupo" emptyText="Todos los grupos" />
  </ReferenceInput>,
];

// List de alumnos por apellidos con filtros y botón de credencial
export const AlumnoList = () => {
  // Debajo de lg useMediaQuery cambia a SimpleList sin scroll lateral
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("lg"));
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Alumnos"
        ayuda="Busca por nombre o filtra por estancia y grupo."
      />
      <List
        filters={alumnoFilters}
        sort={{ field: "apellidos", order: "ASC" }}
        exporter={false}
        actions={
          <AccionesLista
            singular="alumno"
            plural="alumnos"
            nuevo="Nuevo alumno"
          />
        }
        empty={
          <Card>
            <ListaVacia mensaje="Todavía no hay alumnos registrados. Usa «Nuevo alumno» para agregar el primero.">
              <Button
                variant="contained"
                href="#/alumnos/create"
                sx={{ mt: 2 }}
              >
                Nuevo alumno
              </Button>
            </ListaVacia>
          </Card>
        }
      >
        {isSmall ? (
          <SimpleList
            primaryText={(record) => `${record.nombre} ${record.apellidos}`}
            secondaryText={
              <ReferenceField
                source="grupoId"
                reference="grupos"
                link={false}
              />
            }
            tertiaryText={(record) => (record.activo ? "Inscrito" : "Baja")}
          />
        ) : (
          <DataTable aria-label="Alumnos" bulkActionButtons={false}>
            <DataTable.Col source="nombre" label="Nombre" />
            <DataTable.Col source="apellidos" label="Apellidos" />
            <DataTable.Col source="grupoId" label="Grupo">
              <ReferenceField source="grupoId" reference="grupos" />
            </DataTable.Col>
            <DataTable.Col source="estanciaId" label="Estancia">
              <ReferenceField source="estanciaId" reference="estancias" />
            </DataTable.Col>
            <DataTable.Col source="tutorId" label="Tutor">
              <ReferenceField source="tutorId" reference="tutores" />
            </DataTable.Col>
            <DataTable.Col source="activo" label="Inscrito">
              <Inscrito />
            </DataTable.Col>
            <DataTable.Col label="Credencial">
              <BotonCredencial />
            </DataTable.Col>
          </DataTable>
        )}
      </List>
    </Stack>
  );
};

// Edit con BotonCredencial arriba e ID de solo lectura con Labeled
export const AlumnoEdit = () => (
  <Edit
    title="Editar alumno"
    sx={{ maxWidth: 720 }}
    actions={
      <TopToolbar>
        <BotonCredencial />
      </TopToolbar>
    }
  >
    <SimpleForm>
      <TituloFormulario texto="Editar alumno" />
      <Labeled label="ID">
        <TextField source="id" />
      </Labeled>
      <TextInput source="nombre" label="Nombre" validate={required()} />
      <TextInput source="apellidos" label="Apellidos" validate={required()} />
      <DateInput source="fechaNacimiento" label="Fecha de nacimiento" />
      <ReferenceInput
        source="estanciaId"
        reference="estancias"
        label="Estancia"
      />
      <ReferenceInput source="grupoId" reference="grupos" label="Grupo" />
      <ReferenceInput source="tutorId" reference="tutores" label="Tutor" />
      <BooleanInput source="activo" label="Inscrito" />
    </SimpleForm>
  </Edit>
);

// Create con Inscrito en true y el codigoQR lo genera el backend
export const AlumnoCreate = () => (
  <Create title="Nuevo alumno" redirect="list" sx={{ maxWidth: 720 }}>
    <SimpleForm>
      <TituloFormulario texto="Nuevo alumno" />
      <TextInput source="nombre" label="Nombre" validate={required()} />
      <TextInput source="apellidos" label="Apellidos" validate={required()} />
      <DateInput source="fechaNacimiento" label="Fecha de nacimiento" />
      <ReferenceInput
        source="estanciaId"
        reference="estancias"
        label="Estancia"
      />
      <ReferenceInput source="grupoId" reference="grupos" label="Grupo" />
      <ReferenceInput source="tutorId" reference="tutores" label="Tutor" />
      <BooleanInput source="activo" label="Inscrito" defaultValue={true} />
    </SimpleForm>
  </Create>
);
