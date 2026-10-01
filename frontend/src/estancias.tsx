// Pantallas de Estancias (lista, editar y nueva). Solo las edita el supervisor porque él las
// administra; la docente nada más lee los nombres para los filtros y columnas.
import {
  List,
  DataTable,
  SimpleList,
  Labeled,
  TextField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  required,
} from "react-admin";
import { Button, Card, Stack, useMediaQuery, Theme } from "@mui/material";
import {
  AccionesLista,
  Encabezado,
  ListaVacia,
  TituloFormulario,
} from "./comunes";

// Lista de estancias: tabla en pantallas grandes y lista simple en pantalla chica para que no haya
// scroll de lado.
export const EstanciaList = () => {
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  // Si no hay estancias, sale un mensaje con el botón para crear la primera.
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Estancias"
        ayuda="Estancias infantiles del ISSSTE que supervisas."
      />
      <List
        exporter={false}
        actions={
          <AccionesLista
            singular="estancia"
            plural="estancias"
            nuevo="Nueva estancia"
          />
        }
        empty={
          <Card>
            <ListaVacia mensaje="Todavía no hay estancias registradas. Usa «Nueva estancia» para agregar la primera.">
              <Button
                variant="contained"
                href="#/estancias/create"
                sx={{ mt: 2 }}
              >
                Nueva estancia
              </Button>
            </ListaVacia>
          </Card>
        }
      >
        {isSmall ? (
          <SimpleList
            primaryText={(record) => record.nombre}
            secondaryText={(record) => record.direccion}
            tertiaryText={(record) => record.telefono}
          />
        ) : (
          <DataTable aria-label="Estancias" bulkActionButtons={false}>
            <DataTable.Col source="nombre" label="Nombre" />
            <DataTable.Col source="direccion" label="Dirección" />
            <DataTable.Col source="telefono" label="Teléfono" />
          </DataTable>
        )}
      </List>
    </Stack>
  );
};

// Editar estancia. El ID se ve como texto pero no se edita, y el nombre es obligatorio.
export const EstanciaEdit = () => (
  <Edit title="Editar estancia" sx={{ maxWidth: 720 }}>
    <SimpleForm>
      <TituloFormulario texto="Editar estancia" />
      <Labeled label="ID">
        <TextField source="id" />
      </Labeled>
      <TextInput source="nombre" label="Nombre" validate={required()} />
      <TextInput source="direccion" label="Dirección" />
      <TextInput source="telefono" label="Teléfono" />
    </SimpleForm>
  </Edit>
);

// Nueva estancia: sin el ID porque lo pone el backend, y al guardar regreso a la lista.
export const EstanciaCreate = () => (
  <Create title="Nueva estancia" redirect="list" sx={{ maxWidth: 720 }}>
    <SimpleForm>
      <TituloFormulario texto="Nueva estancia" />
      <TextInput source="nombre" label="Nombre" validate={required()} />
      <TextInput source="direccion" label="Dirección" />
      <TextInput source="telefono" label="Teléfono" />
    </SimpleForm>
  </Create>
);
