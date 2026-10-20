// Layout compartido con AppBar propia y menú por rol más AvisoSesion

import type { ReactNode } from "react";
import {
  AppBar,
  Layout as RALayout,
  Menu,
  TitlePortal,
  UserMenu,
  useGetIdentity,
  usePermissions,
} from "react-admin";
import { useMediaQuery, Theme } from "@mui/material";
import RegistrarseIcon from "@mui/icons-material/PersonAdd";
import { AvisoSesion } from "./sesion";

// Menu en un nav con aria-label y Registrar usuario solo para supervisor
const MenuSirai = () => {
  const { permissions } = usePermissions();
  return (
    <nav aria-label="Menú principal">
      <Menu>
        <Menu.DashboardItem />
        <Menu.ResourceItems />
        {permissions === "supervisor" && (
          <Menu.Item
            to="/registrarse"
            primaryText="Registrar usuario"
            leftIcon={<RegistrarseIcon />}
          />
        )}
      </Menu>
    </nav>
  );
};

// useMediaQuery elige la etiqueta del UserMenu con el nombre o solo Perfil
const AppBarSirai = () => {
  const { identity } = useGetIdentity();
  const isSmall = useMediaQuery<Theme>((theme) => theme.breakpoints.down("sm"));
  const etiqueta = isSmall
    ? "ra.auth.user_menu"
    : `Perfil de ${identity?.fullName ?? ""}`;
  // TitlePortal como span para dejar un solo h1 por pantalla
  return (
    <AppBar userMenu={<UserMenu label={etiqueta} />}>
      <TitlePortal component="span" />
    </AppBar>
  );
};

// RALayout con MenuSirai y AppBarSirai más AvisoSesion en todas las pantallas
export const Layout = ({ children }: { children: ReactNode }) => (
  <RALayout menu={MenuSirai} appBar={AppBarSirai}>
    {children}
    <AvisoSesion />
  </RALayout>
);
