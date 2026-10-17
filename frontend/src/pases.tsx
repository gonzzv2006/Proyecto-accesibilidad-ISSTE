// Historial de pases cerrados con List y Show sin pantalla Create
import {
  List,
  DataTable,
  SimpleList,
  Show,
  SimpleShowLayout,
  ReferenceField,
  ReferenceInput,
  ReferenceManyField,
  DateInput,
  DateField,
  TextField,
  Labeled,
  Exporter,
  useRecordContext,
  usePermissions,
} from "react-admin";
import { Card, Stack, useMediaQuery, Theme } from "@mui/material";
import {
  AccionesLista,
  Encabezado,
  ListaVacia,
  PaseCerrado,
  TituloFormulario,
  SelectNativo,
  descargarCSV,
  fechaMX,
} from "./comunes";
import { IncidenciaDelAlumno } from "./asistencias";

// Filtros de fecha y grupo con alwaysOn y select nativo
const paseFilters = [
  <DateInput key="fecha" source="fecha" label="Fecha" alwaysOn />,
  <ReferenceInput key="grupoId" source="grupoId" reference="grupos" alwaysOn>
    <SelectNativo label="Grupo" emptyText="Todos los grupos" />
  </ReferenceInput>,
];

// Porcentaje del pase con presentes y ausentes de useRecordContext
const PorcentajePase = () => {
  const pase = useRecordContext();
  if (!pase) return null;
  const marcados = pase.presentes + pase.ausentes;
  // Guion si no hay marcados para no dividir entre cero
  if (marcados === 0) return <span>—</span>;
  return <span>{Math.round((pase.presentes / marcados) * 100)} %</span>;
};

// Exporter con fetchRelatedRecords para nombres de grupo y estancia en el CSV
const exportarPases: Exporter = async (pases, fetchRelatedRecords) => {
  const grupos = await fetchRelatedRecords(pases, "grupoId", "grupos");
  const estancias = await fetchRelatedRecords(pases, "estanciaId", "estancias");
  const filas = pases.map((pase) => {
    const marcados = pase.presentes + pase.ausentes;
    return {
      Fecha: fechaMX(pase.fecha),
      Grupo: grupos[pase.grupoId]?.nombre ?? "",
      Estancia: estancias[pase.estanciaId]?.nombre ?? "",
      Presentes: pase.presentes,
      Faltas: pase.ausentes,
      "% de asistencia":
        marcados === 0
          ? ""
          : `${Math.round((pase.presentes / marcados) * 100)} %`,
      "Hora de cierre": new Date(pase.horaCierre).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    };
  });
  descargarCSV(filas, "historial-de-pases");
};

// DateField muestra solo la hora de cierre en 24 horas
const HoraDeCierre = () => (
  <DateField
    source="horaCierre"
    showTime
    showDate={false}
    locales="es-MX"
    options={{ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }}
  />
);

// Fecha descendente y usePermissions muestra Cerró solo al supervisor
export const PaseList = () => {
  const { permissions } = usePermissions();
  // useMediaQuery cambia la tabla por SimpleList en pantallas menores a md
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("md"));
  // rowClick show abre el detalle del pase al tocar el renglón
  return (
    <Stack sx={{ maxWidth: 1280 }}>
      <Encabezado
        titulo="Historial de pases"
        ayuda="Pases de lista cerrados. Filtra por fecha o grupo y abre uno para ver a sus alumnos."
      />
      <List
        title="Historial de pases"
        filters={paseFilters}
        sort={{ field: "fecha", order: "DESC" }}
        exporter={exportarPases}
        actions={
          <AccionesLista
            singular="pase cerrado"
            plural="pases cerrados"
            exportar
          />
        }
        empty={
          <Card>
            <ListaVacia mensaje="Todavía no hay pases cerrados. Aparecen aquí cuando un docente termina su pase de lista." />
          </Card>
        }
      >
        {isSmall ? (
          <SimpleList
            primaryText={
              <ReferenceField
                source="grupoId"
                reference="grupos"
                link={false}
              />
            }
            secondaryText={(pase) =>
              `${new Date(pase.fecha + "T12:00").toLocaleDateString("es-MX")} · ${pase.presentes} presentes · ${pase.ausentes} faltas`
            }
            rowClick="show"
          />
        ) : (
          <DataTable
            aria-label="Historial de pases"
            bulkActionButtons={false}
            rowClick="show"
            empty={
              <ListaVacia mensaje="No hay pases cerrados con estos filtros." />
            }
          >
            <DataTable.Col source="fecha" label="Fecha">
              <DateField source="fecha" locales="es-MX" />
            </DataTable.Col>
            <DataTable.Col source="grupoId" label="Grupo">
              <ReferenceField
                source="grupoId"
                reference="grupos"
                link={false}
              />
            </DataTable.Col>
            <DataTable.Col source="presentes" label="Presentes" />
            <DataTable.Col source="ausentes" label="Faltas" />
            <DataTable.Col label="% Asistencia">
              <PorcentajePase />
            </DataTable.Col>
            <DataTable.Col source="horaCierre" label="Hora de cierre">
              <HoraDeCierre />
            </DataTable.Col>
            {permissions === "supervisor" && (
              <DataTable.Col source="usuarioId" label="Cerró">
                <ReferenceField
                  source="usuarioId"
                  reference="usuarios"
                  link={false}
                />
              </DataTable.Col>
            )}
          </DataTable>
        )}
      </List>
    </Stack>
  );
};

// Chip PaseCerrado del detalle con la horaCierre del registro
const EstadoDelPase = () => {
  const pase = useRecordContext();
  if (!pase) return null;
  return <PaseCerrado horaCierre={pase.horaCierre} />;
};

// Alumnos del pase y el supervisor puede corregir su incidencia
const AlumnosDelPase = () => {
  const pase = useRecordContext();
  // useMediaQuery pone la incidencia debajo del nombre en pantalla chica
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  if (!pase) return null;

  // ReferenceManyField trae las asistencias del grupo filtradas por la fecha del pase
  return (
    <ReferenceManyField
      reference="asistencias"
      target="grupoId"
      source="grupoId"
      filter={{ fecha: pase.fecha }}
      sort={{ field: "alumnoId", order: "ASC" }}
      perPage={100}
    >
      <DataTable
        aria-label="Alumnos del pase"
        bulkActionButtons={false}
        rowClick={false}
      >
        <DataTable.Col source="alumnoId" label="Alumno">
          <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
            <ReferenceField
              source="alumnoId"
              reference="alumnos"
              link={false}
            />
            {isSmall && <IncidenciaDelAlumno />}
          </Stack>
        </DataTable.Col>
        {!isSmall && (
          <DataTable.Col source="estado" label="Incidencia">
            <IncidenciaDelAlumno />
          </DataTable.Col>
        )}
      </DataTable>
    </ReferenceManyField>
  );
};

// Detalle del pase con Show y SimpleShowLayout con totales y alumnos
export const PaseShow = () => (
  <Show title="Pase de lista cerrado" sx={{ maxWidth: 960 }}>
    <SimpleShowLayout>
      <TituloFormulario texto="Pase de lista cerrado" />
      <DateField source="fecha" label="Fecha" locales="es-MX" />
      <ReferenceField
        source="grupoId"
        reference="grupos"
        label="Grupo"
        link={false}
      />
      <Labeled label="Estado">
        <EstadoDelPase />
      </Labeled>
      <TextField source="presentes" label="Presentes" />
      <TextField source="ausentes" label="Faltas" />
      <Labeled label="Alumnos">
        <AlumnosDelPase />
      </Labeled>
    </SimpleShowLayout>
  </Show>
);
