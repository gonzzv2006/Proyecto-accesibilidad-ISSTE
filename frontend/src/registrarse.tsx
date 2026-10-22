// Pantalla Registrar usuario donde el supervisor crea cuentas con POST /registrarse

import React, { useState, ChangeEvent, FormEvent } from "react";
import { Title } from "react-admin";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

// datosVacios es el estado inicial y limpia el formulario al crear
const datosVacios = { nombre: "", username: "", password: "", rol: "docente" };

// useState guarda los campos en datos y el resultado en mensaje
const Registrarse: React.FC = () => {
  const [datos, setDatos] = useState(datosVacios);
  const [mensaje, setMensaje] = useState("");

  // Un solo handleChange que cambia el campo según event.target.name
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setDatos({ ...datos, [event.target.name]: event.target.value });
  };

  // POST a /registrarse desde onSubmit para que también se envíe con Enter
  const handleSendData = async (event: FormEvent) => {
    event.preventDefault();
    const request = new Request(import.meta.env.VITE_BACKEND + "/registrarse", {
      method: "POST",
      body: JSON.stringify(datos),
      headers: new Headers({
        "Content-Type": "application/json",
        Authentication: sessionStorage.getItem("auth") ?? "",
      }),
    });
    // Cada res.status se convierte en un mensaje claro para el usuario
    try {
      const res = await fetch(request);
      if (res.status == 201) {
        setMensaje("Usuario creado: " + datos.username);
        setDatos(datosVacios);
      } else if (res.status == 409) {
        setMensaje("Ese usuario ya existe");
      } else if (res.status == 400) {
        setMensaje("Llena todos los campos");
      } else if (res.status == 401) {
        // El 401 se avisa aquí porque fetch no pasa por el dataProvider
        setMensaje("Tu sesión terminó; vuelve a iniciar sesión");
      } else if (res.status == 403) {
        setMensaje("No tienes permiso para esta acción");
      } else {
        setMensaje("No se pudo registrar el usuario");
      }
    } catch {
      // fetch sin respuesta indica backend apagado o certificado sin aceptar
      setMensaje("No se pudo conectar con el servidor");
    }
  };

  // TextField liga cada label con su input y role="status" anuncia el mensaje
  return (
    <Card sx={{ mt: 2, maxWidth: 560 }}>
      <Title title="Registrar usuario" />
      <title>Registrar usuario · SIRAI</title>
      <CardHeader
        title="Registrar usuario"
        subheader="Crea la cuenta de un docente, de Enfermería o de un supervisor."
        slotProps={{ title: { component: "h1", variant: "h5" } }}
      />
      <CardContent>
        <form onSubmit={handleSendData}>
          <Stack spacing={2}>
            <TextField
              label="Nombre completo"
              id="nombre"
              name="nombre"
              value={datos.nombre}
              onChange={handleChange}
              required
            />
            <TextField
              label="Usuario"
              id="username"
              name="username"
              value={datos.username}
              onChange={handleChange}
              autoComplete="off"
              required
            />
            <TextField
              label="Contraseña"
              type="password"
              id="password"
              name="password"
              value={datos.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <TextField
              select
              label="Rol"
              id="rol"
              name="rol"
              value={datos.rol}
              onChange={handleChange}
              slotProps={{ select: { native: true } }}
            >
              <option value="docente">Docente</option>
              <option value="enfermeria">Enfermería / Trabajo social</option>
              <option value="supervisor">Supervisor</option>
            </TextField>
            <Button type="submit" variant="contained">
              Crear usuario
            </Button>
            <Typography role="status">{mensaje}</Typography>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
};
export default Registrarse;
