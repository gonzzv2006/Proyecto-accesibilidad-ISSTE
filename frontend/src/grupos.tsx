// CRUD de grupos donde el supervisor asigna docentes y la docente lee
import {
  List,
  DataTable,
  SimpleList,
  ReferenceField,
  SelectField,
  Labeled,
  TextField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  ReferenceInput,
  required,
} from "react-admin";
import { Button, Card, Stack, useMediaQuery, Theme } from "@mui/material";
import {
  AccionesLista,
  Encabezado,
  ListaVacia,
  TituloFormulario,
  SelectNativo,
} from "./comunes";

// Choices de nivel con id guardado en Mongo y name visible
const niveles = [
  { id: "lactantes", name: "Lactantes" },
  { id: "maternal", name: "Maternal" },
  { id: "preescolar", name: "Preescolar" },
];

// Filtro de estancia alwaysOn con select nativo y opción vacía sin filtro
const grupoFilters = [
  <ReferenceInput
    key="estanciaId"
    source="estanciaId"
    reference="estancias"
    alwaysOn
  >
    <SelectNativo label="Estancia" emptyText="Todas las estancias" />
  </ReferenceInput>,
];

// useMediaQuery elige DataTable o SimpleList para evitar scroll lateral
export const GrupoList = () => {
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  // Lista vacía con ListaVacia y botón para crear el primer grupo
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Grupos"
        ayuda="Grupos de cada estancia y su docente."
      />
      <List
        filters={grupoFilters}
        exporter={false}
        actions={
          <AccionesLista singular="grupo" plural="grupos" nuevo="Nuevo grupo" />
        }
        empty={
          <Card>
            <ListaVacia mensaje="Todavía no hay grupos registrados. Usa «Nuevo grupo» para agregar el primero.">
              <Button variant="contained" href="#/grupos/create" sx={{ mt: 2 }}>
                Nuevo grupo
              </Button>
            </ListaVacia>
          </Card>
        }
      >
        {isSmall ? (
          <SimpleList
            primaryText={(record) => record.nombre}
            secondaryText={
              <ReferenceField
                source="estanciaId"
                reference="estancias"
                link={false}
              />
            }
            tertiaryText={
              <ReferenceField
                source="docenteId"
                reference="usuarios"
                link={false}
              />
            }
          />
        ) : (
          <DataTable aria-label="Grupos" bulkActionButtons={false}>
            <DataTable.Col source="nombre" label="Nombre" />
            <DataTable.Col source="nivel" label="Nivel">
              <SelectField source="nivel" choices={niveles} />
            </DataTable.Col>
            <DataTable.Col source="estanciaId" label="Estancia">
              <ReferenceField source="estanciaId" reference="estancias" />
            </DataTable.Col>
            <DataTable.Col source="docenteId" label="Docente">
              <ReferenceField source="docenteId" reference="usuarios" />
            </DataTable.Col>
          </DataTable>
        )}
      </List>
    </Stack>
  );
};

// Edit de grupo con ID en Labeled y docentes filtrados por rol
export const GrupoEdit = () => (
  <Edit title="Editar grupo" sx={{ maxWidth: 720 }}>
    <SimpleForm>
      <TituloFormulario texto="Editar grupo" />
      <Labeled label="ID">
        <TextField source="id" />
      </Labeled>
      <TextInput source="nombre" label="Nombre" validate={required()} />
      <SelectNativo source="nivel" label="Nivel" choices={niveles} />
      <ReferenceInput
        source="estanciaId"
        reference="estancias"
        label="Estancia"
      />
      <ReferenceInput
        source="docenteId"
        reference="usuarios"
        label="Docente"
        filter={{ rol: "docente" }}
      />
    </SimpleForm>
  </Edit>
);

// Create con los mismos campos sin ID porque lo asigna el backend
export const GrupoCreate = () => (
  <Create title="Nuevo grupo" redirect="list" sx={{ maxWidth: 720 }}>
    <SimpleForm>
      <TituloFormulario texto="Nuevo grupo" />
      <TextInput source="nombre" label="Nombre" validate={required()} />
      <SelectNativo source="nivel" label="Nivel" choices={niveles} />
      <ReferenceInput
        source="estanciaId"
        reference="estancias"
        label="Estancia"
      />
      <ReferenceInput
        source="docenteId"
        reference="usuarios"
        label="Docente"
        filter={{ rol: "docente" }}
      />
    </SimpleForm>
  </Create>
);
