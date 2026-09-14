# 🚀 SAG RANK MCP Server

[![npm version](https://img.shields.io/npm/v/sagrank-mcp.svg?color=blue)](https://www.npmjs.com/package/sagrank-mcp)
[![MCP Protocol](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-8A2BE2)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js)](https://nodejs.org/)

El servidor oficial de **Model Context Protocol (MCP)** para **SAG RANK** — la suite integral de diagnóstico, optimización y auditoría para la era de la inteligencia artificial.

Permite a tus asistentes y agentes de programación (**Cursor, Windsurf, Claude Desktop, Antigravity, Roo Code, Cline y VS Code**) auditar, comparar y optimizar cualquier sitio web directamente desde tu chat o workflow de desarrollo.

---

## ✨ Capacidades Principales

- 🎯 **Score SAG RANK Global (0 - 100)**: Algoritmo unificado ponderado que combina Rendimiento, SEO, AEO, GEO y Acceso de IA.
- ⚡ **Core Web Vitals & Rendimiento**: Métricas reales de Google Lighthouse (FCP, LCP, TBT, CLS, Speed Index).
- 🤖 **AEO (Answer Engine Optimization)**: Análisis de semántica HTML y validación de datos estructurados Schema.org (JSON-LD).
- 🧠 **GEO (Generative Engine Optimization)**: Evaluación de señales EEAT, citabilidad para LLMs y patrones de preguntas/respuestas (Q&A).
- ⚔️ **Comparativa Competitiva (A vs B)**: Compara dos sitios web lado a lado, detecta al ganador, analiza ventajas competitivas y brechas técnicas.
- 🛡️ **Auditoría de 8 Rastreadores de IA**: Verificación granular en `robots.txt` para GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, Bytespider y CCBot.
- 🛠️ **Generador de Soluciones Inmediatas**: Genera `/llms.txt`, Schema JSON-LD y `robots.txt` balanceado listos para guardar en tu proyecto.

---

## ⚡ Inicio Rápido

> [!NOTE]
> **Estado de Distribución:**
> Mientras se completa el registro en los catálogos públicos globales (como `mpxjs` y npmjs.com), puedes ejecutar el servidor directamente referenciando el repositorio de GitHub:
> ```bash
> npx -y git+https://github.com/Kreiros/sagrank-mcp.git
> ```
> Una vez indexado en los registros globales, también estará habilitada la invocación sin URL: `npx -y sagrank-mcp`.


---

## 🛠️ Configuración en Editores y Asistentes

### 1. Cursor
Añade el servidor en tu configuración de MCP en Cursor:

**Opción A — Archivo `.cursor/mcp.json` o `~/.cursor/mcp.json`:**
```json
{
  "mcpServers": {
    "sagrank": {
      "command": "npx",
      "args": ["-y", "sagrank-mcp"]
    }
  }
}
```

**Opción B — Desde la Interfaz de Cursor:**
1. Abre **Cursor Settings** (`Ctrl + ,` o `Cmd + ,`).
2. Ve a **Features** > **MCP Servers**.
3. Haz clic en **+ Add New MCP Server**.
4. Nombre: `sagrank`
5. Tipo: `command`
6. Comando: `npx -y sagrank-mcp`

---

### 2. Windsurf (Codeium)
Añade el servidor en `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "sagrank": {
      "command": "npx",
      "args": ["-y", "sagrank-mcp"]
    }
  }
}
```

---

### 3. Claude Desktop
Edita el archivo de configuración según tu sistema operativo:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sagrank": {
      "command": "npx",
      "args": ["-y", "sagrank-mcp"]
    }
  }
}
```

---

### 4. Google Antigravity & Agentic IDEs
Configura en tu bloque de herramientas MCP:

```json
{
  "name": "sagrank-mcp",
  "command": "npx",
  "args": ["-y", "sagrank-mcp"]
}
```

---

### 5. VS Code (Roo Code / Cline / Continue / Copilot)
En la configuración MCP de la extensión seleccionada:

```json
{
  "mcpServers": {
    "sagrank": {
      "command": "npx",
      "args": ["-y", "sagrank-mcp"]
    }
  }
}
```

---

## 📚 Herramientas Disponibles

### 1. `sagrank_audit`
Realiza una auditoría completa de un sitio web.

**Parámetros:**
- `url` *(string, obligatorio)*: Dominio o URL a auditar (ej. `https://miweb.com`).
- `estrategia` *(string, opcional, por defecto `"mobile"`)*: `"mobile"` o `"desktop"`.
- `psi_key` *(string, opcional)*: Clave de Google PageSpeed Insights API si deseas cuota dedicada.

**Ejemplo de prompt en el chat:**
> *"Audita mi sitio https://miweb.com con sagrank_audit y dime qué necesito mejorar para aparecer en Perplexity y SearchGPT."*

---

### 2. `sagrank_compare`
Compara competitivamente dos sitios web (Sitio A vs Sitio B) lado a lado.

**Parámetros:**
- `url1` *(string, obligatorio)*: URL del primer sitio (tu web o Sitio A).
- `url2` *(string, obligatorio)*: URL del segundo sitio (competidor o Sitio B).
- `estrategia` *(string, opcional, por defecto `"mobile"`)*: `"mobile"` o `"desktop"`.
- `psi_key` *(string, opcional)*: Clave opcional de Google PageSpeed Insights API.

**Ejemplo de prompt en el chat:**
> *"Compara mi web https://miempresa.com contra el competidor https://competidor.com usando sagrank_compare y muéstrame la tabla de ventajas."*

**Respuesta generada:**
- Score global y delta de puntos con ganador proclamado.
- Tabla comparativa lado a lado (Lighthouse, SEO, AEO, GEO, AI Bots, llms.txt, SPA).
- Desglose de fortalezas exclusivas del Sitio A y del Sitio B.
- Recomendación estratégica para superar al competidor.

---

### 3. `sagrank_check_ai_crawlers`
Audita de forma exhaustiva el archivo `robots.txt` para 8 motores y rastreadores de IA.

**Parámetros:**
- `url` *(string, obligatorio)*: URL del sitio web.

**Rastreadores analizados:**
1. **GPTBot** (OpenAI - ChatGPT & SearchGPT)
2. **ChatGPT-User** (OpenAI - Navegación web en vivo)
3. **ClaudeBot** (Anthropic - Claude & Claude Search)
4. **PerplexityBot** (Perplexity AI)
5. **Google-Extended** (Google Gemini & Vertex AI)
6. **Applebot-Extended** (Apple Intelligence & Siri)
7. **Bytespider** (ByteDance & TikTok IA)
8. **CCBot** (Common Crawl - Conjunto masivo de entrenamiento LLM)

**Ejemplo de prompt en el chat:**
> *"Verifica con sagrank_check_ai_crawlers si GPTBot y PerplexityBot tienen permiso de indexar mi web https://miweb.com."*

---

### 4. `sagrank_generate_fixes`
Genera código listo para copiar y pegar para solventar las deficiencias detectadas.

**Parámetros:**
- `url` *(string, obligatorio)*: URL base del sitio.
- `nombre_sitio` *(string, opcional)*: Nombre de la marca o proyecto.
- `descripcion` *(string, opcional)*: Breve resumen de la propuesta de valor.

**Archivos generados:**
1. `/llms.txt`: Archivo estándar en Markdown que guía a los LLMs sobre la estructura, propósito y APIs de tu web.
2. `Schema.org JSON-LD`: Bloque estructurado con entidades `WebSite`, `Organization` y `FAQPage`.
3. `robots.txt`: Directivas equilibradas que abren las puertas a los motores de IA mientras restringen áreas administrativas.

---

## 🏗️ Arquitectura y Flujo de Peticiones

```
+-------------------------------------------------------------+
|               Entorno de Desarrollo / IA                    |
|      (Cursor, Windsurf, Claude Desktop, Antigravity)        |
+-------------------------------------------------------------+
                              |
                     JSON-RPC sobre stdio
                              |
                              v
+-------------------------------------------------------------+
|                     sagrank-mcp (Local)                     |
|           Cliente ligero en Node.js (< 1 MB)                |
+-------------------------------------------------------------+
          /                                   \
     (HTTPS)                                 (HTTPS)
        v                                       v
+-----------------------+              +----------------------+
|  SAG RANK Cloud API   |              |  Google PageSpeed    |
|  (Vercel Serverless)  |              |  Insights API v5     |
|                       |              |                      |
| - AEO & Semántica     |              | - Core Web Vitals    |
| - GEO & EEAT Signals  |              | - FCP, LCP, TBT, CLS |
| - AI Bots robots.txt  |              | - Score Rendimiento  |
| - SPA / CSR Detection |              | - SEO On-Page        |
| - Security Headers    |              +----------------------+
+-----------------------+
```

---

## ⚙️ Variables de Entorno Opcionales

Puedes configurar variables de entorno para personalizar el comportamiento del servidor:

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `SAGRANK_API_URL` | URL del endpoint de diagnóstico de SAG RANK | `https://sag-rank-blue.vercel.app/api/diagnostico` |
| `PAGESPEED_API_KEY` | Clave API de Google Cloud para PageSpeed Insights | *(Opcional, utiliza llamadas públicas si no se define)* |

---

## 💻 Desarrollo Local

Si deseas contribuir o modificar el servidor MCP:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Kreiros/sagrank-mcp.git
cd sagrank-mcp

# 2. Instalar dependencias
npm install

# 3. Probar en modo desarrollo
npm start
```

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta [`LICENSE`](./LICENSE) para más detalles.

---

Desarrollado con ❤️ por [Kreiros](https://github.com/Kreiros) • Potenciado por [SAG RANK](https://sag-rank-blue.vercel.app)
