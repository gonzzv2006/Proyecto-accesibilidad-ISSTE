// Leonardo André Flores Mendoza A01782221, Gonzalo Zamarrón Orrantia A01782739, Patricio Carreras Báez A01754749
// Componente App con Admin de tema guinda y recursos según el rol

import {
  Admin,
  Authenticated,
  Resource,
  CustomRoutes,
  defaultTheme,
} from "react-admin";
import { Route } from "react-router-dom";
import { esES } from "@mui/material/locale";
import type { Theme } from "@mui/material";
import { Layout } from "./Layout";
import { dataProvider } from "./dataProvider";
import { authProvider } from "./authProvider";
import { i18nProvider } from "./i18nProvider";
import Registrarse from "./registrarse";
import { LoginSirai } from "./login";
import { Tablero } from "./tablero";
import { AsistenciaList } from "./asistencias";
import {
  SeguimientoList,
  SeguimientoEdit,
  SeguimientoCreate,
} from "./seguimientos";
import { EstanciaList, EstanciaEdit, EstanciaCreate } from "./estancias";
import { GrupoList, GrupoEdit, GrupoCreate } from "./grupos";
import { AlumnoList, AlumnoEdit, AlumnoCreate } from "./alumnos";
import { TutorList, TutorEdit, TutorCreate } from "./tutores";
import { PaseList, PaseShow } from "./pases";
import { UsuarioList } from "./usuarios";
import { BitacoraList } from "./bitacora";
import { Credencial } from "./credencial";

import PaseDeListaIcon from "@mui/icons-material/FactCheck";
import SeguimientoIcon from "@mui/icons-material/PhoneInTalk";
import EstanciaIcon from "@mui/icons-material/HomeWork";
import GrupoIcon from "@mui/icons-material/Groups";
import AlumnoIcon from "@mui/icons-material/ChildCare";
import TutorIcon from "@mui/icons-material/FamilyRestroom";
import HistorialIcon from "@mui/icons-material/History";
import UsuarioIcon from "@mui/icons-material/ManageAccounts";
import BitacoraIcon from "@mui/icons-material/ReceiptLong";

// Tema guinda sobre defaultTheme y esES para que pase el contraste
const tema = {
  ...defaultTheme,
  components: {
    ...esES.components,
    ...defaultTheme.components,
    // aria-label en MuiCircularProgress para que el lector de pantalla diga Cargando
    MuiCircularProgress: { defaultProps: { "aria-label": "Cargando" } },
    // styleOverrides pinta guinda RaSkipNavigationButton también en hover por contraste
    RaSkipNavigationButton: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          "&:hover": {
            backgroundColor: theme.palette.primary.dark,
            opacity: 1,
          },
        }),
      },
    },
    // Select nativo con aria-label en Filas por página y textos de esES
    MuiTablePagination: {
      defaultProps: {
        ...esES.components?.MuiTablePagination?.defaultProps,
        slotProps: {
          select: {
            native: true,
            inputProps: { "aria-label": "Filas por página" },
          },
        },
      },
    },
  },
  // palette con tonos más oscuros que MUI para leer el texto blanco
  palette: {
    ...defaultTheme.palette,
    primary: { main: "#8b1a1a" },
    // secondary guinda porque lo usan la AppBar y el ícono del login
    secondary: { main: "#8b1a1a", 500: "#8b1a1a" },
    success: { main: "#1b5e20" },
    warning: { main: "#8a4b00" },
    error: { main: "#b71c1c" },
  },
};

// Resource según permissions y los que no tienen list solo dan recordRepresentation
export const App = () => (
  <Admin
    layout={Layout}
    loginPage={LoginSirai}
    authProvider={authProvider}
    dataProvider={dataProvider}
    i18nProvider={i18nProvider}
    dashboard={Tablero}
    theme={tema}
  >
    {(permissions) => {
      const docente = permissions === "docente";
      const enfermeria = permissions === "enfermeria";
      const administrador = permissions === "administrador";
      const supervisor = permissions === "supervisor";
      return (
        <>
          {docente ? (
            <Resource
              name="asistencias"
              list={AsistenciaList}
              icon={PaseDeListaIcon}
              options={{ label: "Pase de lista" }}
            />
          ) : (
            <Resource name="asistencias" />
          )}
          {(docente || enfermeria) && (
            <Resource
              name="seguimientos"
              list={SeguimientoList}
              edit={enfermeria ? SeguimientoEdit : undefined}
              create={enfermeria ? SeguimientoCreate : undefined}
              icon={SeguimientoIcon}
              options={{ label: "Seguimiento de faltas" }}
            />
          )}
          {docente || administrador ? (
            <Resource
              name="pases"
              list={PaseList}
              show={PaseShow}
              icon={HistorialIcon}
              options={{ label: "Historial de pases" }}
            />
          ) : (
            <Resource name="pases" />
          )}
          {administrador ? (
            <Resource
              name="estancias"
              list={EstanciaList}
              edit={EstanciaEdit}
              create={EstanciaCreate}
              recordRepresentation="nombre"
              icon={EstanciaIcon}
              options={{ label: "Estancias" }}
            />
          ) : (
            <Resource name="estancias" recordRepresentation="nombre" />
          )}
          {administrador ? (
            <Resource
              name="grupos"
              list={GrupoList}
              edit={GrupoEdit}
              create={GrupoCreate}
              recordRepresentation="nombre"
              icon={GrupoIcon}
              options={{ label: "Grupos" }}
            />
          ) : (
            <Resource name="grupos" recordRepresentation="nombre" />
          )}
          {docente || administrador ? (
            <Resource
              name="alumnos"
              list={AlumnoList}
              edit={AlumnoEdit}
              create={AlumnoCreate}
              recordRepresentation={(record) =>
                `${record.nombre} ${record.apellidos}`
              }
              icon={AlumnoIcon}
              options={{ label: "Alumnos" }}
            />
          ) : (
            <Resource
              name="alumnos"
              recordRepresentation={(record) =>
                `${record.nombre} ${record.apellidos}`
              }
            />
          )}
          {docente || administrador ? (
            <Resource
              name="tutores"
              list={TutorList}
              edit={TutorEdit}
              create={TutorCreate}
              recordRepresentation={(record) =>
                `${record.nombre} ${record.apellidos}`
              }
              icon={TutorIcon}
              options={{ label: "Tutores" }}
            />
          ) : (
            <Resource
              name="tutores"
              recordRepresentation={(record) =>
                `${record.nombre} ${record.apellidos}`
              }
            />
          )}
          {supervisor ? (
            <Resource
              name="usuarios"
              list={UsuarioList}
              recordRepresentation="nombre"
              icon={UsuarioIcon}
              options={{ label: "Usuarios" }}
            />
          ) : (
            <Resource name="usuarios" recordRepresentation="nombre" />
          )}
          {supervisor && (
            <Resource
              name="logs"
              list={BitacoraList}
              icon={BitacoraIcon}
              options={{ label: "Bitácora" }}
            />
          )}
          <CustomRoutes noLayout>
            <Route
              path="/credenciales/:id"
              element={
                <Authenticated>
                  <Credencial />
                </Authenticated>
              }
            />
          </CustomRoutes>
          {supervisor && (
            <CustomRoutes>
              <Route path="/registrarse" element={<Registrarse />} />
            </CustomRoutes>
          )}
        </>
      );
    }}
  </Admin>
);
