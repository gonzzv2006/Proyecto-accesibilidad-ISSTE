// Pantallas de Grupos (lista, editar y nuevo). Solo el supervisor las tiene en el menú porque
// él asigna los grupos a las docentes; la docente solo puede leerlos.
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

// Los niveles de un grupo: id es lo que se guarda en Mongo y name lo que se ve.
const niveles = [
  { id: "lactantes", name: "Lactantes" },
  { id: "maternal", name: "Maternal" },
  { id: "preescolar", name: "Preescolar" },
];

// Filtro por estancia siempre visible; la opción vacía quita el filtro.
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

// Lista de grupos: tabla en pantallas grandes y lista simple en pantalla chica para que no haya
// scroll de lado.
export const GrupoList = () => {
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  // Si todavía no hay grupos, sale un mensaje con el botón para crear el primero.
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

// Editar grupo: aquí el supervisor le asigna la docente. El ID se ve pero no se edita, y en
// Docente solo salen usuarios docentes para no darle un grupo a un supervisor.
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

// Nuevo grupo: los mismos campos sin el ID, porque ese lo pone el backend al guardar.
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
