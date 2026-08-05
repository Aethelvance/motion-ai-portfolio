# Capturas de proyectos de Luis Verastegui

Archivo de REFERENCIA HUMANA. NO se carga al system prompt del LLM. La fuente de verdad para el modelo esta en `api/prompts/04-knowledge.md` (catalogo con tags). Este archivo es solo para mantenimiento humano — descripcion detallada de cada captura y razon de las tags asignadas.

Convencion de tags (alineada con api/prompts/04-knowledge.md):
- `ai`, `agent`, `llm`, `tool-calling`, `conversation` → contenido relacionado a IA
- `backend`, `go`, `frontend`, `astro`, `react` → stack tecnologico
- `infra`, `devops`, `devsecops`, `docker`, `nftables`, `ssh` → infraestructura
- `dashboard`, `monitoring`, `metrics`, `config`, `admin` → tipo de UI
- `repo`, `code`, `architecture` → captura de codigo/estructura
- `terminal`, `tui`, `cli`, `bash` → captura de terminal/consola
- `whatsapp`, `openwa`, `email`, `smtp` → integraciones especificas
- `visual`, `dramatic`, `flagship` → sesgo para preguntas abiertas
- `minecraft`, `game` → contenido del proyecto Minecraft
- `design`, `diagram`, `uml` → diseno/diagramacion
- `productivity`, `automation`, `schedule` → scripts/herramientas personales
- `dns`, `cloudflare`, `ssl`, `letsencrypt`, `s3`, `r2`, `backup` → servicios cloud
- `deploy`, `ci-cd`, `github`, `autodeploy`, `history` → deploys
- `database`, `postgres`, `data-source`, `playground`, `runtime` → chat flows
- `tester`, `send`, `api-key`, `audit`, `log` → CylukWa
- `template`, `html`, `contact-form` → email templates

---

## Yuyi AI (asistente conversacional en terminal — proyecto insignia de IA)
- `/projects/yuyi-cli-1.png` — Terminal TUI de Yuyi CLI con ASCII art de dos chicas anime. Muestra el menu de inicio con "Comandos Personales" y "Funciones personales". El usuario escribio `Yuyi "estoy aburridooo"` y la IA respondio con broma sobre que ella tambien esta aburrida de ser un "invento de scarado". Demuestra el CLI en accion con la personalidad coqueta de Yuyi.
  Tags: ai, terminal, tui, ascii-art, personality, visual, flagship
- `/projects/yuyi-cli-2.png` — Misma terminal Yuyi. El usuario pregunto "que es y para que sirve" y Yuyi le explico que el comando `ls` lista archivos, con su humor caracteristico. Tambien hubo un intercambio donde Yuyi se defiende de ser toxica diciendo que el usuario se caso por aburrimiento. Muestra la conversacion con personalidad.
  Tags: ai, terminal, conversation, personality

## Minecraft AI (agente IA jugando Minecraft con tool calling)
- `/projects/minecraft-cave-1.png` — Minecraft en primera persona, Yuyi (el agente) en noche. Un zombie se acerca. Chat overlay muestra a Yuyi reaccionando dramaticamente al ataque. Aethel (el developer) le da instrucciones. Yuyi logro el progreso "La Edad de Piedra". Muestra al agente en peligro.
  Tags: ai, agent, tool-calling, minecraft, visual, dramatic, danger
- `/projects/minecraft-death-2.png` — Vista en primera persona de Minecraft, momento de la muerte. Corazones casi vacios (1 vida). Mensaje al fondo: "AY NOOO ME MATARON YA JAJAJAJA CORRO CORRO CORRO". Yuyi esta muriendo, dramatica como siempre.
  Tags: ai, agent, minecraft, death, dramatic, low-hp
- `/projects/minecraft-rain-3.png` — Minecraft en lluvia, terreno rocoso. Chat muestra multiples mensajes "Yuyi ha sido victima de Zombi". Aethel da instrucciones de combate ("corre", "exacaba", "coje tierra"). Yuyi sigue con vida baja y reacciona dramaticamente a cada golpe.
  Tags: ai, agent, minecraft, combat, weather, spider
- `/projects/minecraft-zombies-4.png` — Minecraft en lluvia, vista de tres zombies en formacion frente a Yuyi. Yuyi tiene un carrot en la mano. Chat: "ven", "ya voyyy", "ya llegueee, pero Aethel ayuda q nos van a comer!!". Yuyi esta en peligro pidiendo ayuda desesperadamente.
  Tags: ai, agent, minecraft, combat, horde, danger

## Mail API (servicio de envio de correos en Go)
- `/projects/mailapi-repo-1.png` — Repositorio GitHub privado "cyluk-mail-api". Estructura del codigo fuente: cmd, internal, migrations, web, Dockerfile, README.md, docker-compose.yml, go.mod, go.sum, how-to-use-env.md, plan.md. 99.2% Go. Muestra la arquitectura del proyecto backend en Go.
  Tags: backend, go, repo, code, architecture, private
- `/projects/mailapi-keys-2.png` — Dashboard de administracion de API Keys del Mail API. Form para crear nueva key (Nombre, Tipo user/admin) y tabla de keys existentes con sus permisos asignados. Sistema de autenticacion por API key con permisos granulares (user solo envia, admin gestiona todo).
  Tags: backend, go, dashboard, admin, api-key, security
- `/projects/mailapi-smtp-3.png` — Formulario "Crear cuenta SMTP". Configurando cuenta "Landing Page Contact Form" con From address landing@cyluk.com, From name Cyluk, Proveedor smtp, SMTP host smtp.puremail.com, port 465, SSL implicito. Es la configuracion de la cuenta de envio desde el formulario de contacto.
  Tags: backend, go, config, smtp, email, purelymail
- `/projects/mailapi-email-4.png` — Email HTML template que envia el Mail API. "Gracias, prueba. Ya tenemos tu solicitud". Muestra los datos recibidos (nombre, correo cyluk.dev@gmail.com, telefono 15125) y el mensaje del usuario. Es el correo automatico de confirmacion al recibir un contacto desde el form de la landing.
  Tags: backend, go, email, template, html, contact-form

## Chat API (CYLUK Admin - panel de chat flows con IA)
- `/projects/chatapi-datasources-1.png` — Dashboard CYLUK Admin, pagina "Data Sources". Form para crear conexion a base de datos (host, database, username, password, SSL mode, timeouts). Tabla muestra data source "test-database" conectado a postgres (read_only). Permite configurar multiples conexiones a bases de datos para los flows.
  Tags: ai, backend, dashboard, database, postgres, data-source
- `/projects/chatapi-runtime-2.png` — CYLUK Admin, pagina "Runtime". Ejecutar un ChatFlow manualmente. Tenant "pollo-brother", ChatFlow "consulta-menu", User Message "cual fue mi pedido?". El Result muestra la respuesta JSON del LLM (gpt-4o-mini): "Hola! Gracias por contactarte con Pollo Brother. Lamentablemente no tengo acceso a tus pedidos anteriores...". Es el playground para probar flows de chat con IA en vivo.
  Tags: ai, runtime, playground, llm, gpt-4o, conversation
- `/projects/chatapi-repo-3.png` — Repositorio GitHub del CYLUK Admin. Archivos: .github/workflows, api/openapi, cmd, internal, migrations/postgres, runbooks, test, Dockerfile, Makefile, attack-mitigation.md, contract.md, cyluk-admin, dashboard-plan.md, go.mod, go.sum, plan-ia-context.md, plan.md. Go 80.7%, JavaScript 10.7%, PLpgSQL 3.6%. Codigo del panel admin completo.
  Tags: backend, go, repo, code, dashboard, admin
- `/projects/chatapi-flows-4.png` — CYLUK Admin, pagina "Chat Flows". Form para crear un nuevo chat flow con Tenant, ID, Data Source, Slug, Display Name, System Prompt Template, Output Mode (linear/ai/script), Output Config JSON, Query AST JSON. Es la configuracion de un agente conversacional con su prompt y su fuente de datos.
  Tags: ai, agent, dashboard, configuration, prompt, output-mode

## WhatsApp / OpenWA (CylukWa)
- `/projects/cylukwa-logs-1.png` — Dashboard CylukWa "Audit Logs". Muestra eventos de la API: session_qr_generated con timestamps, session IDs, severity INFO. Sidebar: Dashboard, Sessions, Webhooks, API Keys, Message Tester, Infrastructure, Plugins, Logs. Sirve para auditar todas las acciones de la API de WhatsApp en produccion.
  Tags: backend, go, dashboard, audit, log, whatsapp, openwa
- `/projects/cylukwa-tester-2.png` — CylukWa "Probador de Mensajes". Form para enviar mensaje de prueba via API. Sesion "mi-bot", destinatario Personal, numero +51906079054, tipo Audio, URL del medio apunta a un sample de audio. Resultado muestra 200 OK con messageId. Es un tester manual para verificar que la API envia mensajes correctamente.
  Tags: backend, go, dashboard, tester, whatsapp, openwa, send

## Dockploy (PaaS self-hosted para deploys)
- `/projects/dockploy-dashboard-1.png` — Dashboard principal de Dockploy. "Welcome back, Aethelvance Regimundus". Stats: 0 projects, 0 services, 0 deploys/7D, 0 running. Sidebar muestra todas las secciones (Projects, Deployments, Monitoring, Schedules, Traefik, Docker, Swarm, AI, Registry, S3, etc.). URL: 62.146.230.77:3000. Es el panel self-hosted que reemplaza a Vercel/Heroku.
  Tags: devops, paas, dashboard, monitoring, self-hosted, visual, flagship
- `/projects/dockploy-s3-2.png` — Dockploy "S3 Destinations". Configuracion de destinos S3 para backups (AWS S3, Cloudflare R2, Wasabi, DigitalOcean Spaces). Muestra destino configurado "r2-dockploy-vps" creado 5/23/2026. Configurando Cloudflare R2 para los backups de los volumenes.
  Tags: devops, s3, cloudflare-r2, backup, storage
- `/projects/dockploy-ssl-3.png` — Dockploy modal de configuracion de dominio. Para api.cyluk.com. Path /api, Container Port 2785, HTTPS con Let's Encrypt automatico. Configurando el routing de un subdominio a un container con SSL automatico.
  Tags: devops, dns, ssl, letsencrypt, https, config
- `/projects/dockploy-github-4.png` — Dockploy proyecto "Cyluk-Api-Whatsapp" (Api de whatsapp en self-host). Deploy Settings: Deploy, Reload, Rebuild, Stop, Open Terminal, Autodeploy toggle, Clean Cache toggle. Provider GitHub, repository CylukWa, branch main, Build Path /, Trigger Type On Push. Deploy automatico desde GitHub en cada push.
  Tags: devops, deploy, ci-cd, github, autodeploy
- `/projects/dockploy-deploys-wa-5.png` — Dockploy "Deployments" del proyecto Cyluk-Api-Whatsapp. Webhook URL para re-deploys automaticos. Lista: 1. Running (listo para funcionar con un puerto, 1 minute ago), 2. Done (start CylukWa, 3 hours ago, 7m 0s). Historial de los ultimos deploys con estado y duracion.
  Tags: devops, deploy, history, whatsapp
- `/projects/dockploy-monitoring-6.png` — Dockploy "Monitoring" del server. Metricas en tiempo real: CPU Usage 59.21% con grafico, Memory 2.25GiB/7.76GiB, Disk Space 15.54GB/71.61GB, Docker Disk 10.47GB, Block I/O, Network I/O. Monitoreo de recursos del servidor donde corre Dockploy.
  Tags: devops, monitoring, metrics, cpu, memory, visual
- `/projects/dockploy-deploys-lp-7.png` — Dockploy deployments del proyecto "landing-page" (Cyluk landing page). Webhook URL. Lista: 1. Done (docker, 4 minutes ago, 1m 27s), 2. Done (docker, 7 minutes ago, 2s), 3. Done (docker, 9 minutes ago, 3s), 4. Done (añadiendo galeria, terminado movil para mejorar, 16 minutes ago, 10s). Historial de deploys del sitio actual.
  Tags: devops, deploy, history, landing-page

## Infraestructura / DevSecOps
- `/projects/cloudflare-dns-1.png` — Cloudflare DNS records. dokploy.ingenierodeia.com apunta a 62.146.230.77 con proxy activado (nube naranja) y TTL Auto. Es la configuracion DNS del subdominio dokploy con proxy Cloudflare activado.
  Tags: infra, dns, cloudflare, proxy, config
- `/projects/vps-ssh-1.png` — Terminal SSH al VPS de Contabo. Banner de bienvenida de Contabo. Hostname vmi3317802, IP 62.146.230.77, Ubuntu 24.04.4 LTS, kernel 6.8.0-117, 71.61GB RAM, 162 procesos, 1 zombie process. Es la sesion SSH al servidor real donde corre toda la infraestructura.
  Tags: infra, ssh, vps, contabo, ubuntu, server

## Diseno / Diagramacion
- `/projects/uml-matricula-stripe-1.png` — Diagrama UML de casos de uso de un sistema academico de matricula. Actores: Estudiante, Area Administrativa, Pasarela de pagos (Stripe). Casos: Mostrar programas tecnicos, Consultar cursos, Seleccionar cursos, Validar vacantes, Registrar matricula, Realizar pago. Diagrama de diseno para un sistema de matricula con pagos Stripe.
  Tags: design, diagram, uml, academic, stripe, use-case

## Scripts personales
- `/projects/addhomework-script-1.png` — Terminal mostrando el output del script "AddHomework" (script personal de productividad). Estado corriendo, agenda del dia con modo tarea Blackboard, meditacion 12:00-12:30, limite de tarea 2026-05-15 00:02. Semana actual con bloqueo de pantalla 22:00-05:00. Proximo evento: alerta de tarea a las 21:00. Es un script Bash que automatiza la gestion de horarios y bloqueos para enfocarse en tareas.
  Tags: productivity, script, bash, terminal, schedule, automation
