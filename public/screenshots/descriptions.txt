# Capturas de proyectos de Luis Verastegui

Las imagenes viven en `/screenshots/`. Adjuntar SOLO cuando el usuario las pida explicitamente (no por iniciativa propia).
Formato para adjuntar en la respuesta: `[descripcion corta](/screenshots/filename.png)` — se renderiza como card inline clickeable.

---

## Yuyi AI (asistente conversacional en terminal)
- `/screenshots/Yuyi-ai-1.png` — Terminal TUI de Yuyi CLI con ASCII art de dos chicas anime. Muestra el menu de inicio con "Comandos Personales" y "Funciones personales". El usuario escribio `Yuyi "estoy aburridooo"` y la IA respondio con broma sobre que ella tambien esta aburrida de ser un "invento de scarado". Demuestra el CLI en accion con la personalidad coqueta de Yuyi.
- `/screenshots/Yuyi-ai-2.png` — Misma terminal Yuyi. El usuario pregunto "que es y para que sirve" y Yuyi le explico que el comando `ls` lista archivos, con su humor caracteristico. Tambien hubo un intercambio donde Yuyi se defiende de ser toxica diciendo que el usuario se caso por aburrimiento. Muestra la conversacion con personalidad.
- Adjuntar cuando pregunten por: la terminal de Yuyi, el CLI, como se ve Yuyi, la personalidad, demo del chat de consola.

## Minecraft AI (agente IA jugando Minecraft con tool calling)
- `/screenshots/MinecraftAi-1.png` — Minecraft en primera persona, Yuyi (el agente) en una cueva de noche. Un zombie se acerca. Chat overlay muestra a Yuyi reaccionando dramaticamente al ataque ("ay nooo pendejo", "me asustasteeee", "un zombie me pego"). Aethel (el developer) le da instrucciones. Yuyi logro el progreso "La Edad de Piedra". Muestra al agente en peligro.
- `/screenshots/MinecraftAi-2.png` — Vista en primera persona de Minecraft, momento de la muerte. Corazones casi vacios (1 vida). Mensaje al fondo: "AY NOOO ME MATARON YA JAJAJAJA CORRO CORRO CORRO". Yuyi esta muriendo, dramatica como siempre.
- `/screenshots/MinecraftAi-3.png` — Minecraft en lluvia, terreno rocoso. Chat muestra multiples mensajes "Yuyi ha sido victima de Zombi" y el ataque de una arana. Aethel da instrucciones de combate ("corre", "exacaba", "coje tierra"). Yuyi sigue con vida baja y reacciona dramaticamente a cada golpe.
- `/screenshots/MinecraftAi-4.png` — Minecraft en lluvia, vista de tres zombies en formacion frente a Yuyi. Yuyi tiene un carrot en la mano. Chat: "ven", "ya voyyy", "ya llegueee, pero Aethel ayuda q nos van a comer!!". Yuyi esta en peligro pidiendo ayuda desesperadamente.
- Adjuntar cuando pregunten por: el agente de Minecraft, tool calling, como juega la IA, el proyecto minecraft, captura del juego.

## Mail API (servicio de envio de correos en Go)
- `/screenshots/Mailapi-1.png` — Repositorio GitHub privado "cyluk-mail-api". Estructura del codigo fuente: cmd, internal, migrations, web, Dockerfile, README.md, docker-compose.yml, go.mod, go.sum, how-to-use-env.md, plan.md. 99.2% Go. Muestra la arquitectura del proyecto backend en Go.
- `/screenshots/Mailapi-2.png` — Dashboard de administracion de API Keys del Mail API. Form para crear nueva key (Nombre, Tipo user/admin) y tabla de keys existentes con sus permisos asignados. Sistema de autenticacion por API key con permisos granulares (user solo envia, admin gestiona todo).
- `/screenshots/Mailapi-3.png` — Formulario "Crear cuenta SMTP". Configurando cuenta "Landing Page Contact Form" con From address landing@cyluk.com, From name Cyluk, Proveedor smtp, SMTP host smtp.purelymail.com, port 465, SSL implicito. Es la configuracion de la cuenta de envio desde el formulario de contacto.
- `/screenshots/Mailapi-4.png` — Email HTML template que envia el Mail API. "Gracias, prueba. Ya tenemos tu solicitud". Muestra los datos recibidos (nombre, correo cyluk.dev@gmail.com, telefono 15125) y el mensaje del usuario. Es el correo automatico de confirmacion al recibir un contacto desde el form de la landing.
- Adjuntar cuando pregunten por: la API de correos, backend en Go, como se envia el mail, automatizacion de emails, codigo fuente del mail api.

## Chat API (CYLUK Admin - panel de chat flows con IA)
- `/screenshots/Chatapi-1.png` — Dashboard CYLUK Admin, pagina "Data Sources". Form para crear conexion a base de datos (host, database, username, password, SSL mode, timeouts). Tabla muestra data source "test-database" conectado a postgres (read_only). Permite configurar multiples conexiones a bases de datos para los flows.
- `/screenshots/Chatapi-2.png` — CYLUK Admin, pagina "Runtime". Ejecutar un ChatFlow manualmente. Tenant "pollo-brother", ChatFlow "consulta-menu", User Message "cual fue mi pedido?". El Result muestra la respuesta JSON del LLM (gpt-4o-mini): "Hola! Gracias por contactarte con Pollo Brother. Lamentablemente no tengo acceso a tus pedidos anteriores...". Es el playground para probar flows de chat con IA en vivo.
- `/screenshots/Chatapi-3.png` — Repositorio GitHub del CYLUK Admin. Archivos: .github/workflows, api/openapi, cmd, internal, migrations/postgres, runbooks, test, Dockerfile, Makefile, attack-mitigation.md, contract.md, cyluk-admin, dashboard-plan.md, go.mod, go.sum, plan-ia-context.md, plan.md. Go 80.7%, JavaScript 10.7%, PLpgSQL 3.6%. Codigo del panel admin completo.
- `/screenshots/Chatapi-4.png` — CYLUK Admin, pagina "Chat Flows". Form para crear un nuevo chat flow con Tenant, ID, Data Source, Slug, Display Name, System Prompt Template, Output Mode (linear/ai/script), Output Config JSON, Query AST JSON. Es la configuracion de un agente conversacional con su prompt y su fuente de datos.
- Adjuntar cuando pregunten por: el panel de chat, la API de chat, como se configuran los flows, el admin de CYLUK, el codigo del admin, el playground.

## WhatsApp / OpenWA (CylukWa)
- `/screenshots/CylukWa-1.png` — Dashboard CylukWa "Audit Logs". Muestra eventos de la API: session_qr_generated con timestamps, session IDs, severity INFO. Sidebar: Dashboard, Sessions, Webhooks, API Keys, Message Tester, Infrastructure, Plugins, Logs. Sirve para auditar todas las acciones de la API de WhatsApp en produccion.
- `/screenshots/CylukWa-2.png` — CylukWa "Probador de Mensajes". Form para enviar mensaje de prueba via API. Sesion "mi-bot", destinatario Personal, numero +51906079054, tipo Audio, URL del medio apunta a un sample de audio. Resultado muestra 200 OK con messageId. Es un tester manual para verificar que la API envia mensajes correctamente.
- Adjuntar cuando pregunten por: la API de WhatsApp, OpenWA, CylukWa, integracion de whatsapp, el tester de mensajes, los logs.

## Dockploy (PaaS self-hosted para deploys)
- `/screenshots/Dockploy-1.png` — Dashboard principal de Dockploy. "Welcome back, Aethelvance Regimundus". Stats: 0 projects, 0 services, 0 deploys/7D, 0 running. Sidebar muestra todas las secciones (Projects, Deployments, Monitoring, Schedules, Traefik, Docker, Swarm, AI, Registry, S3, etc.). URL: 62.146.230.77:3000. Es el panel self-hosted que reemplaza a Vercel/Heroku.
- `/screenshots/Dockploy-2.png` — Dockploy "S3 Destinations". Configuracion de destinos S3 para backups (AWS S3, Cloudflare R2, Wasabi, DigitalOcean Spaces). Muestra destino configurado "r2-dockploy-vps" creado 5/23/2026. Configurando Cloudflare R2 para los backups de los volumenes.
- `/screenshots/Dockploy-3.png` — Dockploy modal de configuracion de dominio. Para api.cyluk.com. Path /api, Container Port 2785, HTTPS con Let's Encrypt automatico. Configurando el routing de un subdominio a un container con SSL automatico.
- `/screenshots/Dockploy-4.png` — Dockploy proyecto "Cyluk-Api-Whatsapp" (Api de whatsapp en self-host). Deploy Settings: Deploy, Reload, Rebuild, Stop, Open Terminal, Autodeploy toggle, Clean Cache toggle. Provider GitHub, repository CylukWa, branch main, Build Path /, Trigger Type On Push. Deploy automatico desde GitHub en cada push.
- `/screenshots/Dockploy-5.png` — Dockploy "Deployments" del proyecto Cyluk-Api-Whatsapp. Webhook URL para re-deploys automaticos. Lista: 1. Running (listo para funcionar con un puerto, 1 minute ago), 2. Done (start CylukWa, 3 hours ago, 7m 0s). Historial de los ultimos deploys con estado y duracion.
- `/screenshots/Dockploy-6.png` — Dockploy "Monitoring" del server. Metricas en tiempo real: CPU Usage 59.21% con grafico, Memory 2.25GiB/7.76GiB, Disk Space 15.54GB/71.61GB, Docker Disk 10.47GB, Block I/O, Network I/O. Monitoreo de recursos del servidor donde corre Dockploy.
- `/screenshots/Dockploy-7.png` — Dockploy deployments del proyecto "landing-page" (Cyluk landing page). Webhook URL. Lista: 1. Done (docker, 4 minutes ago, 1m 27s), 2. Done (docker, 7 minutes ago, 2s), 3. Done (docker, 9 minutes ago, 3s), 4. Done (añadiendo galeria, terminado movil para mejorar, 16 minutes ago, 10s). Historial de deploys del sitio actual.
- Adjuntar cuando pregunten por: Dockploy, PaaS, como se hace el deploy, plataforma self-hosted, el dashboard, monitoring, los deployments, el S3 de backups, el dominio con SSL.

## Infraestructura / DevSecOps
- `/screenshots/Cloudflare-1.png` — Cloudflare DNS records. dokploy.ingenierodeia.com apunta a 62.146.230.77 con proxy activado (nube naranja) y TTL Auto. Es la configuracion DNS del subdominio dokploy con proxy Cloudflare activado.
- `/screenshots/vps-contabo-1.png` — Terminal SSH al VPS de Contabo. Banner de bienvenida de Contabo. Hostname vmi3317802, IP 62.146.230.77, Ubuntu 24.04.4 LTS, kernel 6.8.0-117, 71.61GB RAM, 162 procesos, 1 zombie process. Es la sesion SSH al servidor real donde corre toda la infraestructura.
- Adjuntar cuando pregunten por: el servidor, la VPS, Contabo, Cloudflare DNS, la configuracion DNS, el SSH al servidor, la infraestructura.

## Otros
- `/screenshots/Digrama-use-case-1.png` — Diagrama UML de casos de uso de un sistema academico de matricula. Actores: Estudiante, Area Administrativa, Pasarela de pagos (Stripe). Casos: Mostrar programas tecnicos, Consultar cursos, Seleccionar cursos, Validar vacantes, Registrar matricula, Realizar pago. Diagrama de diseno para un sistema de matricula con pagos Stripe.
- `/screenshots/AddHomeWork-1.png` — Terminal mostrando el output del script "AddHomework" (script personal de productividad). Estado corriendo, agenda del dia con modo tarea Blackboard, meditacion 12:00-12:30, limite de tarea 2026-05-15 00:02. Semana actual con bloqueo de pantalla 22:00-05:00. Proximo evento: alerta de tarea a las 21:00. Es un script Bash que automatiza la gestion de horarios y bloqueos para enfocarse en tareas.
