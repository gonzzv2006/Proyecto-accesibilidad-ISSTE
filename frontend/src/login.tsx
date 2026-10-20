// Pantalla de login con Login de React Admin y encabezado de SIRAI

import { Login, LoginForm } from "react-admin";
import { CardContent, Typography } from "@mui/material";
import PaseDeListaIcon from "@mui/icons-material/FactCheck";

// Fondo primary.main con sx y title para la pestaña más un h1
export const LoginSirai = () => (
  <Login
    avatarIcon={<PaseDeListaIcon />}
    role="main"
    sx={{ backgroundImage: "none", backgroundColor: "primary.main" }}
  >
    <title>Iniciar sesión · SIRAI</title>
    <CardContent sx={{ pt: 0, pb: 0 }}>
      <Typography variant="h4" component="h1" align="center">
        SIRAI
      </Typography>
      <Typography variant="body2" color="textSecondary" align="center">
        Registro de asistencia – Estancias ISSSTE
      </Typography>
    </CardContent>
    <LoginForm />
  </Login>
);
