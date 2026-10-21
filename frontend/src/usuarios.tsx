// Lista de usuarios de solo lectura para el supervisor sin password
import { List, DataTable, SimpleList, FunctionField } from "react-admin";
import { Button, Stack, useMediaQuery, Theme } from "@mui/material";
import RegistrarseIcon from "@mui/icons-material/PersonAdd";
import { AccionesLista, Encabezado, ListaVacia, nombreDeRol } from "./comunes";

// useMediaQuery alterna DataTable y SimpleList y el botón abre /registrarse
export const UsuarioList = () => {
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Usuarios"
        ayuda="Cuentas que pueden entrar a SIRAI con su rol."
      />
      <Stack direction="row" sx={{ mb: 1 }}>
        <Button
          variant="contained"
          startIcon={<RegistrarseIcon />}
          href="#/registrarse"
        >
          Registrar usuario
        </Button>
      </Stack>
      <List
        title="Usuarios"
        sort={{ field: "nombre", order: "ASC" }}
        exporter={false}
        actions={<AccionesLista singular="usuario" plural="usuarios" />}
      >
        {isSmall ? (
          <SimpleList
            primaryText={(usuario) => usuario.nombre}
            secondaryText={(usuario) =>
              `${usuario.usuario} · ${nombreDeRol(usuario.rol)}`
            }
            rowClick={false}
            empty={<ListaVacia mensaje="No hay usuarios registrados." />}
          />
        ) : (
          <DataTable
            aria-label="Usuarios"
            bulkActionButtons={false}
            rowClick={false}
            empty={<ListaVacia mensaje="No hay usuarios registrados." />}
          >
            <DataTable.Col source="nombre" label="Nombre" />
            <DataTable.Col source="usuario" label="Usuario" />
            <DataTable.Col source="rol" label="Rol">
              <FunctionField render={(usuario) => nombreDeRol(usuario.rol)} />
            </DataTable.Col>
          </DataTable>
        )}
      </List>
    </Stack>
  );
};
