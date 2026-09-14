import https from "node:https";
import http from "node:http";
import { URL } from "node:url";

const DEFAULT_API_ENDPOINT = "https://sag-rank-blue.vercel.app/api/diagnostico";
const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export function getApiEndpoint() {
  return process.env.SAGRANK_API_URL || DEFAULT_API_ENDPOINT;
}

export function normalizeUrl(rawUrl) {
  let url = (typeof rawUrl === "string" ? rawUrl : (rawUrl?.url || "")).trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url;
}

/**
 * Robust JSON requester: tries native fetch first, falls back to https.request
 * with rejectUnauthorized: false if local/corporate SSL cert issues occur.
 */
export async function requestJson(targetUrl, options = {}) {
  const method = options.method || "GET";
  const headers = {
    "User-Agent": "SAG-RANK-MCP/1.0.0 (https://github.com/Kreiros/sagrank-mcp)",
    "Accept": "application/json",
    ...(options.headers || {}),
  };

  const bodyStr = options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : null;
  if (bodyStr && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // 1. Try standard fetch
  try {
    const res = await fetch(targetUrl, {
      method,
      headers,
      body: bodyStr,
      signal: options.signal || AbortSignal.timeout(15000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // If it is an abort or timeout, rethrow
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw err;
    }
    // Otherwise fallback to native https
  }

  // 2. Fallback using native node:https with relaxed TLS verification
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const reqOpts = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers,
        rejectUnauthorized: false,
        timeout: 15000,
      };

      const req = client.request(reqOpts, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(raw));
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 300)}`));
            }
          } catch (e) {
            reject(new Error(`Error parseando respuesta JSON (HTTP ${res.statusCode}): ${e.message}`));
          }
        });
      });

      req.on("error", (e) => reject(e));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Timeout esperando respuesta del servidor (15s)"));
      });

      if (bodyStr) {
        req.write(bodyStr);
      }
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function fetchSagRankDiagnostic(url, strategy = "mobile") {
  const endpoint = getApiEndpoint();
  const normalized = normalizeUrl(url);

  return await requestJson(endpoint, {
    method: "POST",
    body: {
      url: normalized,
      estrategia: strategy,
    },
  });
}

export async function fetchPageSpeed(url, strategy = "mobile", apiKey = "") {
  const normalized = normalizeUrl(url);
  const key = apiKey || process.env.PAGESPEED_API_KEY || process.env.VITE_PAGESPEED_KEY || "";

  const params = new URLSearchParams();
  params.set("url", normalized);
  params.set("strategy", strategy);
  ["performance", "seo", "accessibility", "best-practices"].forEach((cat) => params.append("category", cat));
  if (key) {
    params.set("key", key);
  }

  try {
    const data = await requestJson(`${PSI_ENDPOINT}?${params.toString()}`);
    const lighthouse = data?.lighthouseResult || {};
    const categories = lighthouse?.categories || {};
    const audits = lighthouse?.audits || {};

    return {
      estado: "Exitoso",
      puntuaciones: {
        rendimiento: Math.round((categories.performance?.score ?? 0.7) * 100),
        seo: Math.round((categories.seo?.score ?? 0.75) * 100),
        accesibilidad: Math.round((categories.accessibility?.score ?? 0.8) * 100),
        mejores_practicas: Math.round((categories["best-practices"]?.score ?? 0.8) * 100),
      },
      metricas: {
        FCP: audits["first-contentful-paint"]?.displayValue || "N/D",
        LCP: audits["largest-contentful-paint"]?.displayValue || "N/D",
        TBT: audits["total-blocking-time"]?.displayValue || "N/D",
        CLS: audits["cumulative-layout-shift"]?.displayValue || "N/D",
        SI: audits["speed-index"]?.displayValue || "N/D",
      },
    };
  } catch (err) {
    return {
      estado: "Estimado",
      mensaje: `Google PageSpeed API no disponible: ${err.message}`,
      puntuaciones: {
        rendimiento: 70,
        seo: 75,
        accesibilidad: 80,
        mejores_practicas: 80,
      },
      metricas: {
        FCP: "Estimado",
        LCP: "Estimado",
        TBT: "Estimado",
        CLS: "Estimado",
        SI: "Estimado",
      },
    };
  }
}

export function computeUnifiedScore({ lighthouse, diagnosticoAeo, diagnosticoGeo, securityHeaders, aiCrawlers, llmsTxt, spaDetection }) {
  const perfScore = lighthouse?.puntuaciones?.rendimiento ?? 70;
  const seoScore = lighthouse?.puntuaciones?.seo ?? 70;

  const semantica = diagnosticoAeo?.semantica;
  const semPuntos =
    (semantica?.titulo_presente ? 25 : 0) +
    (semantica?.cantidad_h1 === 1 ? 25 : semantica?.cantidad_h1 > 1 ? 15 : 0) +
    (semantica?.descripcion_presente ? 25 : 0) +
    (semantica?.estructura_html_limpia ? 25 : 0);

  const jsonLdValido = (diagnosticoAeo?.datos_estructurados_encontrados || [])[0] !== "No encontrados";
  const aeoScore = Math.round(semPuntos * 0.6 + (jsonLdValido ? 40 : 10));

  const eeatScore = diagnosticoGeo?.eeat_score ?? 65;
  const qaScore = diagnosticoGeo?.qa_score ?? 50;
  const geoScore = Math.round(eeatScore * 0.5 + qaScore * 0.5);

  const totalBots = aiCrawlers?.total_analizados || 8;
  const permitidos = aiCrawlers?.total_permitidos ?? 8;
  const botRatio = (permitidos / totalBots) * 100;

  const secHeadersPresentes = securityHeaders?.presentes ?? 3;
  const secHeadersTotal = securityHeaders?.total ?? 6;
  const secRatio = (secHeadersPresentes / secHeadersTotal) * 100;
  const aiAccessScore = Math.round(botRatio * 0.6 + secRatio * 0.4);

  const sagScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        perfScore * 0.2 +
          seoScore * 0.2 +
          aeoScore * 0.25 +
          geoScore * 0.2 +
          aiAccessScore * 0.15
      )
    )
  );

  let nivel = {
    titulo: "Preparado para la Era de la IA",
    subtitulo: "Excelente visibilidad y citabilidad en motores generativos (SearchGPT, Perplexity, Gemini).",
    badge: "ÓPTIMO",
  };

  if (sagScore < 60) {
    nivel = {
      titulo: "Requiere Optimización Prioritaria",
      subtitulo: "Tu contenido tiene dificultades para ser indexado o citado por motores de IA.",
      badge: "CRÍTICO",
    };
  } else if (sagScore < 80) {
    nivel = {
      titulo: "Visibilidad Parcial en Motores de Respuesta",
      subtitulo: "Bases sólidas, pero carece de señales críticas para liderar en AEO y citaciones GEO.",
      badge: "MODERADO",
    };
  }

  const prioridades = [];
  if (!jsonLdValido) {
    prioridades.push({
      prioridad: "Alta",
      accion: "Implementar Schema.org JSON-LD (FAQ / Organization / WebSite) para citabilidad directa en IA.",
    });
  }

  const llmsPresente = Boolean(llmsTxt?.presente || diagnosticoAeo?.ia_visible?.presente);
  if (!llmsPresente) {
    prioridades.push({
      prioridad: "Media",
      accion: "Crear archivo estándar /llms.txt para guiar a los modelos de lenguaje en tu sitio.",
    });
  }

  if (aiCrawlers?.total_bloqueados > 0) {
    prioridades.push({
      prioridad: "Alta",
      accion: `Desbloquear ${aiCrawlers.total_bloqueados} bot(s) de IA en robots.txt (ej. GPTBot, PerplexityBot).`,
    });
  }

  if (perfScore < 60) {
    prioridades.push({
      prioridad: "Alta",
      accion: "Optimizar Core Web Vitals: reducir LCP y minimizar JavaScript bloqueante (TBT).",
    });
  }

  if (spaDetection?.es_spa) {
    prioridades.push({
      prioridad: "Alta",
      accion: "Habilitar Server-Side Rendering (SSR) o SSG: los rastreadores de IA detectan contenedor HTML vacío.",
    });
  }

  if (prioridades.length === 0) {
    prioridades.push({
      prioridad: "Baja",
      accion: "Mantener contenido actualizado e incorporar citas periódicas en fuentes de alta autoridad.",
    });
  }

  return {
    sagScore,
    nivel,
    subscores: {
      rendimiento: perfScore,
      seo: seoScore,
      aeo: aeoScore,
      geo: geoScore,
      ai_access: aiAccessScore,
    },
    prioridades,
    detalles: {
      jsonLdValido,
      llmsPresente,
      totalBots,
      botsPermitidos: permitidos,
      botsBloqueados: aiCrawlers?.total_bloqueados ?? 0,
      secHeadersPresentes,
      esSpa: Boolean(spaDetection?.es_spa),
    },
  };
}

export async function auditUrl(url, strategy = "mobile", psiKey = "") {
  const normalized = normalizeUrl(url);

  const [diagResult, psiResult] = await Promise.allSettled([
    fetchSagRankDiagnostic(normalized, strategy),
    fetchPageSpeed(normalized, strategy, psiKey),
  ]);

  if (diagResult.status === "rejected") {
    throw new Error(`Fallo en diagnóstico de SAG RANK: ${diagResult.reason.message}`);
  }

  const diag = diagResult.value;
  const psi = psiResult.status === "fulfilled" ? psiResult.value : null;

  const unified = computeUnifiedScore({
    lighthouse: psi,
    diagnosticoAeo: diag?.diagnostico_aeo,
    diagnosticoGeo: diag?.diagnostico_geo,
    securityHeaders: diag?.security_headers,
    aiCrawlers: diag?.ai_crawlers,
    llmsTxt: diag?.ia_visible,
    spaDetection: diag?.spa_detection,
  });

  return {
    url: normalized,
    estrategia: strategy,
    score_global: unified.sagScore,
    nivel: unified.nivel,
    subscores: unified.subscores,
    core_web_vitals: psi?.metricas || {},
    prioridades: unified.prioridades,
    ai_crawlers: diag?.ai_crawlers || {},
    llms_txt: diag?.ia_visible || {},
    spa_detection: diag?.spa_detection || {},
    security_headers: diag?.security_headers || {},
    diagnostico_geo: diag?.diagnostico_geo || {},
    diagnostico_aeo: diag?.diagnostico_aeo || {},
  };
}

export async function compareUrls(url1, url2, strategy = "mobile", psiKey = "") {
  const norm1 = normalizeUrl(url1);
  const norm2 = normalizeUrl(url2);

  const [res1, res2] = await Promise.all([
    auditUrl(norm1, strategy, psiKey),
    auditUrl(norm2, strategy, psiKey),
  ]);

  const score1 = res1.score_global;
  const score2 = res2.score_global;
  const delta = Math.abs(score1 - score2);

  let ganador = "Empate técnico";
  let badgeGanador = "EMPATE";
  if (score1 > score2 + 2) {
    ganador = norm1;
    badgeGanador = `${norm1} (+${delta} pts)`;
  } else if (score2 > score1 + 2) {
    ganador = norm2;
    badgeGanador = `${norm2} (+${delta} pts)`;
  }

  // Fortalezas relativas
  const ventajas1 = [];
  const ventajas2 = [];

  if (res1.subscores.rendimiento > res2.subscores.rendimiento + 5) {
    ventajas1.push(`Mejor rendimiento Core Web Vitals (${res1.subscores.rendimiento} vs ${res2.subscores.rendimiento})`);
  } else if (res2.subscores.rendimiento > res1.subscores.rendimiento + 5) {
    ventajas2.push(`Mejor rendimiento Core Web Vitals (${res2.subscores.rendimiento} vs ${res1.subscores.rendimiento})`);
  }

  if (res1.subscores.aeo > res2.subscores.aeo + 5) {
    ventajas1.push(`Mayor optimización de Answer Engines / AEO (${res1.subscores.aeo} vs ${res2.subscores.aeo})`);
  } else if (res2.subscores.aeo > res1.subscores.aeo + 5) {
    ventajas2.push(`Mayor optimización de Answer Engines / AEO (${res2.subscores.aeo} vs ${res1.subscores.aeo})`);
  }

  if (res1.subscores.geo > res2.subscores.geo + 5) {
    ventajas1.push(`Mejor citabilidad y señales EEAT / GEO (${res1.subscores.geo} vs ${res2.subscores.geo})`);
  } else if (res2.subscores.geo > res1.subscores.geo + 5) {
    ventajas2.push(`Mejor citabilidad y señales EEAT / GEO (${res2.subscores.geo} vs ${res1.subscores.geo})`);
  }

  if ((res1.ai_crawlers?.total_permitidos ?? 0) > (res2.ai_crawlers?.total_permitidos ?? 0)) {
    ventajas1.push(`Más bots de IA permitidos (${res1.ai_crawlers?.total_permitidos}/8 vs ${res2.ai_crawlers?.total_permitidos}/8)`);
  } else if ((res2.ai_crawlers?.total_permitidos ?? 0) > (res1.ai_crawlers?.total_permitidos ?? 0)) {
    ventajas2.push(`Más bots de IA permitidos (${res2.ai_crawlers?.total_permitidos}/8 vs ${res1.ai_crawlers?.total_permitidos}/8)`);
  }

  if (res1.llms_txt?.presente && !res2.llms_txt?.presente) {
    ventajas1.push("Tiene archivo /llms.txt estándar implementado.");
  } else if (!res1.llms_txt?.presente && res2.llms_txt?.presente) {
    ventajas2.push("Tiene archivo /llms.txt estándar implementado.");
  }

  return {
    url1: norm1,
    url2: norm2,
    ganador,
    badgeGanador,
    deltaPuntos: delta,
    sitio1: res1,
    sitio2: res2,
    ventajas1,
    ventajas2,
  };
}

export async function checkAiCrawlers(url) {
  const normalized = normalizeUrl(url);
  const diag = await fetchSagRankDiagnostic(normalized);
  const aiCrawlers = diag?.ai_crawlers || {
    bots: {},
    total_permitidos: 0,
    total_bloqueados: 0,
    total_restringidos: 0,
    total_analizados: 8,
  };

  return {
    url: normalized,
    total_analizados: aiCrawlers.total_analizados,
    total_permitidos: aiCrawlers.total_permitidos,
    total_bloqueados: aiCrawlers.total_bloqueados,
    total_restringidos: aiCrawlers.total_restringidos,
    bots: aiCrawlers.bots,
    presente_robots_txt: Boolean(diag?.ai_crawlers?.presente ?? diag?.diagnostico_aeo?.tecnico?.robots_txt ?? diag?.diagnostico_aeo?.robots_presente),
  };
}

export function generateFixes(url, siteName = "", description = "") {
  const normalized = normalizeUrl(url);
  const parsed = new URL(normalized);
  const domain = parsed.hostname;
  const brand = siteName || domain.replace(/^www\./, "").split(".")[0].toUpperCase();
  const desc = description || `Plataforma y servicios oficiales de ${brand}.`;

  const llmsTxt = `# ${brand}

> ${desc}

## Descripción General
${brand} ofrece soluciones digitales de vanguardia diseñadas para máxima velocidad, accesibilidad y presencia en la era de los motores de búsqueda generativos (SearchGPT, Perplexity, Gemini, Claude).

## Enlaces Clave
- Página principal: ${normalized}
- Documentación / Servicios: ${normalized}/servicios
- Contacto: ${normalized}/contacto

## Datos Técnicos para Modelos de IA
- Formato preferido de citación: "${brand} (${domain})"
- Contenido disponible bajo licencias y términos oficiales del sitio web.
`;

  const schemaJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${normalized}#website`,
        "url": normalized,
        "name": brand,
        "description": desc,
        "publisher": {
          "@id": `${normalized}#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${normalized}#organization`,
        "name": brand,
        "url": normalized,
        "logo": `${normalized}/logo.png`,
      },
      {
        "@type": "FAQPage",
        "@id": `${normalized}#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": `¿Qué servicios ofrece ${brand}?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": desc,
            },
          },
          {
            "@type": "Question",
            "name": `¿Cómo contactar con ${brand}?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `Puedes contactarnos a través de nuestra web oficial en ${normalized}.`,
            },
          },
        ],
      },
    ],
  };

  const robotsTxt = `# robots.txt optimizado para SAG RANK & Motores de IA
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/private/
Disallow: /*?*sort=

# Acceso prioritario a agentes y motores de búsqueda generativa
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

# Sitemap y LLMs
Sitemap: ${normalized}/sitemap.xml
# Guía estandarizada para modelos de IA
# Ver: ${normalized}/llms.txt
`;

  return {
    url: normalized,
    brand,
    llms_txt: llmsTxt,
    schema_jsonld: JSON.stringify(schemaJsonLd, null, 2),
    robots_txt: robotsTxt,
  };
}
