// CRUD de tutores con buscador y formularios con validación
// Hecho con IA (solo estructura): imports y componentes vacíos de TutorList, TutorEdit y TutorCreate; los campos, validaciones, filtros y lista los escribimos manualmente.
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

// Choices de parentesco con id guardado en Mongo y name visible
const parentescos = [
  { id: "madre", name: "Madre" },
  { id: "padre", name: "Padre" },
  { id: "abuelo", name: "Abuelo(a)" },
  { id: "otro", name: "Otro" },
];

// Filtro q alwaysOn buscado en backend con regex en nombre y apellidos
const tutorFilters = [<TextInput key="q" source="q" label="Buscar" alwaysOn />];

// List de tutores por apellidos con buscador y AccionesLista
export const TutorList = () => {
  // Debajo de md useMediaQuery cambia a SimpleList sin scroll lateral
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

// Edit con ID en Labeled y select nativo en parentesco por accesibilidad
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

// Create con las mismas validaciones required() y email() pero sin ID
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
