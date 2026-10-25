<div align="center">

# 🧟 UndeadGrid · Web App

**CyberGrid: Breach & Sync** — defiende tu núcleo, resiste las oleadas y destruye el del rival, en 1v1 o 2v2.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![Canvas](https://img.shields.io/badge/Canvas-2D%2060%20FPS-f97316)
![Playwright](https://img.shields.io/badge/E2E-58%20Playwright-2ead33?logo=playwright&logoColor=white)

[**▶ Jugar**](https://undeadgrid.axiorapath.com.mx) · [Backend](https://github.com/AxioraPath/service-undeadgrid) · [Contrato de eventos](https://github.com/AxioraPath/service-undeadgrid/blob/main/EVENTS.md)

</div>

---

## Cómo se juega

| Fase | Duración | Qué pasa |
|---|---|---|
| Preparación | 1:00 | Construye tu base. Sin zombis ni PvP |
| Oleada 1 y 2 | 1:00 c/u | Zombis cada vez más fuertes |
| Horda final | 1:00 | Oleada enorme para cerrar |

Gana quien destruya el núcleo rival (o tenga ventaja al terminar el tiempo). En **2v2** cada equipo comparte base y núcleo,
sin fuego amigo.

### Controles

| Acción | PC | Móvil |
|---|---|---|
| Moverse | `WASD` / flechas | Joystick izquierdo |
| Apuntar y disparar | Mouse + clic (opcional en Ajustes) o `Espacio` | Joystick derecho |
| Construir | Clic derecho o `Espacio` en tu base | Tocar la casilla |
| Cambiar arma | `1`–`7`, `Q` (anterior), rueda del mouse | Barra de armas o botón rápido |

El HUD es **personalizable** (Ajustes → Interfaz): mueve y escala joysticks, barra de armas y paneles, y ajusta la transparencia.
En celular se recomienda jugar en horizontal; en vertical se pide girar el dispositivo.

## Características

- **Canvas 2D a la frecuencia del monitor**, con *delta time* e interpolación de snapshots del servidor.
- **Multijugador en tiempo real** con Socket.IO: salas por código, lobby con equipos, revancha y reconexión.
- **Cuentas y progresión:** XP, niveles y misiones diarias y permanentes.
- **Pantallas de resultados** por equipo con estadísticas de los 4 jugadores.
- **Validación propia** en todos los formularios (sin validación nativa del navegador).
- **Responsive:** sin scroll en partida, ajuste en pantalla completa, controles táctiles para móvil y tablet.

## Puesta en marcha

Requisitos: **Node.js 22** y el [backend](https://github.com/AxioraPath/service-undeadgrid) corriendo en `:3000`.

```bash
npm ci
npm run dev        # http://localhost:5173 (proxy al backend)
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + build de producción |
| `npm run lint` | Linter (oxlint) |
| `npm run test:e2e` | Pruebas E2E con Playwright |

`VITE_API_URL` (opcional) apunta a otro backend; vacío usa el mismo dominio.

## Pruebas E2E

58 pruebas con Playwright contra un servidor simulado (`e2e/mock-server.mjs`, REST + Socket.IO), sin depender del backend:

| Flujo | Qué valida |
|---|---|
| **Autenticación** | Rutas protegidas, credenciales inválidas, login y regreso a la URL original |
| **Lobbies** | Crear sala, conectar, marcar listo, unión del rival, modo 2v2 y equipos |
| **Canvas** | Movimiento con teclado y con joystick táctil, puntería, armas, HUD editable |
| **Extras** | Resultados, misiones, ajustes, paredes y pantalla de girar el celular |

Proyectos: escritorio, móvil horizontal (Pixel 5) y vertical (overlay de rotación).

```bash
npx playwright install chromium
npm run test:e2e
```

## CI/CD

- **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) ejecuta lint, build y E2E en cada PR y push.
- **Despliegue:** Docker + nginx en un VPS con [Dokploy](https://dokploy.com), HTTPS de Let's Encrypt, auto-deploy en cada push a `main`.

## Estructura

```
src/
├─ game/client/     Render del canvas, interpolación, sprites
├─ modules/         Auth · Home · Lobby · Game
└─ shared/          Contratos, socket, ajustes, layout del HUD, componentes
e2e/                Specs de Playwright y servidor simulado
```

## Equipo

Josseph Peralta · Sylvanna Cisneros · Angel Anaya
