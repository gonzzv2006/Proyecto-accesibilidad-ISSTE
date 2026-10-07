// Pantallas de tutores (mamá, papá o quien recoge al alumno): la lista y los formularios.
import {
  List,
  DataTable,
  SimpleList,
  SelectField,
  EmailField,
  Labeled,
  TextField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  required,
  email,
} from "react-admin";
import { Button, Card, Stack, useMediaQuery, Theme } from "@mui/material";
import {
  AccionesLista,
  Encabezado,
  ListaVacia,
  TituloFormulario,
  SelectNativo,
} from "./comunes";

// Opciones de parentesco: id es lo que se guarda en la base y name lo que se ve.
const parentescos = [
  { id: "madre", name: "Madre" },
  { id: "padre", name: "Padre" },
  { id: "abuelo", name: "Abuelo(a)" },
  { id: "otro", name: "Otro" },
];

// Solo un buscador siempre visible; el backend busca en nombre y apellidos.
const tutorFilters = [<TextInput key="q" source="q" label="Buscar" alwaysOn />];

// Lista de tutores con buscador y el botón para agregar uno nuevo.
export const TutorList = () => {
  // Debajo de 900 px la tabla ya no cabe, así que uso una lista simple sin scroll de lado.
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("md"));
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Tutores"
        ayuda="Contacto de mamá, papá o quien recoge al alumno."
      />
      <List
        filters={tutorFilters}
        sort={{ field: "apellidos", order: "ASC" }}
        exporter={false}
        actions={
          <AccionesLista
            singular="tutor"
            plural="tutores"
            nuevo="Nuevo tutor"
          />
        }
        empty={
          <Card>
            <ListaVacia mensaje="Todavía no hay tutores registrados. Usa «Nuevo tutor» para agregar el primero.">
              <Button
                variant="contained"
                href="#/tutores/create"
                sx={{ mt: 2 }}
              >
                Nuevo tutor
              </Button>
            </ListaVacia>
          </Card>
        }
      >
        {isSmall ? (
          <SimpleList
            primaryText={(record) => `${record.nombre} ${record.apellidos}`}
            secondaryText={(record) => record.telefono}
            tertiaryText={(record) => record.parentesco}
          />
        ) : (
          <DataTable aria-label="Tutores" bulkActionButtons={false}>
            <DataTable.Col source="nombre" label="Nombre" />
            <DataTable.Col source="apellidos" label="Apellidos" />
            <DataTable.Col source="parentesco" label="Parentesco">
              <SelectField source="parentesco" choices={parentescos} />
            </DataTable.Col>
            <DataTable.Col source="telefono" label="Teléfono" />
            <DataTable.Col source="correo" label="Correo">
              <EmailField source="correo" />
            </DataTable.Col>
          </DataTable>
        )}
      </List>
    </Stack>
  );
};

// Editar tutor. El ID va como texto y no como campo gris deshabilitado que casi no se leía.
// Uso select nativo porque el de MUI no conectaba bien la etiqueta y WAVE marcaba error.
export const TutorEdit = () => (
  <Edit title="Editar tutor" sx={{ maxWidth: 720 }}>
    <SimpleForm>
      <TituloFormulario texto="Editar tutor" />
      <Labeled label="ID">
        <TextField source="id" />
      </Labeled>
      <TextInput source="nombre" label="Nombre" validate={required()} />
      <TextInput source="apellidos" label="Apellidos" validate={required()} />
      <SelectNativo
        source="parentesco"
        label="Parentesco"
        choices={parentescos}
      />
      <TextInput source="telefono" label="Teléfono" validate={required()} />
      <TextInput source="correo" label="Correo" validate={email()} />
    </SimpleForm>
  </Edit>
);

// Alta de tutor con los mismos campos y validaciones que editar, pero sin el ID.
export const TutorCreate = () => (
  <Create title="Nuevo tutor" redirect="list" sx={{ maxWidth: 720 }}>
    <SimpleForm>
      <TituloFormulario texto="Nuevo tutor" />
      <TextInput source="nombre" label="Nombre" validate={required()} />
      <TextInput source="apellidos" label="Apellidos" validate={required()} />
      <SelectNativo
        source="parentesco"
        label="Parentesco"
        choices={parentescos}
      />
      <TextInput source="telefono" label="Teléfono" validate={required()} />
      <TextInput source="correo" label="Correo" validate={email()} />
    </SimpleForm>
  </Create>
);
