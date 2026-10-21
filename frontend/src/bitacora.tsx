// Bitácora de solo lectura con List de logs para el supervisor
import {
  List,
  DataTable,
  SimpleList,
  DateField,
  DateInput,
  FunctionField,
  TextInput,
} from "react-admin";
import { Stack, useMediaQuery, Theme } from "@mui/material";
import { AccionesLista, Encabezado, ListaVacia, nombreDeRol } from "./comunes";

// Filtros de usuario y acción con TextInput y de día con DateInput
const filtrosBitacora = [
  <TextInput key="sujeto" source="sujeto" label="Usuario" alwaysOn />,
  <TextInput key="accion" source="accion" label="Acción" alwaysOn />,
  <DateInput key="fecha" source="fecha" label="Fecha" alwaysOn />,
];

// Fecha y hora del log en 24 horas con toLocaleString
const fechaYHora = (timestamp: string) =>
  new Date(timestamp).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: "h23",
  });

// useMediaQuery cambia la tabla de 7 columnas por SimpleList bajo lg
export const BitacoraList = () => {
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("lg"));
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Bitácora"
        ayuda="Cada acción que se hace en SIRAI. Es de solo lectura: nadie puede editarla ni borrarla."
      />
      <List
        title="Bitácora"
        filters={filtrosBitacora}
        sort={{ field: "timestamp", order: "DESC" }}
        exporter={false}
        actions={<AccionesLista singular="registro" plural="registros" />}
      >
        {isSmall ? (
          <SimpleList
            primaryText={(log) => `${log.accion} · ${log.objeto ?? ""}`}
            secondaryText={(log) =>
              `${log.sujeto} · ${nombreDeRol(log.rol)} · IP ${log.ip}`
            }
            tertiaryText={(log) => fechaYHora(log.timestamp)}
            rowClick={false}
            empty={<ListaVacia mensaje="No hay registros con estos filtros." />}
          />
        ) : (
          <DataTable
            aria-label="Bitácora"
            bulkActionButtons={false}
            rowClick={false}
            empty={<ListaVacia mensaje="No hay registros con estos filtros." />}
          >
            <DataTable.Col source="timestamp" label="Fecha">
              <DateField
                source="timestamp"
                showTime
                locales="es-MX"
                options={{
                  dateStyle: "short",
                  timeStyle: "medium",
                  hourCycle: "h23",
                }}
              />
            </DataTable.Col>
            <DataTable.Col source="sujeto" label="Usuario" />
            <DataTable.Col source="rol" label="Rol">
              <FunctionField render={(log) => nombreDeRol(log.rol)} />
            </DataTable.Col>
            <DataTable.Col source="accion" label="Acción" />
            <DataTable.Col source="objeto" label="Objeto" />
            <DataTable.Col source="registro" label="Registro" />
            <DataTable.Col source="ip" label="IP" />
          </DataTable>
        )}
      </List>
    </Stack>
  );
};
