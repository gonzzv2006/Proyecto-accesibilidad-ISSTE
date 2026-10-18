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
