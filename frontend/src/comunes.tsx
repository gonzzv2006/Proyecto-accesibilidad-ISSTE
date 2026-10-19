// Componentes y utilidades que comparten varias pantallas del frontend

import { useLayoutEffect, useRef } from "react";
import type { ChangeEvent, ReactElement, ReactNode } from "react";
import {
  Confirm,
  ConfirmProps,
  FieldTitle,
  InputHelperText,
  TopToolbar,
  downloadCSV,
  fetchRelatedRecords,
  useChoices,
  useChoicesContext,
  useDataProvider,
  useGetList,
  useGetRecordRepresentation,
  useInput,
  useListContext,
  useNotify,
  useResourceContext,
} from "react-admin";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import SeguimientoIcon from "@mui/icons-material/PhoneInTalk";
import CerradoIcon from "@mui/icons-material/Lock";
import NuevoIcon from "@mui/icons-material/Add";
import ExportarIcon from "@mui/icons-material/FileDownload";
import SinMarcarIcon from "@mui/icons-material/HelpOutline";
import PresenteIcon from "@mui/icons-material/CheckCircle";
import JustificadoIcon from "@mui/icons-material/EventBusy";
import FaltaIcon from "@mui/icons-material/Cancel";
import ComisionIcon from "@mui/icons-material/LocalHospital";
import FiltroIcon from "@mui/icons-material/Sick";

// Incidencias del ISSSTE más Sin marcar con su nombre ícono y color
export const INCIDENCIAS: Record<
  string,
  {
    nombre: string;
    icono: ReactElement;
    color: "default" | "success" | "warning" | "error";
  }
> = {
  pendiente: {
    nombre: "Sin marcar",
    icono: <SinMarcarIcon />,
    color: "default",
  },
  presente: { nombre: "Presente", icono: <PresenteIcon />, color: "success" },
  ausente_justificado: {
    nombre: "Ausente justificado",
    icono: <JustificadoIcon />,
    color: "default",
  },
  falta_injustificada: {
    nombre: "Falta injustificada",
    icono: <FaltaIcon />,
    color: "error",
  },
  comision_medica: {
    nombre: "Comisión médica",
    icono: <ComisionIcon />,
    color: "default",
  },
  filtro_sanitario: {
    nombre: "Filtro sanitario",
    icono: <FiltroIcon />,
    color: "warning",
  },
};

// Chip con ícono y texto de la incidencia y pendiente por defecto
export const ChipIncidencia = ({ estado }: { estado: string }) => {
  const incidencia = INCIDENCIAS[estado] ?? INCIDENCIAS.pendiente;
  return (
    <Chip
      size="small"
      icon={incidencia.icono}
      label={incidencia.nombre}
      color={incidencia.color}
    />
  );
};

// Causas de seguimiento y nombreDeCausa que busca su nombre con find
export const CAUSAS = [
  { id: "SIN_CLASIFICAR", name: "Sin clasificar" },
  { id: "ENF_CASA", name: "Enfermedad en casa" },
  { id: "ACC_EXT", name: "Accidente fuera de la estancia" },
  { id: "PER_TUT", name: "Permiso del tutor" },
  { id: "NO_LOC", name: "No se localizó al tutor" },
];
export const nombreDeCausa = (causa?: string) =>
  CAUSAS.find((opcion) => opcion.id === causa)?.name ?? "Sin clasificar";

// Roles con su nombre en pantalla y nombreDeRol con find o guion
export const ROLES = [
  { id: "docente", name: "Docente" },
  { id: "enfermeria", name: "Enfermería / Trabajo social" },
  { id: "administrador", name: "Administrador" },
  { id: "supervisor", name: "Supervisor" },
];
export const nombreDeRol = (rol?: string | null) =>
  ROLES.find((opcion) => opcion.id === rol)?.name ?? "—";

// Filtro fijo de seguimientos abiertos con requiereAlta para reutilizar la consulta
export const CANDADOS = {
  filter: { estado: "abierto", requiereAlta: true },
  pagination: { page: 1, perPage: 1000 },
};

// Chip warning con candado que avisa que el alumno necesita alta
export const ChipCandado = () => (
  <Chip
    size="small"
    icon={<CerradoIcon />}
    color="warning"
    label="Requiere alta para ingresar"
  />
);

// Fecha AAAA-MM-DD en formato de México sin corrimiento por zona horaria
export const fechaMX = (fecha?: string) =>
  fecha ? new Date(fecha + "T12:00").toLocaleDateString("es-MX") : "";

// Arma el CSV con BOM para acentos y escapa celdas contra fórmulas
export const descargarCSV = (
  filas: Record<string, unknown>[],
  nombre: string,
) => {
  const celda = (valor: unknown) => {
    let texto = String(valor ?? "");
    if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
    return `"${texto.replace(/"/g, '""')}"`;
  };
  const encabezados = Object.keys(filas[0] ?? {});
  const lineas = [
    encabezados,
    ...filas.map((fila) => encabezados.map((campo) => fila[campo])),
  ];
  const csv = lineas.map((linea) => linea.map(celda).join(",")).join("\r\n");
  downloadCSV("﻿" + csv, nombre);
};

// Exporta con los filtros de la lista y manda _exportar para logs
export const BotonExportar = () => {
  const { exporter, filterValues, sort, resource, total } = useListContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const exportar = () =>
    dataProvider
      .getList(resource, {
        sort,
        filter: { ...filterValues, _exportar: 1 },
        pagination: { page: 1, perPage: 1000 },
      })
      .then(({ data }) =>
        exporter?.(
          data,
          fetchRelatedRecords(dataProvider),
          dataProvider,
          resource,
        ),
      )
      .catch(() => notify("No se pudo exportar el CSV", { type: "error" }));
  return (
    <Button
      variant="outlined"
      startIcon={<ExportarIcon />}
      disabled={!total}
      onClick={exportar}
    >
      Exportar CSV
    </Button>
  );
};

// Contador de diálogos abiertos para dejar el fondo inert mientras haya alguno
let dialogosAbiertos = 0;
// Pone o quita inert en #root según los diálogos abiertos
const actualizarFondo = () => {
  const raiz = document.getElementById("root");
  if (raiz) raiz.inert = dialogosAbiertos > 0;
};

// Confirm de React Admin que deja el fondo inert mientras está abierto
export const ConfirmAccesible = (props: ConfirmProps) => {
  // useRef evita sumar el mismo diálogo dos veces al contador
  const contado = useRef(false);

  // Al cerrarse o desmontarse el diálogo se resta del contador
  useLayoutEffect(() => {
    const soltar = () => {
      if (!contado.current) return;
      contado.current = false;
      dialogosAbiertos--;
      actualizarFondo();
    };
    if (!props.isOpen) soltar();
    return soltar;
  }, [props.isOpen]);

  // Suma al contador cuando el diálogo termina de aparecer
  const alAparecer = () => {
    if (contado.current) return;
    contado.current = true;
    dialogosAbiertos++;
    actualizarFondo();
  };

  return (
    <Confirm {...props} slotProps={{ transition: { onEntered: alAparecer } }} />
  );
};

// Dialog con fondo inert y un botón Cerrar que usa el escáner
export const DialogoAccesible = ({
  abierto,
  titulo,
  onClose,
  children,
}: {
  abierto: boolean;
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  const contado = useRef(false);

  // Al cerrarse o desmontarse resta del contador igual que ConfirmAccesible
  useLayoutEffect(() => {
    const soltar = () => {
      if (!contado.current) return;
      contado.current = false;
      dialogosAbiertos--;
      actualizarFondo();
    };
    if (!abierto) soltar();
    return soltar;
  }, [abierto]);

  // Igual que en ConfirmAccesible suma al contador cuando ya apareció
  const alAparecer = () => {
    if (contado.current) return;
    contado.current = true;
    dialogosAbiertos++;
    actualizarFondo();
  };

  return (
    <Dialog
      open={abierto}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ transition: { onEntered: alAparecer } }}
    >
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

// Título del formulario como h1 y como title de la pestaña
export const TituloFormulario = ({ texto }: { texto: string }) => (
  <>
    <title>{`${texto} · SIRAI`}</title>
    <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
      {texto}
    </Typography>
  </>
);

// TopToolbar con el conteo en role="status" y botones de crear y exportar
export const AccionesLista = ({
  singular,
  plural,
  nuevo,
  exportar,
}: {
  singular: string;
  plural: string;
  nuevo?: string;
  exportar?: boolean;
}) => {
  const { total, isPending } = useListContext();
  const recurso = useResourceContext();
  // Texto del conteo en singular o plural y Cargando si isPending
  let resultados = `${total ?? 0} ${plural}`;
  if (isPending) resultados = "Cargando…";
  if (total === 1) resultados = `1 ${singular}`;

  return (
    <TopToolbar>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { xs: "flex-end", sm: "center" } }}
      >
        <Typography role="status" variant="body2" color="textSecondary">
          {resultados}
        </Typography>
        {exportar && <BotonExportar />}
        {nuevo && (
          <Button
            variant="contained"
            startIcon={<NuevoIcon />}
            href={`#/${recurso}/create`}
          >
            {nuevo}
          </Button>
        )}
      </Stack>
    </TopToolbar>
  );
};

// Chip con candado y hora de cierre para no depender del verde
export const PaseCerrado = ({ horaCierre }: { horaCierre: string }) => (
  <Chip
    icon={<CerradoIcon />}
    color="success"
    label={`Pase cerrado a las ${new Date(horaCierre).toLocaleTimeString(
      "es-MX",
      { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
    )}`}
  />
);

// Encabezado de lista con h1 y ayuda más el title de pestaña
export const Encabezado = ({
  titulo,
  ayuda,
}: {
  titulo: string;
  ayuda: string;
}) => (
  <Stack spacing={0.5} sx={{ mt: 2, mb: 1 }}>
    <title>{`${titulo} · SIRAI`}</title>
    <Typography variant="h5" component="h1">
      {titulo}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      {ayuda}
    </Typography>
  </Stack>
);

// Aviso de lista vacía con InfoIcon y un botón opcional en children
export const ListaVacia = ({
  mensaje,
  children,
}: {
  mensaje: string;
  children?: ReactNode;
}) => (
  <CardContent>
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <InfoIcon color="primary" />
      <Typography>{mensaje}</Typography>
    </Stack>
    {children}
  </CardContent>
);

// Tarjeta del tablero con título h2 y número grande como párrafo
export const TarjetaResumen = ({
  titulo,
  icono,
  valor,
  detalle,
  children,
}: {
  titulo: string;
  icono: ReactNode;
  valor: string;
  detalle: string;
  children?: ReactNode;
}) => (
  <Card sx={{ height: "100%" }}>
    <CardHeader
      avatar={icono}
      title={titulo}
      slotProps={{ title: { component: "h2", variant: "subtitle1" } }}
    />
    <CardContent sx={{ pt: 0 }}>
      <Typography variant="h3" component="p">
        {valor}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {detalle}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

// Tarjeta con el total de seguimientos abiertos para el inicio docente
export const SeguimientosAbiertos = ({ titulo }: { titulo: string }) => {
  // useGetList con perPage 1 porque solo importa el total de X-Total-Count
  const { total, isPending, error } = useGetList("seguimientos", {
    filter: { estado: "abierto" },
    pagination: { page: 1, perPage: 1 },
  });
  const icono = <SeguimientoIcon color="primary" />;

  // Muestra Cargando o Datos no disponibles según isPending y error
  if (isPending) {
    return (
      <TarjetaResumen
        titulo={titulo}
        icono={icono}
        valor="…"
        detalle="Cargando…"
      />
    );
  }
  if (error) {
    return (
      <TarjetaResumen
        titulo={titulo}
        icono={icono}
        valor="—"
        detalle="Datos no disponibles"
      />
    );
  }

  return (
    <TarjetaResumen
      titulo={titulo}
      icono={icono}
      valor={String(total)}
      detalle={total === 1 ? "seguimiento abierto" : "seguimientos abiertos"}
    >
      <Button variant="outlined" href="#/seguimientos" sx={{ mt: 2 }}>
        Ir a seguimiento
      </Button>
    </TarjetaResumen>
  );
};

// Mismas props que SelectInput para cambiarlo sin tocar otras pantallas
type SelectNativoProps = {
  source?: string;
  label: string;
  choices?: { id: string | number; name: string }[];
  emptyText?: string;
  alwaysOn?: boolean;
  helperText?: string | false;
  size?: "small" | "medium";
  margin?: "none" | "dense" | "normal";
  variant?: "filled" | "outlined" | "standard";
  sinVacio?: boolean;
};

// Select nativo con option porque SelectInput usa MenuItem y fallaba la etiqueta
export const SelectNativo = ({
  source: fuente,
  label,
  choices,
  emptyText = "Sin elegir",
  helperText,
  size,
  margin,
  variant,
  sinVacio,
}: SelectNativoProps) => {
  // useChoicesContext toma opciones del ReferenceInput o de las choices fijas
  const {
    allChoices,
    isPending,
    error: errorAlCargar,
    source,
    resource,
    isFromReference,
  } = useChoicesContext({ choices, source: fuente });
  // useGetRecordRepresentation muestra el nombre del registro en vez de su id
  const representacion = useGetRecordRepresentation(resource);
  const { getChoiceText, getChoiceValue } = useChoices({
    optionText: isFromReference ? representacion : undefined,
    translateChoice: false,
  });
  // useInput conecta el campo al formulario y su id une la etiqueta
  const { field, fieldState, id, isRequired } = useInput({ source, resource });
  const opciones = errorAlCargar ? [] : (allChoices ?? []);

  // Busca la opción con getChoiceValue para guardar el valor con su tipo
  const alCambiar = (evento: ChangeEvent<HTMLInputElement>) => {
    const elegida = opciones.find(
      (opcion) => String(getChoiceValue(opcion)) === evento.target.value,
    );
    field.onChange(elegida ? getChoiceValue(elegida) : "");
  };

  // Etiqueta con shrink porque el select nativo siempre muestra una opción
  return (
    <TextField
      id={id}
      name={field.name}
      inputRef={field.ref}
      value={field.value ?? ""}
      onChange={alCambiar}
      onBlur={field.onBlur}
      select
      label={
        <FieldTitle
          label={label}
          source={source}
          resource={resource}
          isRequired={isRequired}
        />
      }
      error={!!errorAlCargar || fieldState.invalid}
      helperText={
        helperText === false ? undefined : (
          <InputHelperText
            error={fieldState.error?.message}
            helperText={helperText}
          />
        )
      }
      disabled={isPending}
      size={size}
      margin={margin}
      variant={variant}
      sx={{ minWidth: 160 }}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
    >
      {!sinVacio && <option value="">{emptyText}</option>}
      {opciones.map((opcion) => (
        <option
          key={String(getChoiceValue(opcion))}
          value={getChoiceValue(opcion)}
        >
          {getChoiceText(opcion)}
        </option>
      ))}
    </TextField>
  );
};
