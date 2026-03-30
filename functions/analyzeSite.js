const axios = require('axios');
const cheerio = require('cheerio');

async function fetchSite(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    throw new Error(`Erro ao acessar ${url}: ${error.message}`);
  }
}

function extractCompanyName(url) {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.replace('www.', '').split('.');
    if (parts[0] && parts[0] !== 'com' && parts[0] !== 'br' && parts[0] !== 'org') {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return hostname.replace('www.', '').split('.')[0];
  } catch {
    return 'Empresa';
  }
}

function analyzeSiteContent(html, url) {
  const $ = cheerio.load(html);
  
  const title = $('title').text().trim() || 'Sem título';
  const description = $('meta[name="description"]').attr('content') || '';
  const keywords = $('meta[name="keywords"]').attr('content') || '';
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';
  
  const hasHttps = url.startsWith('https');
  
  const navLinks = $('nav a, header a, .menu a').map((i, el) => $(el).text().trim()).get();
  const footerLinks = $('footer a').map((i, el) => $(el).text().trim()).get();
  
  const hasBlog = /blog|noticias|notícias|artigos|conteúdos|conteudos|artigos/i.test(html);
  const hasCases = /case|portfolio|sucesso|resultados|clientes/i.test(html);
  const hasCareers = /carreira|trabalhe|vaga|jobs|contratação|contratacao/i.test(html);
  const hasContact = /contato|contact|atendimento|fale/i.test(html);
  const hasPrivacy = /privacidade|privacy|lgpd|termo|terms/i.test(html);
  
  const headings = [];
  $('h1, h2, h3').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 3) headings.push(text);
  });
  
  const images = $('img').length;
  const links = $('a').length;
  const forms = $('form').length;
  
  const text = $('body').text();
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  
  const socialLinks = {
    linkedin: $('a[href*="linkedin.com"]').first().attr('href') || null,
    instagram: $('a[href*="instagram.com"]').first().attr('href') || null,
    facebook: $('a[href*="facebook.com"]').first().attr('href') || null,
    youtube: $('a[href*="youtube.com"]').first().attr('href') || null,
    twitter: $('a[href*="twitter.com"], a[href*="x.com"]').first().attr('href') || null,
  };
  
  const techIndicators = {
    react: /react|reactjs/i.test(html),
    vue: /vue\.js|vuejs/i.test(html),
    angular: /angular/i.test(html),
    wordpress: /wp-content|wordpress|wp-includes/i.test(html),
    shopify: /shopify/i.test(html),
    webflow: /webflow/i.test(html),
    wix: /wixsite|wix\.com/i.test(html),
    hubspot: /hubspot/i.test(html),
    salesforce: /salesforce/i.test(html),
    gtm: /google tag manager|gtm/i.test(html),
    ga: /google analytics|analytics\.google/i.test(html),
    meta: /facebook\.com|fb\.com/i.test(html),
    mailchimp: /mailchimp/i.test(html),
    pipedrive: /pipedrive/i.test(html),
    zendesk: /zendesk/i.test(html),
    intercom: /intercom/i.test(html),
    cloudflare: /cloudflare/i.test(html),
    aws: /aws|amazon web services/i.test(html),
    azure: /azure|microsoft azure/i.test(html),
  };

  const innovationKeywords = {
    'Inteligência Artificial / IA': ['inteligência artificial', 'ia ', ' ai ', 'machine learning', 'ml ', 'deep learning', 'chatbot', 'automação', 'automacao'],
    'Blockchain': ['blockchain', 'criptomoeda', 'crypto', 'web3', 'nft'],
    'IoT': ['iot', 'internet das coisas', 'internet of things', 'sensor'],
    'Cloud': ['cloud', 'nuvem', 'saas', 'paas', 'iaas'],
    'Agile': ['agile', 'scrum', 'kanban', 'design thinking', 'lean', 'xp'],
    'Transformação Digital': ['transformação digital', 'transformacao digital', 'digitalização', 'digitalizacao'],
    'Automação': ['automação', 'automacao', 'rpa', 'bot ', 'workflow'],
    'Dados/Analytics': ['analytics', 'bi ', 'business intelligence', 'big data', 'dados'],
    'API/Integração': ['api', 'web service', 'integração', 'integracao', 'webhook'],
    'Mobile': ['mobile', 'app ', 'aplicativo', 'responsivo', 'pwa'],
  };
  
  const foundInnovationKeywords = {};
  const textLower = (text + keywords + ogTitle + ogDescription).toLowerCase();
  
  for (const [category, terms] of Object.entries(innovationKeywords)) {
    const matches = [];
    for (const term of terms) {
      if (textLower.includes(term.toLowerCase())) {
        matches.push(term);
      }
    }
    if (matches.length > 0) {
      foundInnovationKeywords[category] = matches;
    }
  }

  const paragraphs = [];
  $('p').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 50 && text.length < 500) {
      paragraphs.push(text);
    }
  });

  const mainContent = paragraphs.slice(0, 10).join(' ');
  
  return {
    url,
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    hasHttps,
    hasBlog,
    hasCases,
    hasCareers,
    hasContact,
    hasPrivacy,
    navLinks: navLinks.slice(0, 20),
    footerLinks: footerLinks.slice(0, 15),
    headings: headings.slice(0, 15),
    headingsCount: headings.length,
    images,
    links,
    forms,
    wordCount,
    socialLinks,
    techIndicators,
    innovationKeywords: foundInnovationKeywords,
    mainContent: mainContent.substring(0, 3000),
    rawText: text.substring(0, 5000),
  };
}

function formatAnalysisForLLM(analysis) {
  const companySlug = analysis.url.replace(/^https?:\/\//, '').replace(/www\./, '').replace(/\..*/, '');
  
  const socialLinksList = Object.entries(analysis.socialLinks)
    .filter(([k, v]) => v)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join('\n');
  
  const techList = Object.entries(analysis.techIndicators)
    .filter(([k, v]) => v)
    .map(([k]) => `  - ${k}`)
    .join('\n');
  
  const innovationList = Object.entries(analysis.innovationKeywords)
    .map(([cat, terms]) => `  - ${cat}: ${terms.join(', ')}`)
    .join('\n');

  const inferredProfiles = `
  - LinkedIn Company: https://linkedin.com/company/${companySlug}
  - Instagram: https://instagram.com/${companySlug}
  - Facebook: https://facebook.com/${companySlug}
  - YouTube: https://youtube.com/@${companySlug}
  - Twitter/X: https://x.com/${companySlug}`;

  return `
# DADOS COLETADOS DO SITE

## Informações Gerais
- **URL**: ${analysis.url}
- **Título**: ${analysis.title}
- **Descrição Meta**: ${analysis.description || 'Não encontrada'}
- **HTTPS**: ${analysis.hasHttps ? 'Sim' : 'Não'}
- **Palavras-chave**: ${analysis.keywords || 'Não definidas'}
- **Slug para redes sociais**: ${companySlug}

## Conteúdo e Estrutura
- **Palavras no site**: ${analysis.wordCount.toLocaleString()}
- **Imagens**: ${analysis.images}
- **Links**: ${analysis.links}
- **Formulários**: ${analysis.forms}
- **Títulos (h1-h3)**: ${analysis.headingsCount}

## Recursos Identificados
- **Blog/Notícias**: ${analysis.hasBlog ? 'Sim' : 'Não'}
- **Cases/Portfolio**: ${analysis.hasCases ? 'Sim' : 'Não'}
- **Careers**: ${analysis.hasCareers ? 'Sim' : 'Não'}
- **Contato**: ${analysis.hasContact ? 'Sim' : 'Não'}
- **Privacidade/LGPD**: ${analysis.hasPrivacy ? 'Sim' : 'Não'}
- **E-commerce/Loja**: ${analysis.forms > 2 ? 'Possível' : 'Não identificado'}

## Redes Sociais Identificadas no Site
${socialLinksList || '  - Nenhuma rede social evidenciada explicitamente'}

## Perfis de Redes Sociais para Verificação (inferidos pelo slug da empresa)
${inferredProfiles}

## Tecnologias Detectadas
${techList || '  - Não foram identificadas tecnologias específicas'}

## Sinais de Inovação Mencionados
${innovationList || '  - Nenhum keyword de inovação encontrado'}

## Links de Navegação (amostra)
${analysis.navLinks.slice(0, 10).map(l => `  - ${l}`).join('\n')}

## Tópicos/Assuntos (Headings)
${analysis.headings.slice(0, 8).map(h => `  - ${h}`).join('\n')}

## Trecho do Conteúdo Principal
${analysis.mainContent.substring(0, 1500)}
`;
}

async function analyzeWithLLM(analysis, config) {
  const { provider, apiKey, model, temperature = 0.7 } = config;
  
  const systemPrompt = `Você é um Analista de Inovação especializado em avaliar o nível de maturidade tecnológica e inovadora de empresas através da análise de suas presenças digitais.

## CRÍTICO - ANÁLISE WEB E REDES SOCIAIS

FAÇA UMA VARREDURA COMPLETA na internet para enriquecer sua análise:

1. **Pesquise no LinkedIn**: Busque a empresa por nome, verifique:
   - Existência de Company Page
   - Número de seguidores
   - Frequência de posts (semanal/mensal)
   - Último post publicado
   - Engajamento (curtidas, comentários)

2. **Pesquise no Instagram**: 
   - Perfil da empresa existe?
   - Quantidade de posts e seguidores
   - Última postagem

3. **Pesquise no YouTube**:
   - Canal da empresa?
   - Quantidade de vídeos
   - Frequência de upload

4. **Pesquise no Google**:
   - Notebooks, artigos, menções
   - Prêmios ou certificações
   - Parcerias tecnológicas

5. **Verifique outras plataformas**:
   - Twitter/X, Facebook, TikTok
   - Google Business Profile
   - Marketplace ou e-commerce

Use ferramentas de busca para encontrar informações atualizadas sobre a empresa.

## Framework de Maturidade de Inovação

| Nível | Denominação | Características |
|-------|-------------|-----------------|
| 1 | Nascent | Sem presença digital clara ou conteúdo estático |
| 2 | Emergente | Presença básica, comunicação unilateral |
| 3 | Desenvolvendo | Conteúdo ativo, métricas básicas de engajamento |
| 4 | Inovador | Comunicação Omnichannel, uso de novas tecnologias |
| 5 | Líder | Digital-first, IA integrada, ecossistema inovador |

## Dimensões de Análise (com pesos)

1. **Presença Digital (20%)**: Site, blog, SEO, UX
2. **Redes Sociais (25%)**: Plataformas ativas, frequência de posts, engajamento, respostas
3. **Cultura de Inovação (25%)**: Metodologias, tecnologias emergentes, parcerias, IA, automação
4. **Comunicação e Conteúdo (15%)**: Tom, qualidade, frequência, formatos (vídeo, blog, podcast)
5. **Indicadores de Transformação (15%)**: Digitalização, automação, cases, resultados

## SUA TAREFA

Com base nos dados do site E nas informações coletadas via web search e redes sociais, gere um relatório detalhado de maturidade de inovação seguindo EXATAMENTE este formato JSON:

\`\`\`json
{
  "empresa": "Nome da empresa extraído do site",
  "segmento": "Setor de atuação identificado",
  "porte": "Pequena/Média/Grande baseado nos indicadores",
  "localizacao": "Localização se identificada",
  
  "scores": {
    "presenceDigital": NÚMERO_0_A_100,
    "socialMedia": NÚMERO_0_A_100,
    "cultureInnovation": NÚMERO_0_A_100,
    "communication": NÚMERO_0_A_100,
    "transformation": NÚMERO_0_A_100,
    "finalScore": NÚMERO_CALCULADO
  },
  
  "maturidade": {
    "level": NÚMERO_1_A_5,
    "name": "Nome do nível",
    "description": "Breve descrição do posicionamento"
  },
  
  "forces": ["força 1", "força 2", ...],
  "gaps": ["gap 1", "gap 2", ...],
  
  "findings": [
    {"title": "Título do achado 1", "description": "Descrição detalhada"},
    {"title": "Título do achado 2", "description": "Descrição detalhada"},
    {"title": "Título do achado 3", "description": "Descrição detalhada"}
  ],
  
  "recommendations": {
    "short": ["recomendação curto prazo 1", "..."],
    "medium": ["recomendação médio prazo 1", "..."],
    "long": ["recomendação longo prazo 1", "..."]
  },
  
  "roadmap": [
    {"quarter": "Q2 2026", "focus": "Foco principal", "deliverables": "Entrega 1, Entrega 2"},
    {"quarter": "Q3 2026", "focus": "Foco principal", "deliverables": "Entrega 1, Entrega 2"},
    {"quarter": "Q4 2026", "focus": "Foco principal", "deliverables": "Entrega 1, Entrega 2"},
    {"quarter": "Q1 2027", "focus": "Foco principal", "deliverables": "Entrega 1, Entrega 2"}
  ],
  
  "summary": "Parágrafo de 3-4 linhas com o panorama geral da análise"
}
\`\`\`

## REGRAS IMPORTANTES

1. **FAÇA WEB SEARCH**: Use ferramentas de busca para verificar redes sociais e presença online
2. Scores devem refletir a CONSOLIDAÇÃO das fontes (site + web search + redes sociais)
3. Se o site é básico mas tem redes sociais ativas, ajuste scores para cima
4. Redes sociais abandonadas (sem posts recentes) devem penalizar o score
5. Forces e gaps devem ser específicos e mencionando a fonte da informação
6. Findings DEVEM documentar QUAIS redes sociais foram verificadas e o que foi encontrado
7. Recommendations devem ser práticas e realizáveis
8. Se uma rede social foi VERIFICADA mas está inativa, registre como gap
9. Companies com presença omnichannel (LinkedIn + Instagram + YouTube + blog) devem ter scores maiores
10. Roadmap deve ser realista para o porte da empresa
11. Inclua no summary quali fontes foram consultadas na web

Responda APENAS com o JSON, sem texto adicional.`;

  const dataForLLM = formatAnalysisForLLM(analysis);
  
  try {
    let response;
    
    const useMaxCompletionTokens = model.startsWith('o') || /gpt-5|o1|o3|o4/.test(model);
    
    if (provider === 'groq') {
      const { default: OpenAI } = require('openai');
      const client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      });
      
      response = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dataForLLM }
        ],
        temperature: temperature,
        ...(useMaxCompletionTokens ? { max_completion_tokens: 4000 } : { max_tokens: 4000 }),
      });
    } else {
      const { default: OpenAI } = require('openai');
      const client = new OpenAI({ apiKey });
      
      response = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dataForLLM }
        ],
        temperature: temperature,
        ...(useMaxCompletionTokens ? { max_completion_tokens: 4000 } : { max_tokens: 4000 }),
      });
    }

    let content = response.choices[0].message.content;
    
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }
    
    content = content.replace(/[\x00-\x1F\x7F]/g, ' ');
    content = content.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
    content = content.replace(/\\/g, '\\\\');
    
    const directJson = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    return JSON.parse(directJson);
    
  } catch (error) {
    console.error('Erro na chamada da LLM:', error.message);
    throw new Error(`Erro na análise com ${provider}: ${error.message}`);
  }
}

async function analyzeSite(url, llmConfig = null) {
  console.log(`Iniciando análise de: ${url}`);
  
  const html = await fetchSite(url);
  const companyName = extractCompanyName(url);
  
  console.log(`Analisando site de: ${companyName}`);
  const analysis = analyzeSiteContent(html, url);
  
  if (llmConfig && llmConfig.apiKey) {
    console.log(`Usando LLM (${llmConfig.provider}) para análise avançada...`);
    const llmResult = await analyzeWithLLM(analysis, llmConfig);
    llmResult.using_llm = true;
    llmResult.provider = llmConfig.provider.toUpperCase();
    
    return {
      analysis,
      llmResult,
      html: generateHTMLReport(llmResult, analysis),
    };
  }
  
  console.log('Usando análise baseada em regras...');
  const { calculateScores, getForcesAndGaps, getMainFindings, getRecommendations, getMaturityLevel } = require('./scoringRules');
  
  const scores = calculateScores(analysis);
  const { forces, gaps } = getForcesAndGaps(analysis, scores);
  const findings = getMainFindings(analysis, scores);
  const recommendations = getRecommendations(scores);
  const maturity = getMaturityLevel(scores.finalScore);
  
  const result = {
    empresa: companyName,
    segmento: 'A ser definido',
    scores: scores,
    maturidade: { level: maturity.level, name: maturity.name },
    forces,
    gaps,
    findings,
    recommendations,
    roadmap: [
      { quarter: 'Q2 2026', focus: 'Curto Prazo', deliverables: recommendations.short.slice(0, 2).join(', ') },
      { quarter: 'Q3 2026', focus: 'Médio Prazo', deliverables: recommendations.medium.slice(0, 2).join(', ') },
      { quarter: 'Q4 2026', focus: 'Consolidação', deliverables: recommendations.medium[2] || 'Expansão' },
      { quarter: 'Q1 2027', focus: 'Longo Prazo', deliverables: recommendations.long.slice(0, 2).join(', ') },
    ],
    summary: `Análise do site ${companyName} revelando um perfil de maturidade ${maturity.name} (${scores.finalScore}/100). A empresa demonstra ${scores.finalScore >= 60 ? 'presença digital consolidada com oportunidades de evolução' : scores.finalScore >= 40 ? 'fundamentos estabelecidos que necessitam de desenvolvimento estratégico' : 'espaço significativo para investimento em presença digital e inovação'}.`,
    using_llm: false,
    provider: 'REGRAS',
  };
  
  return {
    analysis,
    llmResult: result,
    html: generateHTMLReport(result, analysis),
  };
}

function generateHTMLReport(result, analysis) {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const getScoreClass = (score) => {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Maturidade de Inovação - ${result.empresa}</title>
    <script>
        (function () {
            function normalizeTheme(value) {
                if (!value) return null;
                const normalized = String(value).trim().toLowerCase();
                if (normalized === 'dark' || normalized === 'escuro') return 'dark';
                if (normalized === 'light' || normalized === 'claro') return 'light';
                return null;
            }

            function decodeBase64Url(value) {
                try {
                    const base = value.replace(/-/g, '+').replace(/_/g, '/');
                    const padding = (4 - (base.length % 4 || 4)) % 4;
                    return atob(base + '='.repeat(padding));
                } catch (error) {
                    return null;
                }
            }

            function tryParseJson(value) {
                try {
                    return JSON.parse(value);
                } catch (error) {
                    return null;
                }
            }

            function findThemeInObject(value, depth) {
                if (!value || typeof value !== 'object' || depth > 4) return null;

                const directTheme = normalizeTheme(value.theme || value.thema || value.mode);
                if (directTheme) return directTheme;

                for (const key in value) {
                    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
                    const nested = value[key];
                    if (nested && typeof nested === 'object') {
                        const nestedTheme = findThemeInObject(nested, depth + 1);
                        if (nestedTheme) return nestedTheme;
                    }
                }

                return null;
            }

            function readThemeFromToken(rawToken) {
                if (!rawToken) return null;

                const candidates = [rawToken.trim()];
                const tokenParts = rawToken.split('.');

                if (tokenParts.length >= 2) {
                    const jwtPayload = decodeBase64Url(tokenParts[1]);
                    if (jwtPayload) candidates.push(jwtPayload);
                }

                const decodedToken = decodeBase64Url(rawToken);
                if (decodedToken) candidates.push(decodedToken);

                for (const candidate of candidates) {
                    const directTheme = normalizeTheme(candidate);
                    if (directTheme) return directTheme;

                    const parsed = tryParseJson(candidate);
                    const themed = findThemeInObject(parsed, 0);
                    if (themed) return themed;
                }

                return null;
            }

            const params = new URLSearchParams(window.location.search);
            const directTheme = normalizeTheme(params.get('theme') || params.get('thema') || params.get('modo'));
            const tokenTheme = readThemeFromToken(
                params.get('token') ||
                params.get('access_token') ||
                params.get('embedToken')
            );
            const resolvedTheme = directTheme || tokenTheme;

            if (resolvedTheme) {
                document.documentElement.setAttribute('data-theme', resolvedTheme);
            }
        })();
    </script>
    <style>
        :root {
            color-scheme: light;
            --primary: #1f2937;
            --secondary: #344054;
            --accent: #ff6b35;
            --accent-strong: #ef4444;
            --success: #1f9d74;
            --warning: #e9a23b;
            --danger: #d65a4d;
            --light: #ffffff;
            --dark: #171717;
            --gray: #667085;
            --shell-bg: #f6f4ef;
            --shell-bg-alt: #fff8f3;
            --surface: rgba(255, 255, 255, 0.84);
            --surface-solid: #ffffff;
            --surface-muted: rgba(255, 255, 255, 0.72);
            --border: rgba(148, 163, 184, 0.22);
            --border-strong: rgba(255, 107, 53, 0.2);
            --text-primary: #1f2937;
            --text-secondary: #667085;
            --text-tertiary: #8a94a6;
            --shadow-soft: 0 28px 70px rgba(15, 23, 42, 0.14);
            --shadow-card: 0 20px 48px rgba(15, 23, 42, 0.1);
        }
        @media (prefers-color-scheme: dark) {
            :root:not([data-theme]) {
                color-scheme: dark;
                --primary: #f5f5f5;
                --secondary: #d4d4d8;
                --accent: #ff6b35;
                --accent-strong: #ef4444;
                --success: #3cc79d;
                --warning: #f6b64a;
                --danger: #ff8b78;
                --light: #232326;
                --dark: #0f0f10;
                --gray: #c7c9d1;
                --shell-bg: #171717;
                --shell-bg-alt: #101013;
                --surface: rgba(31, 31, 35, 0.9);
                --surface-solid: #232326;
                --surface-muted: rgba(36, 40, 47, 0.84);
                --border: rgba(255, 255, 255, 0.12);
                --border-strong: rgba(255, 107, 53, 0.28);
                --text-primary: #f5f5f5;
                --text-secondary: #c7c9d1;
                --text-tertiary: #a1a1aa;
                --shadow-soft: 0 32px 84px rgba(0, 0, 0, 0.42);
                --shadow-card: 0 24px 56px rgba(0, 0, 0, 0.28);
            }
        }
        :root[data-theme="dark"] {
                color-scheme: dark;
                --primary: #f5f5f5;
                --secondary: #d4d4d8;
                --accent: #ff6b35;
                --accent-strong: #ef4444;
                --success: #3cc79d;
                --warning: #f6b64a;
                --danger: #ff8b78;
                --light: #232326;
                --dark: #0f0f10;
                --gray: #c7c9d1;
                --shell-bg: #171717;
                --shell-bg-alt: #101013;
                --surface: rgba(31, 31, 35, 0.9);
                --surface-solid: #232326;
                --surface-muted: rgba(36, 40, 47, 0.84);
                --border: rgba(255, 255, 255, 0.12);
                --border-strong: rgba(255, 107, 53, 0.28);
                --text-primary: #f5f5f5;
                --text-secondary: #c7c9d1;
                --text-tertiary: #a1a1aa;
                --shadow-soft: 0 32px 84px rgba(0, 0, 0, 0.42);
                --shadow-card: 0 24px 56px rgba(0, 0, 0, 0.28);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background:
                radial-gradient(circle at 10% 8%, rgba(255, 107, 53, 0.18), transparent 24%),
                radial-gradient(circle at 92% 12%, rgba(239, 68, 68, 0.12), transparent 18%),
                linear-gradient(180deg, var(--shell-bg-alt) 0%, var(--shell-bg) 48%, var(--shell-bg) 100%);
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
            padding-bottom: 36px;
        }
        body::before,
        body::after {
            content: '';
            position: fixed;
            width: 320px;
            height: 320px;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.48;
            pointer-events: none;
            z-index: 0;
        }
        body::before {
            top: -120px;
            left: -70px;
            background: rgba(255, 107, 53, 0.2);
        }
        body::after {
            right: -120px;
            bottom: -120px;
            background: rgba(239, 68, 68, 0.14);
        }
        .container {
            position: relative;
            z-index: 1;
            max-width: 1180px;
            margin: 0 auto;
            padding: 28px 20px 0;
        }
        .header {
            position: relative;
            z-index: 1;
            width: min(1180px, calc(100% - 40px));
            margin: 24px auto 0;
            padding: 44px 32px 30px;
            text-align: center;
            color: var(--text-primary);
            border-radius: 28px;
            overflow: hidden;
            border: 1px solid var(--border);
            background: linear-gradient(180deg, var(--surface-solid) 0%, var(--surface-muted) 100%);
            box-shadow: var(--shadow-card);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }
        .header::before {
            content: '';
            position: absolute;
            inset: 0 0 auto;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, rgba(255, 107, 53, 0.92), rgba(239, 68, 68, 0.72));
        }
        .header::after {
            content: '';
            position: absolute;
            top: -120px;
            right: -80px;
            width: 220px;
            height: 220px;
            border-radius: 50%;
            background: rgba(255, 107, 53, 0.12);
            filter: blur(28px);
        }
        .report-back {
            position: absolute;
            top: 18px;
            left: 18px;
            z-index: 2;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: rgba(148, 163, 184, 0.08);
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.84rem;
            font-weight: 600;
            transition: background-color 0.2s ease-out, border-color 0.2s ease-out, color 0.2s ease-out, transform 0.2s ease-out;
        }
        .report-back:hover {
            background: rgba(255, 107, 53, 0.08);
            border-color: rgba(255, 107, 53, 0.18);
            color: var(--text-primary);
            transform: translateY(-1px);
        }
        .report-back span[aria-hidden="true"] {
            font-size: 0.92rem;
            line-height: 1;
        }
        .header h1 {
            position: relative;
            font-size: clamp(1.9rem, 4vw, 2.7rem);
            line-height: 1.08;
            letter-spacing: -0.04em;
            margin-bottom: 8px;
            font-weight: 700;
        }
        .header .subtitle {
            position: relative;
            font-size: 1rem;
            color: var(--text-secondary);
            opacity: 1;
            margin-bottom: 12px;
        }
        .header .date {
            position: relative;
            font-size: 0.88rem;
            color: var(--text-tertiary);
            opacity: 1;
        }
        .score-badge {
            position: relative;
            display: inline-block;
            margin-top: 18px;
            padding: 12px 18px;
            border-radius: 999px;
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--accent);
            background: rgba(255, 107, 53, 0.1);
            border: 1px solid rgba(255, 107, 53, 0.18);
            box-shadow: none;
        }
        .level-badge {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-top: 10px;
            padding: 9px 16px;
            border-radius: 999px;
            font-size: 0.86rem;
            font-weight: 700;
            color: ${result.maturidade.level >= 4 ? 'var(--success)' : 'var(--text-secondary)'};
            background: ${result.maturidade.level >= 4 ? 'rgba(31, 157, 116, 0.12)' : 'rgba(148, 163, 184, 0.12)'};
            border: 1px solid ${result.maturidade.level >= 4 ? 'rgba(31, 157, 116, 0.22)' : 'var(--border)'};
        }
        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 28px;
            padding: clamp(22px, 3.6vw, 32px);
            margin-bottom: 24px;
            box-shadow: var(--shadow-card);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
        }
        .card h2 {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-primary);
            font-size: 1.38rem;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
        }
        .card h2::before {
            content: '';
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent), var(--accent-strong));
            box-shadow: 0 8px 18px rgba(255, 107, 53, 0.24);
        }
        .card h3 {
            color: var(--text-primary);
            font-size: 1.05rem;
            margin: 0 0 12px;
        }
        .card p { color: var(--text-secondary); }
        .data-table,
        .framework-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 15px;
        }
        .data-table th,
        .data-table td,
        .framework-table th,
        .framework-table td {
            padding: 14px 16px;
            border-bottom: 1px solid var(--border);
        }
        .data-table th,
        .framework-table th {
            font-weight: 700;
            color: var(--text-primary);
            background: rgba(255, 107, 53, 0.08);
        }
        .data-table td,
        .framework-table td {
            color: var(--text-secondary);
            background: rgba(255, 255, 255, 0.24);
        }
        .data-table th { width: 28%; text-align: left; }
        .framework-table th,
        .framework-table td { text-align: center; }
        .framework-table tr:nth-child(even) td { background: rgba(255, 255, 255, 0.14); }
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }
        .score-item {
            position: relative;
            overflow: hidden;
            background: var(--surface-solid);
            padding: 20px;
            border-radius: 22px;
            text-align: left;
            border: 1px solid var(--border);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }
        .score-item::before {
            content: '';
            position: absolute;
            inset: 0 0 auto;
            height: 4px;
            background: linear-gradient(90deg, var(--accent), var(--accent-strong));
        }
        .score-item.high::before { background: linear-gradient(90deg, var(--success), #3dd9a3); }
        .score-item.medium::before { background: linear-gradient(90deg, var(--warning), var(--accent)); }
        .score-item.low::before { background: linear-gradient(90deg, var(--danger), var(--accent)); }
        .score-value {
            font-size: 2.6rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        .score-label {
            color: var(--text-secondary);
            font-size: 0.92rem;
            margin-top: 6px;
        }
        .progress-container {
            margin: 15px 0;
            padding: 18px;
            border-radius: 22px;
            background: var(--surface-solid);
            border: 1px solid var(--border);
        }
        .progress-label {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--text-secondary);
        }
        .progress-bar {
            height: 14px;
            background: rgba(148, 163, 184, 0.18);
            border-radius: 999px;
            overflow: hidden;
        }
        .progress-fill { height: 100%; border-radius: 999px; }
        .progress-fill.high { background: linear-gradient(90deg, var(--success), #3dd9a3); }
        .progress-fill.medium { background: linear-gradient(90deg, var(--warning), var(--accent)); }
        .progress-fill.low { background: linear-gradient(90deg, var(--danger), var(--accent)); }
        .list { list-style: none; padding-left: 0; }
        .list li { padding: 8px 0; padding-left: 25px; position: relative; }
        .list li::before { content: '→'; position: absolute; left: 0; color: var(--accent); font-weight: bold; }
        .list.strengths li::before { content: '✓'; color: var(--success); }
        .list.gaps li::before { content: '✗'; color: var(--danger); }
        .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        @media (max-width: 768px) { .two-columns { grid-template-columns: 1fr; } }
        .finding { background: var(--light); padding: 20px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid var(--accent); }
        .finding h4 { color: var(--primary); margin-bottom: 8px; }
        .finding p { color: var(--gray); font-size: 0.95rem; }
        .rec-timeline { border-left: 3px solid var(--secondary); padding-left: 25px; margin-left: 10px; }
        .rec-section { margin-bottom: 25px; }
        .rec-item { position: relative; margin-bottom: 20px; }
        .rec-item::before { content: ''; position: absolute; left: -32px; top: 5px; width: 16px; height: 16px; background: var(--secondary); border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 3px var(--secondary); }
        .rec-item.short { --dot-color: var(--success); }
        .rec-item.medium { --dot-color: var(--warning); }
        .rec-item.long { --dot-color: var(--danger); }
        .rec-item::before { background: var(--dot-color); box-shadow: 0 0 0 3px var(--dot-color); }
        .rec-title { font-weight: 600; color: var(--primary); font-size: 1.05rem; }
        .rec-desc { color: var(--gray); margin-top: 5px; }
        .roadmap { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .roadmap-item { background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; }
        .roadmap-item h4 { font-size: 1.2rem; margin-bottom: 10px; color: var(--accent); }
        .roadmap-item .focus { font-weight: 600; margin-bottom: 10px; }
        .roadmap-item .deliverables { font-size: 0.9rem; opacity: 0.9; line-height: 1.5; }
        .footer { text-align: center; padding: 30px; color: var(--gray); font-size: 0.85rem; border-top: 1px solid #eee; margin-top: 40px; }
        .framework-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .framework-table th, .framework-table td { padding: 12px 15px; text-align: center; border: 1px solid #eee; }
        .framework-table th { background: var(--primary); color: white; }
        .framework-table tr:nth-child(even) { background: var(--light); }
        .level-indicator { display: inline-block; width: 30px; height: 30px; line-height: 30px; border-radius: 50%; background: var(--secondary); color: white; font-weight: bold; }
        .level-indicator.current { background: var(--accent); color: var(--dark); transform: scale(1.2); }
        .site-info { background: var(--light); padding: 15px; border-radius: 8px; margin: 10px 0; font-family: monospace; font-size: 0.9rem; word-break: break-all; }
        .llm-badge { display: inline-block; background: var(--success); color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-top: 5px; }
        .list {
            list-style: none;
            padding-left: 0;
            display: grid;
            gap: 12px;
        }
        .list li {
            position: relative;
            padding: 14px 16px 14px 42px;
            background: var(--surface-solid);
            border: 1px solid var(--border);
            border-radius: 18px;
            color: var(--text-primary);
        }
        .list li::before {
            content: '>';
            position: absolute;
            left: 16px;
            top: 14px;
            color: var(--accent);
            font-weight: 700;
        }
        .list.strengths li::before {
            content: '+';
            color: var(--success);
        }
        .list.gaps li::before {
            content: 'x';
            color: var(--danger);
        }
        .two-columns {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
        }
        .finding {
            background: var(--surface-solid);
            padding: 22px;
            border-radius: 20px;
            margin-bottom: 14px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-card);
        }
        .finding h4 {
            color: var(--text-primary);
            margin-bottom: 8px;
        }
        .finding p {
            color: var(--text-secondary);
            font-size: 0.96rem;
        }
        .rec-timeline {
            position: relative;
            border-left: 1px solid rgba(255, 107, 53, 0.3);
            padding-left: 28px;
            margin-left: 10px;
        }
        .rec-section { margin-bottom: 26px; }
        .rec-section h3 { margin-bottom: 14px; }
        .rec-item {
            position: relative;
            margin-bottom: 14px;
            padding: 14px 16px;
            background: var(--surface-solid);
            border: 1px solid var(--border);
            border-radius: 18px;
            box-shadow: var(--shadow-card);
        }
        .rec-item.short { --dot-color: var(--success); }
        .rec-item.medium { --dot-color: var(--warning); }
        .rec-item.long { --dot-color: var(--danger); }
        .rec-item::before {
            content: '';
            position: absolute;
            left: -37px;
            top: 18px;
            width: 14px;
            height: 14px;
            background: var(--dot-color, var(--accent));
            border-radius: 50%;
            border: 2px solid var(--shell-bg);
            box-shadow: 0 0 0 6px rgba(255, 107, 53, 0.08);
        }
        .rec-title {
            font-weight: 700;
            color: var(--text-primary);
            font-size: 1rem;
        }
        .rec-desc {
            color: var(--text-secondary);
            margin-top: 5px;
        }
        .roadmap {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 18px;
        }
        .roadmap-item {
            position: relative;
            overflow: hidden;
            background: linear-gradient(180deg, var(--surface-solid), var(--surface-muted));
            color: var(--text-primary);
            padding: 24px;
            border-radius: 22px;
            text-align: left;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-card);
        }
        .roadmap-item::before {
            content: '';
            position: absolute;
            inset: 0 0 auto;
            height: 4px;
            background: linear-gradient(90deg, var(--accent), var(--accent-strong));
        }
        .roadmap-item h4 {
            font-size: 1.1rem;
            margin-bottom: 12px;
            color: var(--accent);
        }
        .roadmap-item .focus {
            font-weight: 700;
            margin-bottom: 10px;
            color: var(--text-primary);
        }
        .roadmap-item .deliverables {
            font-size: 0.94rem;
            line-height: 1.6;
            color: var(--text-secondary);
        }
        .footer {
            position: relative;
            z-index: 1;
            width: min(1180px, calc(100% - 40px));
            margin: 18px auto 0;
            padding: 24px 20px 0;
            text-align: center;
            color: var(--text-tertiary);
            font-size: 0.9rem;
            border-top: 1px solid var(--border);
        }
        .framework-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 15px;
        }
        .framework-table th,
        .framework-table td {
            padding: 14px 16px;
            border: none;
            border-bottom: 1px solid var(--border);
        }
        .framework-table th {
            background: rgba(255, 107, 53, 0.08);
            color: var(--text-primary);
        }
        .framework-table td {
            background: rgba(255, 255, 255, 0.24);
            color: var(--text-secondary);
        }
        .framework-table tr:nth-child(even) td { background: rgba(255, 255, 255, 0.14); }
        .level-indicator {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            line-height: 1;
            border-radius: 50%;
            background: var(--surface-muted);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            font-weight: 700;
        }
        .level-indicator.current {
            background: linear-gradient(135deg, var(--accent), var(--accent-strong));
            border-color: transparent;
            color: white;
            box-shadow: 0 12px 24px rgba(255, 107, 53, 0.24);
            transform: none;
        }
        .site-info {
            background: var(--surface-solid);
            padding: 16px 18px;
            border-radius: 18px;
            margin: 18px 0 0;
            border: 1px solid var(--border);
            font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
            font-size: 0.92rem;
            color: var(--text-secondary);
            word-break: break-all;
        }
        .llm-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-top: 10px;
            padding: 7px 12px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--text-secondary);
            background: rgba(148, 163, 184, 0.1);
            border: 1px solid var(--border);
        }
        @media (max-width: 860px) {
            .two-columns { grid-template-columns: 1fr; }
            .header {
                width: calc(100% - 32px);
                padding: 34px 22px 24px;
                border-radius: 24px;
            }
            .report-back {
                top: 14px;
                left: 14px;
            }
            .container { padding: 22px 16px 0; }
            .footer { width: calc(100% - 32px); }
        }
        @media (max-width: 760px) {
            .data-table,
            .framework-table {
                display: block;
                overflow-x: auto;
                white-space: nowrap;
            }
            .progress-label { font-size: 0.94rem; }
        }
    </style>
</head>
<body>
    <header class="header">
        <a href="/" class="report-back" onclick="if (window.history.length > 1) { history.back(); return false; }">
            <span aria-hidden="true">&larr;</span>
            <span>Voltar</span>
        </a>
        <h1>Relatório de Maturidade de Inovação</h1>
        <p class="subtitle">${result.empresa} - Análise de Presença Digital</p>
        <p class="date">Análise baseada em dados públicos • ${today}</p>
        <div class="score-badge">${result.scores.finalScore}/100</div>
        <br>
        <div class="level-badge">NÍVEL ${result.maturidade.level} - ${result.maturidade.name}</div>
        ${result.using_llm ? '<br><div class="llm-badge">Análise com IA</div>' : ''}
    </header>

    <main class="container">
        <section class="card">
            <h2>Sumário Executivo</h2>
            <p>${result.summary}</p>
            <div class="site-info"><strong>URL Analisada:</strong> ${analysis.url}</div>
        </section>

        <section class="card">
            <h2>Dados da Análise</h2>
            <table class="data-table">
                <tr><th>Empresa</th><td>${result.empresa}</td></tr>
                <tr><th>Segmento</th><td>${result.segmento || 'A ser definido'}</td></tr>
                <tr><th>Porte</th><td>${result.porte || 'Não identificado'}</td></tr>
                <tr><th>URL</th><td>${analysis.url}</td></tr>
                <tr><th>Título do Site</th><td>${analysis.title}</td></tr>
                <tr><th>Segurança HTTPS</th><td>${analysis.hasHttps ? '✓ Ativo' : '✗ Inativo'}</td></tr>
            </table>
        </section>

        <section class="card">
            <h2>Scores por Dimensão</h2>
            <div class="progress-container">
                <div class="progress-label"><span>Nota Final Ponderada</span><span>${result.scores.finalScore}/100</span></div>
                <div class="progress-bar"><div class="progress-fill ${getScoreClass(result.scores.finalScore)}" style="width: ${result.scores.finalScore}%;"></div></div>
            </div>
            <div class="score-grid">
                <div class="score-item ${getScoreClass(result.scores.presenceDigital)}"><div class="score-value">${result.scores.presenceDigital}</div><div class="score-label">Presença Digital (20%)</div></div>
                <div class="score-item ${getScoreClass(result.scores.socialMedia)}"><div class="score-value">${result.scores.socialMedia}</div><div class="score-label">Redes Sociais (25%)</div></div>
                <div class="score-item ${getScoreClass(result.scores.cultureInnovation)}"><div class="score-value">${result.scores.cultureInnovation}</div><div class="score-label">Cultura de Inovação (25%)</div></div>
                <div class="score-item ${getScoreClass(result.scores.communication)}"><div class="score-value">${result.scores.communication}</div><div class="score-label">Comunicação (15%)</div></div>
                <div class="score-item ${getScoreClass(result.scores.transformation)}"><div class="score-value">${result.scores.transformation}</div><div class="score-label">Transformação (15%)</div></div>
            </div>
        </section>

        <section class="card">
            <h2>Detalhamento por Dimensão</h2>
            <div class="two-columns">
                <div>
                    <h3>Forças Identificadas</h3>
                    <ul class="list strengths">
                        ${(result.forces || []).map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <h3>Gaps e Oportunidades</h3>
                    <ul class="list gaps">
                        ${(result.gaps || []).map(g => `<li>${g}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </section>

        <section class="card">
            <h2>Framework de Maturidade</h2>
            <table class="framework-table">
                <thead><tr><th>Nível</th><th>Denominação</th><th>Características</th></tr></thead>
                <tbody>
                    <tr><td><span class="level-indicator ${result.maturidade.level === 1 ? 'current' : ''}">1</span></td><td>${result.maturidade.level === 1 ? '<strong>Nascent ✓</strong>' : 'Nascent'}</td><td>Sem presença digital clara ou conteúdo estático</td></tr>
                    <tr><td><span class="level-indicator ${result.maturidade.level === 2 ? 'current' : ''}">2</span></td><td>${result.maturidade.level === 2 ? '<strong>Emergente ✓</strong>' : 'Emergente'}</td><td>Presença básica, comunicação unilateral</td></tr>
                    <tr><td><span class="level-indicator ${result.maturidade.level === 3 ? 'current' : ''}">3</span></td><td>${result.maturidade.level === 3 ? '<strong>Desenvolvendo ✓</strong>' : 'Desenvolvendo'}</td><td>Conteúdo ativo, métricas básicas de engajamento</td></tr>
                    <tr><td><span class="level-indicator ${result.maturidade.level === 4 ? 'current' : ''}">4</span></td><td>${result.maturidade.level === 4 ? '<strong>Inovador ✓</strong>' : 'Inovador'}</td><td>Comunicação Omnichannel, uso de novas tecnologias</td></tr>
                    <tr><td><span class="level-indicator ${result.maturidade.level === 5 ? 'current' : ''}">5</span></td><td>${result.maturidade.level === 5 ? '<strong>Líder ✓</strong>' : 'Líder'}</td><td>Digital-first, IA integrada, ecossistema inovador</td></tr>
                </tbody>
            </table>
        </section>

        <section class="card">
            <h2>Principais Achados</h2>
            ${(result.findings || []).map((f, i) => `
                <div class="finding">
                    <h4>${i + 1}. ${f.title}</h4>
                    <p>${f.description}</p>
                </div>
            `).join('')}
        </section>

        <section class="card">
            <h2>Recomendações Estratégicas</h2>
            <div class="rec-timeline">
                <div class="rec-section">
                    <h3>Curto Prazo (0-3 meses)</h3>
                    ${(result.recommendations?.short || []).map(r => `<div class="rec-item short"><div class="rec-title">${r}</div></div>`).join('')}
                </div>
                <div class="rec-section">
                    <h3>Médio Prazo (3-12 meses)</h3>
                    ${(result.recommendations?.medium || []).map(r => `<div class="rec-item medium"><div class="rec-title">${r}</div></div>`).join('')}
                </div>
                <div class="rec-section">
                    <h3>Longo Prazo (12+ meses)</h3>
                    ${(result.recommendations?.long || []).map(r => `<div class="rec-item long"><div class="rec-title">${r}</div></div>`).join('')}
                </div>
            </div>
        </section>

        <section class="card">
            <h2>Roadmap de Evolução</h2>
            <div class="roadmap">
                ${(result.roadmap || []).map(r => `
                    <div class="roadmap-item">
                        <h4>${r.quarter}</h4>
                        <p class="focus">${r.focus}</p>
                        <p class="deliverables">${r.deliverables}</p>
                    </div>
                `).join('')}
            </div>
        </section>

        <section class="card" style="background: var(--light);">
            <h2 style="border-bottom-color: var(--gray);">Nota Metodológica</h2>
            <p style="color: var(--gray);">Análise baseada em extração automática de dados públicos do site institucional${result.using_llm ? ' e geração assistida por Inteligência Artificial' : ''}. Scores${result.using_llm ? ' e recomendações' : ''} gerados${result.using_llm ? ' por LLM' : ' usando framework de 5 dimensões com pesos predefinidos'}. Para análise mais precisa, recomenda-se entrevista com stakeholders internos e acesso a dados proprietários.</p>
        </section>
    </main>

    <footer class="footer">
        <p><strong>Relatório de Maturidade de Inovação</strong></p>
        <p>${result.empresa} • ${today}</p>
        <p>Gerado por Sistema de Análise de Maturidade${result.using_llm ? ' com IA' : ''}</p>
    </footer>
</body>
</html>`;
}

module.exports = { analyzeSite, fetchSite, analyzeSiteContent, formatAnalysisForLLM, analyzeWithLLM };
