const axios = require('axios');
const cheerio = require('cheerio');

const BASE_TIMEOUT = 15000;
const MAX_PAGES = 8;

const SECTOR_BENCHMARKS = {
  'Tecnologia': {
    avgScores: { presenceDigital: 75, socialMedia: 70, cultureInnovation: 80, communication: 72, transformation: 78 },
    avgFinalScore: 75,
    leaders: ['Nvidia', 'Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'IBM', 'SAP', 'Oracle', 'Salesforce', 'Totvs', 'Locaweb', 'T-Mobile'],
    description: 'Setor de alta tecnologia e inovação'
  },
  'Financeiro': {
    avgScores: { presenceDigital: 70, socialMedia: 65, cultureInnovation: 55, communication: 68, transformation: 75 },
    avgFinalScore: 65,
    leaders: ['Itau', 'Bradesco', 'Santander', 'Banco do Brasil', 'XP Inc', 'Nubank', 'C6 Bank', 'Inter', 'BTG Pactual', 'Safra'],
    description: 'Setor financeiro e bancário'
  },
  'Varejo': {
    avgScores: { presenceDigital: 72, socialMedia: 78, cultureInnovation: 50, communication: 70, transformation: 65 },
    avgFinalScore: 68,
    leaders: ['Magazine Luiza', 'Americanas', 'Casas Bahia', 'Mercado Livre', 'Amazon Brasil', 'Shopee', 'Via Varejo', 'Renner', 'C&A', 'Macy\'s'],
    description: 'Setor de varejo e e-commerce'
  },
  'Saúde': {
    avgScores: { presenceDigital: 65, socialMedia: 60, cultureInnovation: 58, communication: 62, transformation: 55 },
    avgFinalScore: 60,
    leaders: ['Hospital Israelita Albert Einstein', 'Sírio-Libanês', 'Prevent Senior', 'Amil', 'Bradesco Saúde', 'Odonto', 'Fleury', 'DASA'],
    description: 'Setor de saúde e pharma'
  },
  'Educação': {
    avgScores: { presenceDigital: 68, socialMedia: 65, cultureInnovation: 72, communication: 75, transformation: 60 },
    avgFinalScore: 68,
    leaders: ['Khan Academy', 'Coursera', 'Duolingo', 'Descomplica', 'Abitamento', 'Anhanguera', 'Pitágoras', 'Estácio', 'Grupo Positivo'],
    description: 'Setor de educação e edtech'
  },
  'Industrial': {
    avgScores: { presenceDigital: 55, socialMedia: 50, cultureInnovation: 65, communication: 52, transformation: 60 },
    avgFinalScore: 57,
    leaders: ['Embraer', 'WEG', 'Petrobras', 'Vale', 'Gerdau', 'Ambev', 'BRF', 'Suzano', 'Klabin'],
    description: 'Setor industrial e manufacturing'
  },
  'Serviços': {
    avgScores: { presenceDigital: 62, socialMedia: 58, cultureInnovation: 55, communication: 60, transformation: 55 },
    avgFinalScore: 58,
    leaders: ['Accenture', 'Deloitte', 'PwC', 'EY', 'KPMG', 'McKinsey', 'Randstad', 'Adecco'],
    description: 'Setor de serviços profissionais'
  },
  'Imobiliário': {
    avgScores: { presenceDigital: 65, socialMedia: 70, cultureInnovation: 45, communication: 62, transformation: 58 },
    avgFinalScore: 60,
    leaders: ['MRV', 'Cyrela', 'Tenda', 'Eztec', 'Moura Dubeux', 'Aliansce', 'Multiplan', 'Iguatemi'],
    description: 'Setor imobiliário e construção'
  },
  'Alimentação': {
    avgScores: { presenceDigital: 60, socialMedia: 72, cultureInnovation: 48, communication: 65, transformation: 55 },
    avgFinalScore: 60,
    leaders: ['McDonald\'s Brasil', 'Burger King', 'Subway Brasil', 'Starbucks Brasil', 'Domino\'s', 'iFood', 'Rappi'],
    description: 'Setor de alimentação e food service'
  },
  'Automotivo': {
    avgScores: { presenceDigital: 68, socialMedia: 65, cultureInnovation: 70, communication: 65, transformation: 72 },
    avgFinalScore: 69,
    leaders: ['Toyota Brasil', 'Volkswagen', 'Ford Brasil', 'Chevrolet', 'Jeep Brasil', 'CAOA', 'BYD Brasil', 'Tesla'],
    description: 'Setor automotivo'
  },
  'Telecomunicações': {
    avgScores: { presenceDigital: 72, socialMedia: 70, cultureInnovation: 65, communication: 70, transformation: 72 },
    avgFinalScore: 70,
    leaders: ['Vivo', 'Claro', 'TIM Brasil', 'Oi', 'Sky Brasil', 'Netflix Brasil', 'Globoplay'],
    description: 'Setor de telecomunicações e streaming'
  },
  'Associações': {
    avgScores: { presenceDigital: 55, socialMedia: 58, cultureInnovation: 62, communication: 58, transformation: 48 },
    avgFinalScore: 56,
    leaders: ['CNC', 'Fecomério', ' CDL BH', 'Fenavist', 'Sesi', 'Senai', 'Sebrae', 'ACSP'],
    description: 'Setor de associações e entidades de classe'
  },
  'Default': {
    avgScores: { presenceDigital: 60, socialMedia: 55, cultureInnovation: 55, communication: 58, transformation: 55 },
    avgFinalScore: 57,
    leaders: [],
    description: 'Setor genérico'
  }
};

function classifySector(analysis, socialMedia) {
  const text = `${analysis.title} ${analysis.description} ${analysis.ogTitle} ${analysis.ogDescription} ${Object.keys(analysis.innovationKeywords).join(' ')}`.toLowerCase();
  const headings = analysis.headings.join(' ').toLowerCase();
  const content = (analysis.mainContent || '').toLowerCase();
  const combined = text + ' ' + headings + ' ' + content;
  
  const sectorKeywords = {
    'Tecnologia': ['tecnologia', 'software', ' TI ', ' ti ', 'tech', 'digital', 'inovação', 'inovacao', 'dev', 'programação', 'programacao', 'cloud', 'saas', 'data', 'analytics', 'automação', 'automacao'],
    'Financeiro': ['banco', 'financeiro', 'investimento', 'crédito', 'credito', 'seguros', 'corretora', 'bolsa', 'trading', 'fgts', 'previdência', 'previdencia', 'bank', 'banking'],
    'Varejo': ['varejo', 'loja', 'e-commerce', 'ecommerce', 'shop', 'store', 'mart', 'comércio', 'comercio', 'marketplace', 'atacado'],
    'Saúde': ['saúde', 'saude', 'hospital', 'médico', 'medico', 'clínica', 'clinica', 'laboratório', 'laboratorio', 'farmácia', 'farmacia', 'pharma', 'dental', 'odont'],
    'Educação': ['educação', 'educacao', 'ensino', 'escola', 'universidade', 'curso', 'treinamento', 'ead', 'aprendizado', 'learning', 'academy'],
    'Industrial': ['indústria', 'industria', 'fábrica', 'fabrica', 'manufatura', 'manufacturing', 'produção', 'producao', 'metalurgia', 'siderurgia', 'química', 'quimica'],
    'Serviços': ['serviços', 'servicos', 'consultoria', 'advocacia', 'advogado', 'contabilidade', 'rh', 'recursos humanos', 'outsourcing', 'consulting'],
    'Imobiliário': ['imobiliária', 'imobiliaria', 'imóvel', 'imovel', 'apartamento', 'casa', 'loteamento', 'incorporadora', 'construtora', 'real estate'],
    'Alimentação': ['alimentação', 'alimentacao', 'restaurante', 'lanchonete', 'food', 'bebida', 'café', 'cafe', 'padaria', 'confeitaria', 'gourmet', 'fast food'],
    'Automotivo': ['automotivo', 'carro', 'veículo', 'veiculo', 'moto', 'bicicleta', 'automobile', 'concessionária', 'concessionaria', 'montadora'],
    'Telecomunicações': ['telecom', 'telefonia', 'celular', 'internet', 'tv ', 'streaming', 'cabo', 'fibra', 'banda larga', 'provedor'],
    'Associações': ['associação', 'associacao', 'sindicato', ' CDL ', 'câmara', 'camara', 'federacão', 'federacao', 'confederação', 'confederacao', 'entidade', 'classe', 'comércio', 'comercio', 'industrial']
  };
  
  let bestMatch = { sector: 'Default', score: 0 };
  
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    let matchScore = 0;
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        matchScore += 1;
      }
    }
    if (matchScore > bestMatch.score) {
      bestMatch = { sector, score: matchScore };
    }
  }
  
  if (socialMedia?.linkedin?.industry) {
    const linkedInIndustry = socialMedia.linkedin.industry.toLowerCase();
    for (const sector of Object.keys(sectorKeywords)) {
      if (linkedInIndustry.includes(sector.toLowerCase())) {
        bestMatch = { sector, score: bestMatch.score + 5 };
        break;
      }
    }
  }
  
  return bestMatch.sector;
}

function generateBenchmark(analysis, scores, sector) {
  const benchmark = SECTOR_BENCHMARKS[sector] || SECTOR_BENCHMARKS['Default'];
  
  const gaps = {};
  const comparisons = {};
  
  for (const [dimension, value] of Object.entries(scores)) {
    if (dimension === 'finalScore') continue;
    const avgValue = benchmark.avgScores[dimension] || 55;
    const gap = value - avgValue;
    gaps[dimension] = gap;
    comparisons[dimension] = {
      company: value,
      sectorAvg: avgValue,
      gap: gap,
      status: gap > 10 ? 'above' : gap < -10 ? 'below' : 'average'
    };
  }
  
  const overallGap = scores.finalScore - benchmark.avgFinalScore;
  
  const percentile = calculatePercentile(scores.finalScore, benchmark.avgFinalScore);
  
  return {
    sector,
    sectorDescription: benchmark.description,
    avgScores: benchmark.avgScores,
    avgFinalScore: benchmark.avgFinalScore,
    companyScore: scores.finalScore,
    overallGap,
    percentile,
    dimensionComparisons: comparisons,
    leaders: benchmark.leaders.slice(0, 5),
    recommendations: generateGapRecommendations(gaps, sector)
  };
}

function calculatePercentile(companyScore, sectorAvg) {
  const stdDev = 15;
  const zScore = (companyScore - sectorAvg) / stdDev;
  
  if (zScore >= 1.5) return 'Top 10%';
  if (zScore >= 1) return 'Top 15%';
  if (zScore >= 0.5) return 'Top 25%';
  if (zScore >= 0) return 'Acima da média';
  if (zScore >= -0.5) return 'Na média';
  if (zScore >= -1) return 'Abaixo da média';
  if (zScore >= -1.5) return 'Bottom 25%';
  return 'Bottom 15%';
}

function generateGapRecommendations(gaps, sector) {
  const recommendations = [];
  
  const sortedGaps = Object.entries(gaps)
    .map(([dim, gap]) => ({ dimension: dim, gap }))
    .sort((a, b) => a.gap - b.gap);
  
  const dimensionLabels = {
    presenceDigital: 'Presença Digital',
    socialMedia: 'Redes Sociais',
    cultureInnovation: 'Cultura de Inovação',
    communication: 'Comunicação',
    transformation: 'Transformação Digital'
  };
  
  const worstGaps = sortedGaps.slice(0, 2);
  
  for (const { dimension, gap } of worstGaps) {
    if (gap < -15) {
      const label = dimensionLabels[dimension] || dimension;
      recommendations.push({
        dimension: label,
        priority: 'high',
        gap: Math.abs(gap),
        action: getGapAction(dimension, sector)
      });
    }
  }
  
  return recommendations;
}

function getGapAction(dimension, sector) {
  const actions = {
    presenceDigital: [
      'Implementar SEO técnico avançado',
      'Otimizar Core Web Vitals',
      'Desenvolver PWA para mobile',
      'Criar landing pages para campanhas'
    ],
    socialMedia: [
      'Definir calendário editorial',
      'Investir em conteúdo pago',
      'Ativar automação de redes sociais',
      'Implementar social listening'
    ],
    cultureInnovation: [
      'Documentar processos de inovação',
      'Criar programa de mentoria',
      'Estabelecer parcerias com startups',
      'Implementar metodologias ágeis'
    ],
    communication: [
      'Produzir conteúdo semanal',
      'Investir em conteúdo em vídeo',
      'Criar newsletter mensal',
      'Desenvolver podcast institucional'
    ],
    transformation: [
      'Automatizar processos com RPA',
      'Implementar CRM',
      'Criar analytics dashboard',
      'Digitalizar jornada do cliente'
    ]
  };
  
  const dimensionActions = actions[dimension] || ['Investigar oportunidades de melhoria'];
  return dimensionActions[Math.floor(Math.random() * dimensionActions.length)];
}

async function fetchSite(url, timeout = BASE_TIMEOUT) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      timeout,
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

function getBaseUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function isInternalLink(baseUrl, href) {
  if (!href) return false;
  if (href.startsWith('http') && !href.includes(new URL(baseUrl).host)) return false;
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  return true;
}

function normalizePath(baseUrl, href) {
  try {
    return new URL(href, baseUrl).pathname;
  } catch {
    return href;
  }
}

const IMPORTANT_PATHS = [
  '/sobre', '/about', '/about-us', '/sobre-nos',
  '/contato', '/contact', '/contact-us', '/fale-conosco',
  '/servicos', '/services', '/solucoes', '/solutions',
  '/produtos', '/products', '/portfolio',
  '/carreiras', '/careers', '/trabalhe-conosco', '/jobs',
  '/blog', '/noticias', '/news', '/artigos',
  '/clientes', '/cases', '/case-study', '/sucesso',
];

async function scrapeInternalPages(baseUrl, homepageHtml) {
  const $ = cheerio.load(homepageHtml);
  const base = getBaseUrl(baseUrl);
  
  const discoveredPaths = new Set();
  const pageData = {};
  
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (isInternalLink(base, href)) {
      const path = normalizePath(base, href);
      const cleanPath = path.split('?')[0].split('#')[0];
      if (cleanPath !== '/' && cleanPath !== '' && cleanPath.length > 1) {
        discoveredPaths.add(cleanPath);
      }
    }
  });
  
  const priorityPaths = [...IMPORTANT_PATHS.filter(p => discoveredPaths.has(p))];
  const otherPaths = [...discoveredPaths].filter(p => !IMPORTANT_PATHS.includes(p)).slice(0, 5);
  const pathsToScrape = [...priorityPaths, ...otherPaths].slice(0, MAX_PAGES);
  
  const promises = pathsToScrape.map(async (path) => {
    const url = `${base}${path}`;
    const html = await fetchSite(url, 10000);
    if (html) {
      const pageInfo = extractPageInfo(html, path);
      pageData[path] = pageInfo;
    }
    return null;
  });
  
  await Promise.all(promises);
  return pageData;
}

function extractPageInfo(html, path) {
  const $ = cheerio.load(html);
  const text = $('body').text();
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  
  const pageType = categorizePage(path);
  const email = $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '') || null;
  const phone = $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') || null;
  const address = extractAddress(text);
  
  const forms = $('form').length;
  const hasForm = forms > 0;
  const formTypes = [];
  $('form').each((i, el) => {
    const inputs = $(el).find('input, textarea, select').length;
    const submitText = $(el).find('button[type="submit"], input[type="submit"]').text().toLowerCase();
    if (submitText.includes('contato') || submitText.includes('contact')) formTypes.push('contact');
    if (submitText.includes('newsletter') || submitText.includes('cadastr')) formTypes.push('newsletter');
    if (submitText.includes('trabalhe') || submitText.includes('vaga')) formTypes.push('application');
  });
  
  const images = $('img').length;
  const videos = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
  
  const headings = [];
  $('h1, h2, h3').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 3) headings.push(text);
  });
  
  const innovationOnPage = extractInnovationKeywords(text);
  const techOnPage = detectTechOnPage(html);
  
  return {
    pageType,
    path,
    wordCount,
    email,
    phone,
    address,
    hasForm,
    formTypes: [...new Set(formTypes)],
    images,
    videos,
    headings: headings.slice(0, 5),
    innovationKeywords: innovationOnPage,
    technologies: techOnPage,
  };
}

function categorizePage(path) {
  const p = path.toLowerCase();
  if (p.includes('sobre')) return 'sobre';
  if (p.includes('contato')) return 'contato';
  if (p.includes('servic') || p.includes('soluc')) return 'servicos';
  if (p.includes('produt') || p.includes('portfolio')) return 'produtos';
  if (p.includes('carreira') || p.includes('job')) return 'carreiras';
  if (p.includes('blog') || p.includes('noticia') || p.includes('artigo')) return 'blog';
  if (p.includes('case') || p.includes('cliente') || p.includes('sucesso')) return 'cases';
  return 'outras';
}

function extractAddress(text) {
  const patterns = [
    /rua?\s+[^,]{3,50},\s*\d+[^\n]{0,50}/gi,
    /av\.\s+[^,]{3,50},?\s*\d+[^\n]{0,50}/gi,
    /praça\s+[^,]{3,50},?\s*\d*[^\n]{0,50}/gi,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

function extractInnovationKeywords(text) {
  const textLower = text.toLowerCase();
  const keywords = [];
  
  const categories = {
    'IA/Automação': ['inteligência artificial', 'ia ', 'machine learning', 'deep learning', 'chatbot', 'automação', 'automacao', 'rpa', 'bot ', 'workflow', 'nlp'],
    'Cloud/Nuvem': ['cloud', 'nuvem', 'saas', 'paas', 'iaas', 'aws', 'azure', 'gcp', 'heroku'],
    'Digital': ['digital', 'transformação', 'transformacao', 'digitalização', 'digitalizacao', 'omnichannel', 'omnichannel'],
    'Agile': ['agile', 'scrum', 'kanban', 'design thinking', 'lean', 'xp'],
    'Data': ['analytics', 'bi ', 'big data', 'dados', 'dashboard', 'metrics'],
    'Mobile': ['mobile', 'app ', 'responsivo', 'pwa', 'react native', 'flutter'],
  };
  
  for (const [category, terms] of Object.entries(categories)) {
    for (const term of terms) {
      if (textLower.includes(term)) {
        keywords.push({ category, term });
        break;
      }
    }
  }
  
  return keywords;
}

function detectTechOnPage(html) {
  const tech = [];
  const techPatterns = {
    'Google Analytics': /google analytics|analytics\.google|gtag/i,
    'Google Tag Manager': /google tag manager|gtm\/|dataLayer/i,
    'Facebook Pixel': /facebook\.com.*pixel|fbq\(|meta pixel/i,
    'Hotjar': /hotjar|hj\./i,
    'Intercom': /intercom| IntercomWidget/i,
    'Zendesk': /zendesk|kustomer/i,
    'HubSpot': /hs-script|hubspot|hsforms/i,
    'Mailchimp': /mailchimp|list-manage|mc-/i,
    'WhatsApp': /whatsapp|wa\.me|api\.whatsapp/i,
    'Tidio': /tidio|chatwidget/i,
    'Drift': /drift|drift方法来/i,
    'Calendly': /calendly|calendly\.com/i,
    'Stripe': /stripe|js\.stripe/i,
    'Pagar.me': /pagar\.me|pagarmesdk/i,
    'MercadoPago': /mercadopago|mp\.sdk/i,
  };
  
  for (const [name, pattern] of Object.entries(techPatterns)) {
    if (pattern.test(html)) {
      tech.push(name);
    }
  }
  
  return tech;
}

function extractCompanySlug(url) {
  try {
    const hostname = new URL(url).hostname;
    let slug = hostname.replace('www.', '').split('.')[0];
    slug = slug.replace(/-/g, '').replace(/_/g, '');
    return slug;
  } catch {
    return null;
  }
}

async function analyzeSocialMedia(socialLinks, companySlug) {
  const results = {
    linkedin: null,
    instagram: null,
    facebook: null,
    youtube: null,
    twitter: null,
  };

  const linkedInUrl = socialLinks.linkedin || (companySlug ? `https://www.linkedin.com/company/${companySlug}` : null);
  const instagramUrl = socialLinks.instagram || (companySlug ? `https://www.instagram.com/${companySlug}` : null);
  const facebookUrl = socialLinks.facebook || (companySlug ? `https://www.facebook.com/${companySlug}` : null);
  const youtubeUrl = socialLinks.youtube || (companySlug ? `https://www.youtube.com/@${companySlug}` : null);
  const twitterUrl = socialLinks.twitter || (companySlug ? `https://x.com/${companySlug}` : null);

  async function fetchLinkedIn(url) {
    if (!url) return null;
    const html = await fetchSite(url, 10000);
    if (!html) return null;
    
    const $ = cheerio.load(html);
    const text = html;
    
    const followersMatch = text.match(/([\d.,]+)\s*(?:seguidores|followers)/i) || 
                          text.match(/(\d+[\d.,]*)\s*followers/i);
    
    const employeesMatch = text.match(/(\d+[\d.,]*)\s*(?:funcionários|employees)/i);
    
    const industryMatch = text.match(/Setor[:\s]+([^\n<]+)/i) || 
                         text.match(/Industry[:\s]+([^\n<]+)/i);
    
    const sizeMatch = text.match(/Número de funcionários[:\s]+([^\n<]+)/i) ||
                     text.match(/Company size[:\s]+([^\n<]+)/i);
    
    const aboutMatch = $('section[id="about"]').text().trim() ||
                      $('p[data-test-id="about-us-description"]').text().trim() ||
                      $('meta[name="description"]').attr('content') || '';
    
    const hasAboutSection = aboutMatch.length > 50;
    const hasPosts = /publicações|posts|updates/i.test(text);
    
    return {
      url,
      found: true,
      followers: followersMatch ? followersMatch[1] : null,
      employees: employeesMatch ? employeesMatch[1] : null,
      industry: industryMatch ? industryMatch[1].trim() : null,
      companySize: sizeMatch ? sizeMatch[1].trim() : null,
      hasAbout: hasAboutSection,
      hasPosts,
      description: aboutMatch.substring(0, 500),
    };
  }

  async function fetchInstagram(url) {
    if (!url) return null;
    const html = await fetchSite(url, 10000);
    if (!html) return null;
    
    const $ = cheerio.load(html);
    const text = html;
    
    const followersMatch = text.match(/"edge_followed_by":\s*\{"count":\s*(\d+)/) ||
                          text.match(/"followers":\s*(\d+)/);
    
    const postsMatch = text.match(/"edge_owner_to_timeline_media":\s*\{"count":\s*(\d+)/) ||
                       text.match(/"media_count":\s*(\d+)/);
    
    const followingMatch = text.match(/"edge_follow":\s*\{"count":\s*(\d+)/);
    
    const fullName = $('meta[property="og:title"]').attr('content') ||
                   $('title').text().trim();
    
    const bioMatch = $('meta[name="description"]').attr('content') ||
                    text.match(/"biography":"([^"]+)"/);
    
    return {
      url,
      found: true,
      followers: followersMatch ? parseInt(followersMatch[1]).toLocaleString() : null,
      posts: postsMatch ? postsMatch[1] : null,
      following: followingMatch ? followingMatch[1] : null,
      name: fullName,
      bio: bioMatch ? bioMatch[1].replace(/\\n/g, ' ').substring(0, 300) : null,
    };
  }

  async function fetchFacebook(url) {
    if (!url) return null;
    const html = await fetchSite(url, 10000);
    if (!html) return null;
    
    const $ = cheerio.load(html);
    const text = html;
    
    const likesMatch = text.match(/"page_liked":\s*(\d+)/) ||
                     text.match(/(\d+[\d.,]*)\s*(?:curtidas|likes)/i) ||
                     text.match(/"like_count":\s*(\d+)/);
    
    const talkingMatch = text.match(/(\d+[\d.,]*)\s*(?:falando sobre isso|talking about)/i) ||
                        text.match(/"talk_about_count":\s*(\d+)/);
    
    const pageName = $('meta[property="og:title"]').attr('content') ||
                    $('title').text().trim();
    
    const aboutMatch = $('meta[name="description"]').attr('content') ||
                      text.match(/"about":"([^"]+)"/);
    
    const categoryMatch = text.match(/"category":"([^"]+)"/);
    
    return {
      url,
      found: true,
      likes: likesMatch ? parseInt(likesMatch[1]).toLocaleString() : null,
      talkingAbout: talkingMatch ? talkingMatch[1] : null,
      name: pageName,
      about: aboutMatch ? aboutMatch[1].replace(/\\n/g, ' ').substring(0, 300) : null,
      category: categoryMatch ? categoryMatch[1] : null,
    };
  }

  async function fetchYouTube(url) {
    if (!url) return null;
    const html = await fetchSite(url, 10000);
    if (!html) return null;
    
    const $ = cheerio.load(html);
    const text = html;
    
    const subscribersMatch = text.match(/"subscriberCountText":\s*\{"runs":\s*\[\{"text":\s*"([^"]+)"/) ||
                          text.match(/(\d+[\d.,]*[KMB]?)\s*(?:inscritos|subscribers)/i) ||
                          text.match(/"subscribers":"([^"]+)"/);
    
    const videosMatch = text.match(/"videoCountText":\s*\{"runs":\s*\[\{"text":\s*"([^"]+)"/) ||
                        text.match(/(\d+)\s*(?:vídeos|videos)/i);
    
    const channelName = $('meta[property="og:title"]').attr('content') ||
                       $('title').text().trim();
    
    const descriptionMatch = $('meta[name="description"]').attr('content');
    
    const viewCountMatch = text.match(/(\d+[\d.,]*)\s*(?:visualizações|views)/i);
    
    return {
      url,
      found: true,
      subscribers: subscribersMatch ? subscribersMatch[1] : null,
      videos: videosMatch ? videosMatch[1] : null,
      channelName,
      description: descriptionMatch ? descriptionMatch.substring(0, 300) : null,
      viewCount: viewCountMatch ? viewCountMatch[1] : null,
    };
  }

  async function fetchTwitter(url) {
    if (!url) return null;
    const html = await fetchSite(url, 10000);
    if (!html) return null;
    
    const $ = cheerio.load(html);
    const text = html;
    
    const followersMatch = text.match(/"followers_count":\s*(\d+)/) ||
                         text.match(/(\d+[\d.,]*)\s*(?:seguidores|followers)/i);
    
    const followingMatch = text.match(/"following_count":\s*(\d+)/) ||
                         text.match(/(\d+)\s*(?:seguindo|following)/i);
    
    const tweetsMatch = text.match(/"statuses_count":\s*(\d+)/) ||
                       text.match(/(\d+)\s*(?:tweets|posts)/i);
    
    const accountName = $('meta[property="og:title"]').attr('content') ||
                      $('title').text().trim();
    
    const bioMatch = $('meta[name="description"]').attr('content');
    
    return {
      url,
      found: true,
      followers: followersMatch ? parseInt(followersMatch[1]).toLocaleString() : null,
      following: followingMatch ? followingMatch[1] : null,
      tweets: tweetsMatch ? tweetsMatch[1] : null,
      name: accountName,
      bio: bioMatch ? bioMatch.substring(0, 300) : null,
    };
  }

  const fetchPromises = [
    fetchLinkedIn(linkedInUrl).then(r => { results.linkedin = r; }),
    fetchInstagram(instagramUrl).then(r => { results.instagram = r; }),
    fetchFacebook(facebookUrl).then(r => { results.facebook = r; }),
    fetchYouTube(youtubeUrl).then(r => { results.youtube = r; }),
    fetchTwitter(twitterUrl).then(r => { results.twitter = r; }),
  ];

  await Promise.allSettled(fetchPromises);
  
  const activeProfiles = Object.values(results).filter(r => r && r.found).length;
  results.summary = {
    activeProfiles,
    hasLinkedIn: !!results.linkedin,
    hasInstagram: !!results.instagram,
    hasFacebook: !!results.facebook,
    hasYouTube: !!results.youtube,
    hasTwitter: !!results.twitter,
    totalFollowers: calculateTotalFollowers(results),
  };

  return results;
}

function calculateTotalFollowers(social) {
  let total = 0;
  
  const extractNumber = (str) => {
    if (!str) return 0;
    const cleaned = str.replace(/[.,KMB]/gi, '');
    if (/K/i.test(str)) return parseInt(cleaned) * 1000;
    if (/M/i.test(str)) return parseInt(cleaned) * 1000000;
    if (/B/i.test(str)) return parseInt(cleaned) * 1000000000;
    return parseInt(cleaned) || 0;
  };

  if (social.linkedin?.followers) total += extractNumber(social.linkedin.followers);
  if (social.instagram?.followers) total += extractNumber(social.instagram.followers);
  if (social.facebook?.likes) total += extractNumber(social.facebook.likes);
  if (social.twitter?.followers) total += extractNumber(social.twitter.followers);

  return total > 0 ? total.toLocaleString() : null;
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

  const internalPagesData = analysis.internalPages ? Object.entries(analysis.internalPages).map(([path, data]) => {
    const contactInfo = data.email || data.phone || data.address ? `
    - Contato: ${[data.email, data.phone, data.address].filter(Boolean).join(', ')}` : '';
    const formInfo = data.hasForm ? `\n    - Formulários: ${data.formTypes.join(', ') || 'presente'}` : '';
    const techInfo = data.technologies && data.technologies.length > 0 ? `\n    - Ferramentas: ${data.technologies.join(', ')}` : '';
    const innovationInfo = data.innovationKeywords && data.innovationKeywords.length > 0 ? `\n    - Inovação: ${data.innovationKeywords.map(i => i.category).join(', ')}` : '';
    return `- ${path}: ${data.wordCount} palavras${contactInfo}${formInfo}${techInfo}${innovationInfo}`;
  }).join('\n') : '';

  const socialMediaData = analysis.socialMedia ? formatSocialMediaData(analysis.socialMedia) : '';

  return `
# DADOS COLETADOS DO SITE

## Informações Gerais
- **URL**: ${analysis.url}
- **Título**: ${analysis.title}
- **Descrição Meta**: ${analysis.description || 'Não encontrada'}
- **HTTPS**: ${analysis.hasHttps ? 'Sim' : 'Não'}
- **Palavras-chave**: ${analysis.keywords || 'Não definidas'}

## Conteúdo e Estrutura (Homepage)
- **Palavras no site**: ${analysis.wordCount.toLocaleString()}
- **Imagens**: ${analysis.images}
- **Links**: ${analysis.links}
- **Formulários**: ${analysis.forms}
- **Títulos (h1-h3)**: ${analysis.headingsCount}

## Páginas Internas Analisadas (${analysis.internalPages ? Object.keys(analysis.internalPages).length : 0})
${internalPagesData || '  - Nenhuma página interna encontrada ou acessível'}

## Recursos Identificados
- **Blog/Notícias**: ${analysis.hasBlog ? 'Sim' : 'Não'}
- **Cases/Portfolio**: ${analysis.hasCases ? 'Sim' : 'Não'}
- **Careers**: ${analysis.hasCareers ? 'Sim' : 'Não'}
- **Contato**: ${analysis.hasContact ? 'Sim' : 'Não'}
- **Privacidade/LGPD**: ${analysis.hasPrivacy ? 'Sim' : 'Não'}
- **E-commerce/Loja**: ${analysis.forms > 2 ? 'Possível' : 'Não identificado'}

## Redes Sociais - Análise Detalhada
${socialMediaData || '  - Não foi possível analisar redes sociais'}

## Tecnologias Detectadas (Homepage)
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

function formatSocialMediaData(social) {
  if (!social || !social.summary) return '  - Dados não disponíveis';
  
  const lines = [];
  lines.push(`**Perfis Ativos**: ${social.summary.activeProfiles}`);
  lines.push('');
  
  if (social.linkedin) {
    lines.push(`### LinkedIn`);
    lines.push(`  - URL: ${social.linkedin.url}`);
    lines.push(`  - Seguidores: ${social.linkedin.followers || 'Não disponível'}`);
    lines.push(`  - Funcionários: ${social.linkedin.employees || 'Não disponível'}`);
    lines.push(`  - Setor: ${social.linkedin.industry || 'Não disponível'}`);
    lines.push(`  - Porte: ${social.linkedin.companySize || 'Não disponível'}`);
    lines.push(`  - Seção About: ${social.linkedin.hasAbout ? 'Sim' : 'Não'}`);
    lines.push('');
  }
  
  if (social.instagram) {
    lines.push(`### Instagram`);
    lines.push(`  - URL: ${social.instagram.url}`);
    lines.push(`  - Seguidores: ${social.instagram.followers || 'Não disponível'}`);
    lines.push(`  - Posts: ${social.instagram.posts || 'Não disponível'}`);
    lines.push(`  - Bio: ${social.instagram.bio ? social.instagram.bio.substring(0, 100) + '...' : 'Não disponível'}`);
    lines.push('');
  }
  
  if (social.facebook) {
    lines.push(`### Facebook`);
    lines.push(`  - URL: ${social.facebook.url}`);
    lines.push(`  - Curtidas: ${social.facebook.likes || 'Não disponível'}`);
    lines.push(`  - Categoria: ${social.facebook.category || 'Não disponível'}`);
    lines.push('');
  }
  
  if (social.youtube) {
    lines.push(`### YouTube`);
    lines.push(`  - URL: ${social.youtube.url}`);
    lines.push(`  - Inscritos: ${social.youtube.subscribers || 'Não disponível'}`);
    lines.push(`  - Vídeos: ${social.youtube.videos || 'Não disponível'}`);
    lines.push('');
  }
  
  if (social.twitter) {
    lines.push(`### Twitter/X`);
    lines.push(`  - URL: ${social.twitter.url}`);
    lines.push(`  - Seguidores: ${social.twitter.followers || 'Não disponível'}`);
    lines.push(`  - Tweets: ${social.twitter.tweets || 'Não disponível'}`);
    lines.push('');
  }
  
  return lines.join('\n');
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
  
  console.log(`Raspando páginas internas...`);
  const internalPages = await scrapeInternalPages(url, html);
  analysis.internalPages = internalPages;
  
  if (Object.keys(internalPages).length > 0) {
    console.log(`Páginas internas analisadas: ${Object.keys(internalPages).length}`);
  }
  
  console.log(`Analisando redes sociais...`);
  const companySlug = extractCompanySlug(url);
  const socialMedia = await analyzeSocialMedia(analysis.socialLinks, companySlug);
  analysis.socialMedia = socialMedia;
  
  const activeSocials = socialMedia.summary?.activeProfiles || 0;
  console.log(`Redes sociais ativas encontradas: ${activeSocials}`);
  
  console.log(`Classificando setor e gerando benchmark...`);
  const sector = classifySector(analysis, socialMedia);
  console.log(`Setor identificado: ${sector}`);
  analysis.sector = sector;
  
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
  const benchmark = generateBenchmark(analysis, scores, sector);
  
  const result = {
    empresa: companyName,
    segmento: sector,
    scores: scores,
    maturidade: { level: maturity.level, name: maturity.name },
    forces,
    gaps,
    findings,
    recommendations,
    benchmark,
    roadmap: [
      { quarter: 'Q2 2026', focus: 'Curto Prazo', deliverables: recommendations.short.slice(0, 2).join(', ') },
      { quarter: 'Q3 2026', focus: 'Médio Prazo', deliverables: recommendations.medium.slice(0, 2).join(', ') },
      { quarter: 'Q4 2026', focus: 'Consolidação', deliverables: recommendations.medium[2] || 'Expansão' },
      { quarter: 'Q1 2027', focus: 'Longo Prazo', deliverables: recommendations.long.slice(0, 2).join(', ') },
    ],
    summary: `Análise do site ${companyName} revelando um perfil de maturidade ${maturity.name} (${scores.finalScore}/100) no setor de ${benchmark.sectorDescription}. A empresa está ${benchmark.percentile} do setor. ${scores.finalScore >= 60 ? 'Presença digital consolidada com oportunidades de evolução' : scores.finalScore >= 40 ? 'Fundamentos estabelecidos que necessitam de desenvolvimento estratégico' : 'Espaço significativo para investimento em presença digital e inovação'}.`,
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
    <style>
        :root {
            --primary: #1e3a5f;
            --secondary: #2d5a87;
            --accent: #f4a261;
            --success: #2a9d8f;
            --warning: #e9c46a;
            --danger: #e76f51;
            --light: #f8f9fa;
            --dark: #1d3557;
            --gray: #6c757d;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f0f2f5; }
        .container { max-width: 1100px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); color: white; padding: 60px 20px; text-align: center; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; font-weight: 700; }
        .header .subtitle { font-size: 1.2rem; opacity: 0.9; margin-bottom: 20px; }
        .header .date { font-size: 0.9rem; opacity: 0.8; }
        .score-badge { display: inline-block; background: var(--accent); color: var(--dark); padding: 15px 40px; border-radius: 50px; font-size: 1.5rem; font-weight: 700; margin-top: 20px; }
        .level-badge { display: inline-block; background: ${result.maturidade.level >= 4 ? 'var(--success)' : 'var(--warning)'}; color: white; padding: 8px 20px; border-radius: 20px; font-size: 1rem; font-weight: 600; margin-top: 10px; }
        .card { background: white; border-radius: 12px; padding: 30px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .card h2 { color: var(--primary); font-size: 1.5rem; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid var(--accent); display: inline-block; }
        .card h3 { color: var(--secondary); font-size: 1.1rem; margin: 20px 0 10px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .data-table th, .data-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
        .data-table th { background: var(--light); color: var(--primary); font-weight: 600; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-top: 20px; }
        .score-item { background: var(--light); padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid var(--secondary); }
        .score-item.high { border-left-color: var(--success); }
        .score-item.medium { border-left-color: var(--warning); }
        .score-item.low { border-left-color: var(--danger); }
        .score-value { font-size: 2.5rem; font-weight: 700; color: var(--primary); }
        .score-label { color: var(--gray); font-size: 0.9rem; margin-top: 5px; }
        .progress-container { margin: 15px 0; }
        .progress-label { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: 500; }
        .progress-bar { height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 6px; }
        .progress-fill.high { background: linear-gradient(90deg, var(--success), #3dd9a3); }
        .progress-fill.medium { background: linear-gradient(90deg, var(--warning), #f4d35e); }
        .progress-fill.low { background: linear-gradient(90deg, var(--danger), #f4a261); }
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
        .pages-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 15px; }
        .page-item { background: var(--light); padding: 15px; border-radius: 8px; border-left: 4px solid var(--secondary); }
        .page-item h4 { color: var(--primary); font-size: 1rem; margin-bottom: 10px; font-family: monospace; }
        .page-item p { margin: 5px 0; font-size: 0.85rem; color: var(--gray); }
        .page-item strong { color: var(--dark); }
        .social-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
        .social-item { background: var(--light); padding: 15px; border-radius: 8px; text-align: center; border-top: 4px solid var(--secondary); }
        .social-item.linkedin { border-top-color: #0077b5; }
        .social-item.instagram { border-top-color: #e1306c; }
        .social-item.facebook { border-top-color: #1877f2; }
        .social-item.youtube { border-top-color: #ff0000; }
        .social-item.twitter { border-top-color: #1da1f2; }
        .social-icon { font-size: 2rem; margin-bottom: 10px; }
        .social-name { font-weight: 600; color: var(--primary); margin-bottom: 5px; }
        .social-stat { font-size: 1.2rem; font-weight: 700; color: var(--dark); }
        .social-label { font-size: 0.8rem; color: var(--gray); }
        .social-item.inactive { opacity: 0.5; }
        .benchmark-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .benchmark-table th, .benchmark-table td { padding: 12px 15px; text-align: center; border-bottom: 1px solid #eee; }
        .benchmark-table th { background: var(--light); color: var(--primary); font-weight: 600; }
        .benchmark-table tr:hover { background: var(--light); }
        .benchmark-bar { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin-top: 5px; }
        .benchmark-fill { height: 100%; border-radius: 4px; }
        .benchmark-fill.above { background: var(--success); }
        .benchmark-fill.average { background: var(--warning); }
        .benchmark-fill.below { background: var(--danger); }
        .percentile-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: 600; }
        .percentile-badge.top { background: var(--success); color: white; }
        .percentile-badge.above { background: #81c784; color: white; }
        .percentile-badge.average { background: var(--warning); color: white; }
        .percentile-badge.below { background: #e57373; color: white; }
        .percentile-badge.bottom { background: var(--danger); color: white; }
        .leader-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .leader-tag { background: var(--light); padding: 4px 12px; border-radius: 15px; font-size: 0.85rem; color: var(--gray); }
        .gap-high { color: var(--danger); font-weight: 600; }
        .gap-medium { color: var(--warning); font-weight: 600; }
        .gap-good { color: var(--success); font-weight: 600; }
    </style>
</head>
<body>
    <header class="header">
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
                <tr><th>Páginas Internas Analisadas</th><td>${analysis.internalPages ? Object.keys(analysis.internalPages).length : 0}</td></tr>
            </table>
        </section>
        
        ${analysis.internalPages && Object.keys(analysis.internalPages).length > 0 ? `
        <section class="card">
            <h2>Páginas Internas Analisadas</h2>
            <div class="pages-grid">
                ${Object.entries(analysis.internalPages).map(([path, data]) => `
                    <div class="page-item">
                        <h4>${path}</h4>
                        <p><strong>Tipo:</strong> ${data.pageType}</p>
                        <p><strong>Palavras:</strong> ${data.wordCount}</p>
                        ${data.email ? `<p><strong>Email:</strong> ${data.email}</p>` : ''}
                        ${data.phone ? `<p><strong>Telefone:</strong> ${data.phone}</p>` : ''}
                        ${data.address ? `<p><strong>Endereço:</strong> ${data.address}</p>` : ''}
                        ${data.hasForm ? `<p><strong>Formulários:</strong> ${data.formTypes.join(', ')}</p>` : ''}
                        ${data.technologies && data.technologies.length > 0 ? `<p><strong>Ferramentas:</strong> ${data.technologies.join(', ')}</p>` : ''}
                        ${data.innovationKeywords && data.innovationKeywords.length > 0 ? `<p><strong>Inovação:</strong> ${data.innovationKeywords.map(i => i.category).join(', ')}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        </section>
        ` : ''}

        ${analysis.socialMedia && analysis.socialMedia.summary && analysis.socialMedia.summary.activeProfiles > 0 ? `
        <section class="card">
            <h2>Redes Sociais Analisadas</h2>
            <p style="margin-bottom: 15px; color: var(--gray);">Perfis ativos encontrados: <strong>${analysis.socialMedia.summary.activeProfiles}</strong></p>
            <div class="social-grid">
                ${analysis.socialMedia.linkedin ? `
                    <div class="social-item linkedin">
                        <div class="social-icon">🔗</div>
                        <div class="social-name">LinkedIn</div>
                        <div class="social-stat">${analysis.socialMedia.linkedin.followers || 'N/D'}</div>
                        <div class="social-label">seguidores</div>
                        ${analysis.socialMedia.linkedin.employees ? `<div style="margin-top: 5px; font-size: 0.8rem; color: var(--gray);">${analysis.socialMedia.linkedin.employees} funcionários</div>` : ''}
                    </div>
                ` : ''}
                ${analysis.socialMedia.instagram ? `
                    <div class="social-item instagram">
                        <div class="social-icon">📸</div>
                        <div class="social-name">Instagram</div>
                        <div class="social-stat">${analysis.socialMedia.instagram.followers || 'N/D'}</div>
                        <div class="social-label">seguidores</div>
                        ${analysis.socialMedia.instagram.posts ? `<div style="margin-top: 5px; font-size: 0.8rem; color: var(--gray);">${analysis.socialMedia.instagram.posts} posts</div>` : ''}
                    </div>
                ` : ''}
                ${analysis.socialMedia.youtube ? `
                    <div class="social-item youtube">
                        <div class="social-icon">▶️</div>
                        <div class="social-name">YouTube</div>
                        <div class="social-stat">${analysis.socialMedia.youtube.subscribers || 'N/D'}</div>
                        <div class="social-label">inscritos</div>
                        ${analysis.socialMedia.youtube.videos ? `<div style="margin-top: 5px; font-size: 0.8rem; color: var(--gray);">${analysis.socialMedia.youtube.videos} vídeos</div>` : ''}
                    </div>
                ` : ''}
                ${analysis.socialMedia.facebook ? `
                    <div class="social-item facebook">
                        <div class="social-icon">👍</div>
                        <div class="social-name">Facebook</div>
                        <div class="social-stat">${analysis.socialMedia.facebook.likes || 'N/D'}</div>
                        <div class="social-label">curtidas</div>
                    </div>
                ` : ''}
                ${analysis.socialMedia.twitter ? `
                    <div class="social-item twitter">
                        <div class="social-icon">🐦</div>
                        <div class="social-name">Twitter/X</div>
                        <div class="social-stat">${analysis.socialMedia.twitter.followers || 'N/D'}</div>
                        <div class="social-label">seguidores</div>
                    </div>
                ` : ''}
            </div>
            ${analysis.socialMedia.linkedin && analysis.socialMedia.linkedin.industry ? `
            <div style="margin-top: 15px; padding: 10px; background: var(--light); border-radius: 8px;">
                <strong>Setor identificado:</strong> ${analysis.socialMedia.linkedin.industry}
                ${analysis.socialMedia.linkedin.companySize ? ` • <strong>Porte:</strong> ${analysis.socialMedia.linkedin.companySize}` : ''}
            </div>
            ` : ''}
        </section>
        ` : ''}

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

        ${result.benchmark ? `
        <section class="card">
            <h2>Benchmark Setorial</h2>
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                <div>
                    <p style="color: var(--gray); font-size: 0.9rem;">Setor identificado</p>
                    <p style="font-size: 1.2rem; font-weight: 600; color: var(--primary);">${result.benchmark.sector}</p>
                </div>
                <div>
                    <p style="color: var(--gray); font-size: 0.9rem;">Média do setor</p>
                    <p style="font-size: 1.2rem; font-weight: 600;">${result.benchmark.avgFinalScore}/100</p>
                </div>
                <div>
                    <p style="color: var(--gray); font-size: 0.9rem;">Comparação</p>
                    <span class="percentile-badge ${result.benchmark.percentile.includes('Top') ? 'top' : result.benchmark.percentile.includes('Acima') ? 'above' : result.benchmark.percentile.includes('Na') ? 'average' : 'below'}">${result.benchmark.percentile}</span>
                </div>
            </div>
            <table class="benchmark-table">
                <thead>
                    <tr><th>Dimensão</th><th>Sua Nota</th><th>Média Setorial</th><th>Diferença</th><th>Comparação</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align: left;">Presença Digital</td>
                        <td><strong>${result.benchmark.dimensionComparisons.presenceDigital.company}</strong></td>
                        <td>${result.benchmark.dimensionComparisons.presenceDigital.sectorAvg}</td>
                        <td class="${result.benchmark.dimensionComparisons.presenceDigital.gap > 0 ? 'gap-good' : result.benchmark.dimensionComparisons.presenceDigital.gap < -10 ? 'gap-high' : ''}">${result.benchmark.dimensionComparisons.presenceDigital.gap > 0 ? '+' : ''}${result.benchmark.dimensionComparisons.presenceDigital.gap}</td>
                        <td><div class="benchmark-bar"><div class="benchmark-fill ${result.benchmark.dimensionComparisons.presenceDigital.status}" style="width: ${result.benchmark.dimensionComparisons.presenceDigital.company}%;"></div></div></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Redes Sociais</td>
                        <td><strong>${result.benchmark.dimensionComparisons.socialMedia.company}</strong></td>
                        <td>${result.benchmark.dimensionComparisons.socialMedia.sectorAvg}</td>
                        <td class="${result.benchmark.dimensionComparisons.socialMedia.gap > 0 ? 'gap-good' : result.benchmark.dimensionComparisons.socialMedia.gap < -10 ? 'gap-high' : ''}">${result.benchmark.dimensionComparisons.socialMedia.gap > 0 ? '+' : ''}${result.benchmark.dimensionComparisons.socialMedia.gap}</td>
                        <td><div class="benchmark-bar"><div class="benchmark-fill ${result.benchmark.dimensionComparisons.socialMedia.status}" style="width: ${result.benchmark.dimensionComparisons.socialMedia.company}%;"></div></div></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Cultura de Inovação</td>
                        <td><strong>${result.benchmark.dimensionComparisons.cultureInnovation.company}</strong></td>
                        <td>${result.benchmark.dimensionComparisons.cultureInnovation.sectorAvg}</td>
                        <td class="${result.benchmark.dimensionComparisons.cultureInnovation.gap > 0 ? 'gap-good' : result.benchmark.dimensionComparisons.cultureInnovation.gap < -10 ? 'gap-high' : ''}">${result.benchmark.dimensionComparisons.cultureInnovation.gap > 0 ? '+' : ''}${result.benchmark.dimensionComparisons.cultureInnovation.gap}</td>
                        <td><div class="benchmark-bar"><div class="benchmark-fill ${result.benchmark.dimensionComparisons.cultureInnovation.status}" style="width: ${result.benchmark.dimensionComparisons.cultureInnovation.company}%;"></div></div></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Comunicação</td>
                        <td><strong>${result.benchmark.dimensionComparisons.communication.company}</strong></td>
                        <td>${result.benchmark.dimensionComparisons.communication.sectorAvg}</td>
                        <td class="${result.benchmark.dimensionComparisons.communication.gap > 0 ? 'gap-good' : result.benchmark.dimensionComparisons.communication.gap < -10 ? 'gap-high' : ''}">${result.benchmark.dimensionComparisons.communication.gap > 0 ? '+' : ''}${result.benchmark.dimensionComparisons.communication.gap}</td>
                        <td><div class="benchmark-bar"><div class="benchmark-fill ${result.benchmark.dimensionComparisons.communication.status}" style="width: ${result.benchmark.dimensionComparisons.communication.company}%;"></div></div></td>
                    </tr>
                    <tr>
                        <td style="text-align: left;">Transformação Digital</td>
                        <td><strong>${result.benchmark.dimensionComparisons.transformation.company}</strong></td>
                        <td>${result.benchmark.dimensionComparisons.transformation.sectorAvg}</td>
                        <td class="${result.benchmark.dimensionComparisons.transformation.gap > 0 ? 'gap-good' : result.benchmark.dimensionComparisons.transformation.gap < -10 ? 'gap-high' : ''}">${result.benchmark.dimensionComparisons.transformation.gap > 0 ? '+' : ''}${result.benchmark.dimensionComparisons.transformation.gap}</td>
                        <td><div class="benchmark-bar"><div class="benchmark-fill ${result.benchmark.dimensionComparisons.transformation.status}" style="width: ${result.benchmark.dimensionComparisons.transformation.company}%;"></div></div></td>
                    </tr>
                </tbody>
            </table>
            ${result.benchmark.leaders && result.benchmark.leaders.length > 0 ? `
            <div style="margin-top: 20px;">
                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 10px;">Líderes do setor para referência:</p>
                <div class="leader-list">
                    ${result.benchmark.leaders.map(l => `<span class="leader-tag">${l}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            ${result.benchmark.recommendations && result.benchmark.recommendations.length > 0 ? `
            <div style="margin-top: 20px; padding: 15px; background: var(--light); border-radius: 8px;">
                <h4 style="color: var(--primary); margin-bottom: 10px;">Prioridades para追赶 Setorial</h4>
                ${result.benchmark.recommendations.map(r => `
                    <div style="margin-bottom: 10px;">
                        <strong style="color: var(--danger);">${r.dimension}:</strong> ${r.action}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </section>
        ` : ''}

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
