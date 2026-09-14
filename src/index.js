import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  auditUrl,
  compareUrls,
  checkAiCrawlers,
  generateFixes,
} from "./api.js";

const server = new Server(
  {
    name: "sagrank-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "sagrank_audit",
        description:
          "Audita un sitio web completo con el algoritmo oficial de SAG RANK. Calcula el Score Global (0-100), Core Web Vitals (FCP, LCP, TBT, CLS), SEO On-Page, AEO (Answer Engine Optimization con Schema y Semántica), GEO (Generative Engine Optimization con EEAT y Q&A), estado de 8 bots de IA en robots.txt, detección de SPA/CSR, y entrega las prioridades de optimización.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "La URL completa o dominio del sitio web a auditar (ej. 'https://miweb.com' o 'miweb.com').",
            },
            estrategia: {
              type: "string",
              description: "Estrategia de análisis de rendimiento: 'mobile' (predeterminado) o 'desktop'.",
              enum: ["mobile", "desktop"],
              default: "mobile",
            },
            psi_key: {
              type: "string",
              description: "Opcional: Clave personal de Google PageSpeed Insights API para evitar límites de cuota.",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "sagrank_compare",
        description:
          "Compara competitivamente dos sitios web (Sitio A vs Sitio B) con SAG RANK. Genera una tabla comparativa exhaustiva lado a lado: Score Global SAG RANK, Core Web Vitals, SEO, AEO (Schema & Semántica), GEO (EEAT & Citabilidad), Acceso de Bots de IA, llms.txt, detección SPA/CSR, y concluye con el ganador y las fortalezas competitivas clave de cada uno.",
        inputSchema: {
          type: "object",
          properties: {
            url1: {
              type: "string",
              description: "Primera URL a comparar (Sitio A o web principal).",
            },
            url2: {
              type: "string",
              description: "Segunda URL a comparar (Sitio B o competidor directo).",
            },
            estrategia: {
              type: "string",
              description: "Estrategia de análisis: 'mobile' (predeterminado) o 'desktop'.",
              enum: ["mobile", "desktop"],
              default: "mobile",
            },
            psi_key: {
              type: "string",
              description: "Opcional: Clave de Google PageSpeed Insights API.",
            },
          },
          required: ["url1", "url2"],
        },
      },
      {
        name: "sagrank_check_ai_crawlers",
        description:
          "Verifica específicamente el acceso de los 8 principales rastreadores y motores de IA (GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, Bytespider, CCBot) en el robots.txt del sitio web. Indica si están Permitidos, Bloqueados o Restringidos y las directivas exactas.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "La URL o dominio del sitio web a inspeccionar.",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "sagrank_generate_fixes",
        description:
          "Genera código y archivos listos para producción para solucionar problemas detectados por SAG RANK: 1) Archivo /llms.txt estándar optimizado para modelos de lenguaje, 2) Datos estructurados Schema.org JSON-LD (WebSite, Organization, FAQPage), y 3) Archivo robots.txt balanceado que permite el rastreo de IA protegiendo rutas privadas.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL del sitio web para personalizar metadatos y enlaces.",
            },
            nombre_sitio: {
              type: "string",
              description: "Opcional: Nombre de la marca o proyecto.",
            },
            descripcion: {
              type: "string",
              description: "Opcional: Breve descripción del negocio o contenido del sitio.",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "sagrank_audit") {
      const { url, estrategia = "mobile", psi_key = "" } = args;
      const res = await auditUrl(url, estrategia, psi_key);

      const markdown = `
# Diagnóstico Oficial SAG RANK

**URL:** ${res.url}
**Estrategia:** ${res.estrategia}
**Score Global SAG RANK:** **${res.score_global} / 100** — ${res.nivel.badge}
*${res.nivel.titulo}* — ${res.nivel.subtitulo}

---

### Desglose de Puntuaciones
| Categoría | Puntos | Estado |
| :--- | :---: | :--- |
| **Rendimiento (PSI / Lighthouse)** | **${res.subscores.rendimiento}/100** | ${res.subscores.rendimiento >= 80 ? 'Óptimo' : (res.subscores.rendimiento >= 60 ? 'Regular' : 'Crítico')} |
| **SEO On-Page** | **${res.subscores.seo}/100** | ${res.subscores.seo >= 80 ? 'Óptimo' : 'Regular'} |
| **AEO (Semántica & Schema)** | **${res.subscores.aeo}/100** | ${res.subscores.aeo >= 80 ? 'Óptimo' : 'Regular'} |
| **GEO (EEAT & Citabilidad IA)** | **${res.subscores.geo}/100** | ${res.subscores.geo >= 80 ? 'Óptimo' : 'Regular'} |
| **Acceso IA & Seguridad** | **${res.subscores.ai_access}/100** | ${res.subscores.ai_access >= 80 ? 'Óptimo' : 'Regular'} |

### Core Web Vitals
- **FCP (First Contentful Paint):** \`${res.core_web_vitals.FCP || 'N/D'}\`
- **LCP (Largest Contentful Paint):** \`${res.core_web_vitals.LCP || 'N/D'}\`
- **TBT (Total Blocking Time):** \`${res.core_web_vitals.TBT || 'N/D'}\`
- **CLS (Cumulative Layout Shift):** \`${res.core_web_vitals.CLS || 'N/D'}\`
- **Speed Index:** \`${res.core_web_vitals.SI || 'N/D'}\`

### Acceso de Rastreadores de IA
- **Bots analizados:** ${res.ai_crawlers.total_analizados || 8}
- **Permitidos:** ${res.ai_crawlers.total_permitidos ?? 8} | **Bloqueados:** ${res.ai_crawlers.total_bloqueados ?? 0}
- **Archivo \`/llms.txt\`:** ${res.llms_txt.presente ? 'Presente' : 'No detectado'}
- **Arquitectura SPA / CSR:** ${res.spa_detection.es_spa ? 'Sí (Sin SSR/SSG detectado, riesgo de indexación)' : 'No (HTML Server-Rendered)'}

### Prioridades Recomendadas
${res.prioridades.map((p, i) => `${i + 1}. **[${p.prioridad}]** ${p.accion}`).join('\n')}
      `.trim();

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: `JSON_DATA: ${JSON.stringify(res, null, 2)}`,
          },
        ],
      };
    }

    if (name === "sagrank_compare") {
      const { url1, url2, estrategia = "mobile", psi_key = "" } = args;
      const comp = await compareUrls(url1, url2, estrategia, psi_key);

      const s1 = comp.sitio1;
      const s2 = comp.sitio2;

      const markdown = `
# Comparativa Competitiva SAG RANK

**Sitio A:** \`${comp.url1}\`
**Sitio B:** \`${comp.url2}\`
**Veredicto Final:** **${comp.badgeGanador}**

---

### Tabla Comparativa

| Dimensión Evaluada | Sitio A (\`${new URL(comp.url1).hostname}\`) | Sitio B (\`${new URL(comp.url2).hostname}\`) | Ventaja |
| :--- | :---: | :---: | :---: |
| **Score SAG RANK Global** | **${s1.score_global}/100** (${s1.nivel.badge}) | **${s2.score_global}/100** (${s2.nivel.badge}) | ${comp.badgeGanador} |
| **Rendimiento (PSI)** | ${s1.subscores.rendimiento}/100 | ${s2.subscores.rendimiento}/100 | ${s1.subscores.rendimiento > s2.subscores.rendimiento ? 'Sitio A' : (s2.subscores.rendimiento > s1.subscores.rendimiento ? 'Sitio B' : 'Empate')} |
| **SEO On-Page** | ${s1.subscores.seo}/100 | ${s2.subscores.seo}/100 | ${s1.subscores.seo > s2.subscores.seo ? 'Sitio A' : (s2.subscores.seo > s1.subscores.seo ? 'Sitio B' : 'Empate')} |
| **AEO (Schema & Semántica)** | ${s1.subscores.aeo}/100 | ${s2.subscores.aeo}/100 | ${s1.subscores.aeo > s2.subscores.aeo ? 'Sitio A' : (s2.subscores.aeo > s1.subscores.aeo ? 'Sitio B' : 'Empate')} |
| **GEO (EEAT & Citabilidad)** | ${s1.subscores.geo}/100 | ${s2.subscores.geo}/100 | ${s1.subscores.geo > s2.subscores.geo ? 'Sitio A' : (s2.subscores.geo > s1.subscores.geo ? 'Sitio B' : 'Empate')} |
| **Acceso Bots de IA** | ${s1.ai_crawlers.total_permitidos ?? 8}/8 Permitidos | ${s2.ai_crawlers.total_permitidos ?? 8}/8 Permitidos | ${(s1.ai_crawlers.total_permitidos ?? 8) > (s2.ai_crawlers.total_permitidos ?? 8) ? 'Sitio A' : ((s2.ai_crawlers.total_permitidos ?? 8) > (s1.ai_crawlers.total_permitidos ?? 8) ? 'Sitio B' : 'Empate')} |
| **Archivo /llms.txt** | ${s1.llms_txt.presente ? 'Sí' : 'No'} | ${s2.llms_txt.presente ? 'Sí' : 'No'} | ${s1.llms_txt.presente && !s2.llms_txt.presente ? 'Sitio A' : (!s1.llms_txt.presente && s2.llms_txt.presente ? 'Sitio B' : 'Empate')} |
| **LCP (Largest Contentful Paint)** | \`${s1.core_web_vitals.LCP || 'N/D'}\` | \`${s2.core_web_vitals.LCP || 'N/D'}\` | - |
| **TBT (Total Blocking Time)** | \`${s1.core_web_vitals.TBT || 'N/D'}\` | \`${s2.core_web_vitals.TBT || 'N/D'}\` | - |
| **CLS (Cumulative Layout Shift)**| \`${s1.core_web_vitals.CLS || 'N/D'}\` | \`${s2.core_web_vitals.CLS || 'N/D'}\` | - |
| **Renderizado (SSR vs SPA)** | ${s1.spa_detection.es_spa ? 'SPA Client-side' : 'SSR/Estático'} | ${s2.spa_detection.es_spa ? 'SPA Client-side' : 'SSR/Estático'} | - |

---

### Fortalezas de Sitio A
${comp.ventajas1.length > 0 ? comp.ventajas1.map(v => `- ${v}`).join('\n') : '- Sin ventajas claras sobre el competidor.'}

### Fortalezas de Sitio B
${comp.ventajas2.length > 0 ? comp.ventajas2.map(v => `- ${v}`).join('\n') : '- Sin ventajas claras sobre el competidor.'}

### Conclusión y Recomendación Estratégica
${comp.ganador === 'Empate técnico'
  ? 'Ambos sitios tienen un nivel muy similar. La diferencia competitiva se definirá implementando `/llms.txt` y enriqueciendo los datos estructurados Schema.org para citaciones directas en Perplexity y SearchGPT.'
  : `El ganador en visibilidad para motores de IA es **${comp.ganador}**. El sitio rezagado debe priorizar la corrección de los Core Web Vitals y asegurar el desbloqueo total de bots de IA en robots.txt.`
}
      `.trim();

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: `JSON_DATA: ${JSON.stringify(comp, null, 2)}`,
          },
        ],
      };
    }

    if (name === "sagrank_check_ai_crawlers") {
      const { url } = args;
      const res = await checkAiCrawlers(url);

      const botEntries = Object.entries(res.bots);
      const rows = botEntries.map(([botId, info]) => {
        return `| **${info.name}** (${info.empresa}) | [${info.estado.toUpperCase()}] | ${info.motivo} |`;
      }).join('\n');

      const markdown = `
# Auditoría de Rastreadores de IA en robots.txt

**URL:** ${res.url}
**Robots.txt Detectado:** ${res.presente_robots_txt ? 'Sí' : 'No encontrado (acceso abierto por defecto)'}
**Resumen:** ${res.total_permitidos} Permitidos | ${res.total_bloqueados} Bloqueados | ${res.total_restringidos} Restringidos (Total: ${res.total_analizados})

| Rastreador / Modelo | Estado | Directiva / Razón |
| :--- | :---: | :--- |
${rows}

### Diagnóstico
${res.total_bloqueados > 0
  ? `Tienes ${res.total_bloqueados} bot(s) de IA bloqueados. Si deseas que modelos como ChatGPT, Perplexity o Claude citen y recomienden tu contenido, usa \`sagrank_generate_fixes\` para obtener un \`robots.txt\` optimizado.`
  : `Excelente: Los principales motores de búsqueda generativa e indexadores de IA tienen acceso a tu contenido.`}
      `.trim();

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: `JSON_DATA: ${JSON.stringify(res, null, 2)}`,
          },
        ],
      };
    }

    if (name === "sagrank_generate_fixes") {
      const { url, nombre_sitio = "", descripcion = "" } = args;
      const fixes = generateFixes(url, nombre_sitio, descripcion);

      const markdown = `
# Soluciones y Código Generado por SAG RANK

**Proyecto:** ${fixes.brand}
**URL Base:** ${fixes.url}

---

### 1. Archivo \`/llms.txt\` (Colocar en la raíz del dominio o \`public/llms.txt\`)
\`\`\`markdown
${fixes.llms_txt}
\`\`\`

---

### 2. Datos Estructurados Schema.org JSON-LD (Insertar en \`<head>\`)
\`\`\`html
<script type="application/ld+json">
${fixes.schema_jsonld}
</script>
\`\`\`

---

### 3. Archivo \`robots.txt\` Optimizado para IA (Colocar en \`public/robots.txt\`)
\`\`\`txt
${fixes.robots_txt}
\`\`\`
      `.trim();

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
          {
            type: "text",
            text: `JSON_DATA: ${JSON.stringify(fixes, null, 2)}`,
          },
        ],
      };
    }

    throw new Error(`Herramienta no reconocida: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error ejecutando ${name}: ${error.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SAG RANK MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error running SAG RANK MCP Server:", err);
  process.exit(1);
});
