const axios = require('axios');
const cheerio = require('cheerio');
const CompetitorAnalysisAgent = require('../src/index');

const BASE_TIMEOUT = 15000;
const MAX_PAGES = 8;

async function searchGoogleCompetitors(companyName, businessType, region) {
  const businessQueries = {
    'Academia': 'maiores redes academias Brasil',
    'Restaurante': 'melhores restaurantes Brasil',
    'Clínica Médica': 'melhores hospitais clínicas Brasil',
    'Farmácia': 'redes drogarias Brasil',
    'Educação': 'melhores universidades faculdades Brasil',
    'Advocacia': 'melhores escritórios advocacia Brasil',
    'Contabilidade': 'escritórios contabilidade Brasil',
    'Imobiliária': 'melhores imobiliárias Brasil',
    'Pet Shop': 'redes pet shop Brasil',
    'Beleza/Salão': 'melhores salões beleza Brasil',
    'Odontologia': 'redes clínicas odontológicas Brasil',
    'Associação/Entidade': 'federações associações comerciais Brasil',
    'Varejo': 'maiores varejistas Brasil',
    'E-commerce': 'maiores e-commerces Brasil',
    'Tecnologia/Software': 'principais empresas tecnologia Brasil',
    'Financeiro': 'principais fintechs bancos Brasil',
    'Turismo': 'melhores agências turismo Brasil',
    'Hotel/Pousada': 'melhores redes hotéis Brasil'
  };
  
  const queries = [
    `principais concorrentes ${companyName}`,
    businessQueries[businessType] || `${businessType} Brasil`,
    `ranking ${businessType} Brasil`
  ];
  
  if (region) {
    queries.push(`${businessType} ${region} ranking`);
  }
  
  const allCompetitors = new Set();
  
  for (const query of queries) {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        }
      });
      
      const html = await response.text();
      const $ = cheerio.load(html);
      let allText = '';
      
      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('uddg=') || href.match(/\/l\/\?/)) {
          const text = $(el).text().trim();
          if (text && text.length > 5) {
            allText += text + ' ';
          }
        }
      });
      
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          allText += text + ' ';
        }
      });
      
      const found = extractCompanyNames(allText);
      found.forEach(name => allCompetitors.add(name));
      
    } catch (error) {
      console.log(`[Busca] Erro: ${error.message}`);
    }
  }
  
  const filtered = Array.from(allCompetitors)
    .filter(c => !c.toLowerCase().includes(companyName.toLowerCase()))
    .filter(c => c.length > 2 && c.length < 50)
    .slice(0, 10);
  
  return filtered;
}

function extractCompanyNames(text) {
  const names = [];
  
  const knownCompanies = [
    'Smart Fit', 'Bio Ritmo', "Gold's Gym", 'CrossFit', 'Curves', 'Blue Fit', 'Power Fit',
    'Bodytech', 'Smart Fit Low', 'Next Fit',
    'Gympass', 'TotalPass', 'Cultfit', 'Fitness Park',
    'McFit', 'FitX', 'Cleverfit', 'Physique',
    'Rede DOr', 'Hospital Albert Einstein', 'Sírio-Libanês', 'Fleury', 'Sabin', 'A+',
    'Magazine Luiza', 'Americanas', 'Casas Bahia', 'Mercado Livre', 'Amazon', 'Shopee',
    'Totvs', 'SAP', 'Oracle', 'Salesforce', 'Locaweb',
    'Rock Content', 'Resultados Digitais', 'RD Station', 'HubSpot', 'Youpage',
    'Nubank', 'C6 Bank', 'Inter', 'PicPay', 'PagSeguro', 'Mercado Pago',
    'Petlove', 'Petz', 'Cobasi', 'Petland', 'Cãobeira',
    'FECOMÉRCIO', 'CNC', 'ACSP', 'CDL', 'Sebrae', 'SENAI', 'SESI',
    'Drogaria São Paulo', 'Drogarias Extra', 'Drogaria Araujo', 'Drogasil', 'Raia', 'Pague Menos',
    'Lopes', 'Viva Real', 'Zap Imóveis', 'Loft', 'MRV', 'Cyrela',
    'Accenture', 'Deloitte', 'McKinsey', 'Bain', 'KPMG', 'EY', 'PwC'
  ];
  
  for (const company of knownCompanies) {
    if (text.toLowerCase().includes(company.toLowerCase())) {
      names.push(company);
    }
  }
  
  const patterns = [
    /([A-Z][a-zA-Zà-öø-ÿ]+(?:\s+[A-Z][a-zA-Zà-öø-ÿ]+){0,3})/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name.length > 4 && name.length < 40 && 
          !/^(?:de|do|da|dos|das|para|com|sem|por|sob|sobre|mais|menos|que|qual|quem|como|este|esta|esses|essas|aquele|aquela)$/i.test(name) &&
          !/^\d+$/.test(name)) {
        names.push(name);
      }
    }
  }
  
  return [...new Set(names)];
}

const SECTOR_BENCHMARKS = {
  'Tecnologia': {
    avgScores: { presenceDigital: 75, socialMedia: 70, cultureInnovation: 80, communication: 72, transformation: 78 },
    avgFinalScore: 75,
    description: 'Setor de alta tecnologia e inovação'
  },
  'Financeiro': {
    avgScores: { presenceDigital: 70, socialMedia: 65, cultureInnovation: 55, communication: 68, transformation: 75 },
    avgFinalScore: 65,
    description: 'Setor financeiro e bancário'
  },
  'Varejo': {
    avgScores: { presenceDigital: 72, socialMedia: 78, cultureInnovation: 50, communication: 70, transformation: 65 },
    avgFinalScore: 68,
    description: 'Setor de varejo e e-commerce'
  },
  'Saúde': {
    avgScores: { presenceDigital: 65, socialMedia: 60, cultureInnovation: 58, communication: 62, transformation: 55 },
    avgFinalScore: 60,
    description: 'Setor de saúde e pharma'
  },
  'Educação': {
    avgScores: { presenceDigital: 68, socialMedia: 65, cultureInnovation: 72, communication: 75, transformation: 60 },
    avgFinalScore: 68,
    description: 'Setor de educação e edtech'
  },
  'Industrial': {
    avgScores: { presenceDigital: 55, socialMedia: 50, cultureInnovation: 65, communication: 52, transformation: 60 },
    avgFinalScore: 57,
    description: 'Setor industrial e manufacturing'
  },
  'Serviços': {
    avgScores: { presenceDigital: 62, socialMedia: 58, cultureInnovation: 55, communication: 60, transformation: 55 },
    avgFinalScore: 58,
    description: 'Setor de serviços profissionais'
  },
  'Imobiliário': {
    avgScores: { presenceDigital: 65, socialMedia: 70, cultureInnovation: 45, communication: 62, transformation: 58 },
    avgFinalScore: 60,
    description: 'Setor imobiliário e construção'
  },
  'Alimentação': {
    avgScores: { presenceDigital: 60, socialMedia: 72, cultureInnovation: 48, communication: 65, transformation: 55 },
    avgFinalScore: 60,
    description: 'Setor de alimentação e food service'
  },
  'Automotivo': {
    avgScores: { presenceDigital: 68, socialMedia: 65, cultureInnovation: 70, communication: 65, transformation: 72 },
    avgFinalScore: 69,
    description: 'Setor automotivo'
  },
  'Telecomunicações': {
    avgScores: { presenceDigital: 72, socialMedia: 70, cultureInnovation: 65, communication: 70, transformation: 72 },
    avgFinalScore: 70,
    description: 'Setor de telecomunicações e streaming'
  },
  'Associações': {
    avgScores: { presenceDigital: 55, socialMedia: 58, cultureInnovation: 62, communication: 58, transformation: 48 },
    avgFinalScore: 56,
    description: 'Setor de associações e entidades de classe'
  },
  'Default': {
    avgScores: { presenceDigital: 60, socialMedia: 55, cultureInnovation: 55, communication: 58, transformation: 55 },
    avgFinalScore: 57,
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

async function generateBenchmark(analysis, scores, businessType, companyName) {
  const benchmark = SECTOR_BENCHMARKS[businessType] || SECTOR_BENCHMARKS['Default'];
  
  const companySize = analysis.socialMedia?.linkedin?.companySize || 
                      (analysis.socialMedia?.linkedin?.employees ? estimateCompanySize(analysis.socialMedia.linkedin.employees) : 'medium');
  
  let competitorResult = {
    competitors: [],
    productsAndServices: {},
    googleSearched: false
  };
  
  try {
    console.log('[Benchmark] Usando novo sistema de análise de concorrência...');
    const competitorAgent = new CompetitorAnalysisAgent();
    competitorResult = await competitorAgent.analyzeCompetitors(analysis.url, scores);
    
    console.log(`[Benchmark] Concorrentes encontrados: ${competitorResult.report?.competitorAnalysis?.total_encontrados || 0}`);
    console.log(`[Benchmark] Top concorrente: ${competitorResult.report?.competitorAnalysis?.top_competitor || 'N/A'}`);
  } catch (error) {
    console.error('[Benchmark] Erro no agente de concorrência, usando método antigo:', error.message);
    competitorResult = await findRelevantCompetitors(companyName, businessType, companySize, analysis.socialMedia, analysis);
  }
  
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
  
  const porteLabel = {
    'micro': 'Microempresa (1-10 funcionários)',
    'small': 'Pequena (11-50 funcionários)',
    'medium': 'Média (51-250 funcionários)',
    'large': 'Grande (251-1000 funcionários)',
    'enterprise': 'Grande Porte (1000+ funcionários)'
  };
  
  const competitorNames = competitorResult.report?.competitorAnalysis?.competitors?.slice(0, 8).map(c => c.nome) || competitorResult.competitors || [];
  
  return {
    sector: businessType,
    sectorDescription: benchmark.description,
    avgScores: benchmark.avgScores,
    avgFinalScore: benchmark.avgFinalScore,
    companyScore: scores.finalScore,
    overallGap,
    percentile,
    dimensionComparisons: comparisons,
    leaders: competitorNames,
    productsAndServices: competitorResult.report?.serviceProfile || competitorResult.productsAndServices || {},
    recommendations: generateGapRecommendations(gaps, businessType),
    companySize,
    companySizeLabel: porteLabel[companySize] || porteLabel['medium'],
    competitorsSource: 'Problem-Solution Agent',
    competitorDetails: competitorResult.report?.competitorAnalysis || null,
    serviceProfile: competitorResult.report?.serviceProfile || null
  };
}

function estimateCompanySize(employeesStr) {
  if (!employeesStr) return 'medium';
  
  const strLower = employeesStr.toLowerCase();
  
  if (strLower.includes('1-10') || strLower.includes('solo') || strLower.includes('micro')) return 'micro';
  if (strLower.includes('11-50') || strLower.includes('11-200') || strLower.includes('pequena')) return 'small';
  if (strLower.includes('51-200') || strLower.includes('201-500') || strLower.includes('média') || strLower.includes('media')) return 'medium';
  if (strLower.includes('501-1000') || strLower.includes('501-1.000') || strLower.includes('grande')) return 'large';
  if (strLower.includes('1001-') || strLower.includes('10000+') || strLower.includes('5001-') || strLower.includes('grande porte')) return 'enterprise';
  
  const cleanStr = employeesStr.replace(/[^\d]/g, '');
  const count = parseInt(cleanStr) || 0;
  
  if (count <= 10) return 'micro';
  if (count <= 50) return 'small';
  if (count <= 250) return 'medium';
  if (count <= 1000) return 'large';
  return 'enterprise';
}

function identifyBusinessType(analysis) {
  const allText = [
    analysis.title || '',
    analysis.description || '',
    ...(analysis.headings || []),
    ...(analysis.navLinks || []),
    ...(analysis.footerLinks || []),
    (analysis.mainContent || '').substring(0, 5000)
  ].join(' ').toLowerCase();

  const serviceCategories = {
    'Associação/Entidade': {
      keywords: ['associação', 'associacao', 'cdl', 'federac', 'federacao', 'sindicato', 'câmara', 'camara', 'confederação', 'conselho', 'sesi', 'senai', 'sebrae', 'fecomério', 'acsp', 'acie', 'acium', 'classe', 'empresa associado', 'representação comercial'],
      description: 'Associação ou entidade de classe'
    },
    'Restaurante': {
      keywords: ['cardápio', 'prato', 'chef', 'gastronomia', 'lanchonete', 'pizzaria', 'hamburgueria', 'bar e restaurante', 'comida caseira', 'delivery de comida', 'bufê', 'self-service', 'comida a kilo', 'restaurante'],
      description: 'Restaurante ou serviço de alimentação'
    },
    'Academia': {
      keywords: ['academia', 'musculação', 'ginástica', 'crossfit', 'spinning', 'pilates', 'yoga', 'fitness', 'fit', 'studio de pilates', 'academia de ginástica', 'fitness club'],
      description: 'Academia de ginástica ou fitness'
    },
    'Clínica Médica': {
      keywords: ['consultório médico', 'clínica médica', 'atendimento médico', 'médico', 'saúde', 'exames laboratoriais', 'laboratório', 'diagnóstico', 'atendimento clínico', 'clínica de saúde', 'hospital'],
      description: 'Clínica médica ou hospital'
    },
    'Farmácia': {
      keywords: ['farmácia', 'drogaria', 'medicamentos', 'remédios', 'manipulação', 'fitoterápicos', 'dermocosmético'],
      description: 'Farmácia ou drogaria'
    },
    'Educação': {
      keywords: ['universidade', 'faculdade', 'ensino superior', 'graduação', 'pós-graduação', 'ead', 'colégio', 'escola', 'cursinho', 'curso', 'treinamento', 'certificação'],
      description: 'Instituição de educação ou cursos'
    },
    'Advocacia': {
      keywords: ['escritório de advocacia', 'advogado', 'advocacia', 'tribunal', 'causa', 'direito', 'advocacia e consultoria', 'jurídico'],
      description: 'Escritório de advocacia'
    },
    'Contabilidade': {
      keywords: ['escritório contábil', 'contabilidade', 'sped', 'departamento fiscal', 'assessoria contábil', 'contador'],
      description: 'Escritório de contabilidade'
    },
    'Imobiliária': {
      keywords: ['imobiliária', 'venda de imóveis', 'aluguel de imóvel', 'apartamentos à venda', 'casas à venda', 'corretora de imóveis', 'imóveis para', 'incorporadora'],
      description: 'Imobiliária ou corretora de imóveis'
    },
    'Pet Shop': {
      keywords: ['pet shop', 'petz', 'petshop', 'veterinário', 'veterinária', 'banho e tosa', 'ração', 'clínica veterinária', 'pets', 'cachorro', 'gato', 'animal de estimação', 'cobasi'],
      description: 'Pet shop ou clínica veterinária'
    },
    'Beleza/Salão': {
      keywords: ['salão de beleza', 'cabelo', 'manicure', 'pedicure', 'estética', 'maquiagem', 'corte de cabelo', 'escova', 'coloração', 'tratamento capilar', 'esteticista'],
      description: 'Salão de beleza ou estética'
    },
    'Odontologia': {
      keywords: ['dentista', 'odontologia', 'implante dentário', 'tratamento odontológico', 'clínica odontológica', 'ortodontia', 'prótese dentária'],
      description: 'Clínica odontológica'
    },
    'Autos': {
      keywords: ['concessionária', 'veículos', 'automóveis', 'carros novos', 'carros usados', 'motos', 'seminovos', 'revisão', 'mecânica'],
      description: 'Concessionária ou loja de veículos'
    },
    'Construção/Reformas': {
      keywords: ['construção civil', 'reformas', 'arquitetura', 'projeto arquitetônico', 'obra', 'projetos', 'projetos e execução', 'engenharia'],
      description: 'Empresa de construção ou reformas'
    },
    'Moda/Roupas': {
      keywords: ['loja de roupas', 'moda feminina', 'moda masculina', 'boutique', 'vestuário', 'confecção', 'atacado de roupas'],
      description: 'Loja de roupas ou moda'
    },
    'Hotel/Pousada': {
      keywords: ['hotel', 'pousada', 'resort', 'hospedagem', 'reserva de quarto', 'chalé', 'hostel', 'flat', 'apart hotel'],
      description: 'Hotel, pousada ou hospedagem'
    },
    'Turismo': {
      keywords: ['agência de turismo', 'passagens aéreas', 'pacotes turísticos', 'viagens', 'turismo', 'viagens e turismo', 'excursão'],
      description: 'Agência de turismo'
    },
    'Logística': {
      keywords: ['transportadora', 'frete', 'entrega de carga', 'logística', 'mudanças', 'armazenagem', 'estoque', 'supply chain'],
      description: 'Empresa de logística ou transporte'
    },
    'Desenvolvimento de Software': {
      keywords: ['desenvolvimento de software', 'sistema personalizado', 'programação', 'dev', 'app sob medida', 'soluções tecnológicas', 'ti', 'tecnologia da informação', 'plataforma', 'software como serviço', 'criação de sistemas'],
      description: 'Desenvolvimento de software personalizado'
    },
    'Consultoria em Tecnologia': {
      keywords: ['consultoria tecnológica', 'consultoria em ti', 'estratégia digital', 'roadmap tecnológico', 'arquitetura de sistemas', 'consultoria de tecnologia'],
      description: 'Consultoria em tecnologia'
    },
    'Inteligência Artificial': {
      keywords: ['inteligência artificial', 'ia', 'machine learning', 'deep learning', 'chatbot', 'automação', 'processos automatizados', 'nlp', 'visão computacional', 'data science', 'analytics'],
      description: 'Empresa de inteligência artificial e automação'
    },
    'Marketing Digital': {
      keywords: ['marketing digital', 'tráfego pago', 'seo', 'mídia digital', 'publicidade digital', 'gestão de mídias', 'social media', 'conteúdo digital'],
      description: 'Agência de marketing digital'
    },
    'Financeiro': {
      keywords: ['banco', 'fintech', 'crédito', 'investimentos', 'finanças', 'corretora de seguros', 'seguradora', 'assessoria financeira', 'gestão de patrimônio'],
      description: 'Instituição financeira ou fintech'
    },
    'Varejo': {
      keywords: ['supermercado', 'atacarejo', 'mercadinho', 'loja física', 'autosserviço', 'hipermercado', 'atacado'],
      description: 'Varejo físico'
    },
    'E-commerce': {
      keywords: ['loja virtual', 'comprar online', 'carrinho de compras', 'e-commerce', 'compre online', 'loja online', 'marketplace'],
      description: 'Loja de e-commerce'
    },
    'Eventos': {
      keywords: ['buffet para festas', 'espaço para eventos', 'festa de casamento', 'festa deformatura', 'buffet', 'eventos e fest', 'organização de eventos'],
      description: 'Buffet ou empresa de eventos'
    },
    'Barbearia': {
      keywords: ['barbearia', 'barbeiro', 'corte masculino', 'barba', 'navalha', 'barbeiro'],
      description: 'Barbearia'
    },
    'Oficina Mecânica': {
      keywords: ['oficina mecânica', 'mecânica', 'auto mecânica', 'funilaria', 'pintura', 'revisão veicular'],
      description: 'Oficina mecânica'
    },
    'Lavanderia': {
      keywords: ['lavanderia', 'lavanderia self-service', 'lavagem de roupas', 'tinturaria', 'lavar roupas'],
      description: 'Lavanderia'
    },
    'Consultoria de Inovação': {
      keywords: ['consultoria de inovação', 'inovação tecnológica', 'transformação digital', 'estratégia de inovação', 'projetos de inovação', 'laboratório de inovação', 'open innovation', 'innovation lab', 'design thinking', 'agile', 'lean startup', 'intrapreneurship'],
      description: 'Consultoria em inovação'
    },
    'Inovação e Transformação Digital': {
      keywords: ['transformação digital', 'mudança organizacional', 'cultura de inovação', 'processos inovadores', 'nova geração', 'futuro das organizações', 'inovação aberta'],
      description: 'Inovação e transformação digital para organizações'
    },
    'Prestador de Serviços': {
      keywords: ['prestador de serviços', 'prestação de serviços', 'serviços gerais', 'atendimento', 'soluções'],
      description: 'Prestador de serviços gerais'
    }
  };

  const scores = [];
  
  const primaryCategories = {
    'Academia': ['academia', 'musculação', 'ginástica', 'crossfit', 'spinning', 'pilates', 'yoga', 'fitness'],
    'Restaurante': ['cardápio', 'restaurante', 'bufê', 'gastronomia', 'self-service'],
    'Associação/Entidade': ['associação', 'cdl', 'federac', 'sindicato', 'câmara', 'confederação', 'sebrae', 'sesi', 'senai'],
    'Clínica Médica': ['hospital', 'clínica médica', 'atendimento médico', 'médico', 'saúde'],
    'Farmácia': ['farmácia', 'drogaria', 'medicamentos', 'remédios'],
    'Pet Shop': ['pet shop', 'petshop', 'veterinário', 'clínica veterinária', 'petz', 'cobasi'],
    'Beleza/Salão': ['salão de beleza', 'manicure', 'estética', 'cabelo'],
    'Odontologia': ['dentista', 'odontologia', 'implante dentário', 'ortodontia'],
    'Advocacia': ['escritório de advocacia', 'advogado', 'advocacia', 'jurídico'],
    'Educação': ['universidade', 'faculdade', 'colégio', 'escola', 'graduação'],
    'Imobiliária': ['imobiliária', 'apartamentos à venda', 'casas à venda', 'corretora de imóveis'],
    'Autos': ['concessionária', 'veículos', 'automóveis', 'seminovos'],
    'E-commerce': ['loja virtual', 'e-commerce', 'comprar online', 'carrinho de compras'],
    'Hotel/Pousada': ['hotel', 'pousada', 'resort', 'hospedagem'],
    'Turismo': ['agência de turismo', 'pacotes turísticos', 'viagens'],
    'Logística': ['transportadora', 'frete', 'logística'],
    'Marketing Digital': ['marketing digital', 'tráfego pago', 'seo', 'mídia digital'],
    'Barbearia': ['barbearia', 'barbeiro', 'corte masculino'],
    'Lavanderia': ['lavanderia', 'lavanderia self-service'],
    'Oficina Mecânica': ['oficina mecânica', 'funilaria', 'pintura'],
    'Inteligência Artificial': ['inteligência artificial', 'ia e dados', 'machine learning', 'deep learning', 'chatbot', 'automação'],
    'Inovação e Transformação Digital': ['transformação digital', 'futuro das organizações', 'inovação', 'laboratório de inovação', 'cultura de inovação']
  };
  
  for (const [category, data] of Object.entries(serviceCategories)) {
    let matchCount = 0;
    const matchedKeywords = [];
    
    for (const keyword of data.keywords) {
      if (allText.includes(keyword)) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }
    
    if (matchCount > 0) {
      scores.push({
        category,
        score: matchCount,
        matchedKeywords,
        description: data.description,
        isPrimary: primaryCategories[category] ? true : false
      });
    }
  }

  scores.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary && a.score >= b.score - 2) return -1;
    if (b.isPrimary && !a.isPrimary && b.score >= a.score - 2) return 1;
    return b.score - a.score;
  });

  const topMatch = scores[0] || { category: 'Prestador de Serviços', score: 0, description: 'Prestador de serviços gerais', matchedKeywords: [] };

  const identifiedServices = [...new Set(topMatch.matchedKeywords.map(k => k.toLowerCase()))].slice(0, 5);
  
  console.log(`[Business] Tipo identificado: ${topMatch.category}`);
  console.log(`[Business] Descrição: ${topMatch.description}`);
  console.log(`[Business] Keywords encontradas: ${topMatch.matchedKeywords.join(', ')}`);
  console.log(`[Business] Top 3 matches:`, scores.slice(0, 3).map(s => `${s.category}(${s.score})`).join(', '));

  return {
    tipo: topMatch.category,
    score: topMatch.score,
    description: topMatch.description,
    services: identifiedServices,
    allMatches: scores.slice(0, 5),
    title: analysis.title,
    valueProposition: extractValueProposition(analysis)
  };
}

function extractValueProposition(analysis) {
  const headings = analysis.headings || [];
  const mainContent = analysis.mainContent || '';
  
  const valueKeywords = ['missão', 'visão', 'valores', 'proposta', 'solução', 'benefício', 'diferencial', 'propósito'];
  
  for (const heading of headings.slice(0, 10)) {
    const lowerHeading = heading.toLowerCase();
    for (const keyword of valueKeywords) {
      if (lowerHeading.includes(keyword)) {
        return heading;
      }
    }
  }
  
  if (analysis.description) {
    return analysis.description;
  }
  
  return headings[0] || '';
}

function analyzeProductsAndServices(analysis) {
  const businessType = identifyBusinessType(analysis);
  
  const allText = [
    ...(analysis.headings || []),
    ...(analysis.navLinks || []),
    ...(analysis.footerLinks || []),
    (analysis.mainContent || '').substring(0, 15000)
  ].join(' ').toLowerCase();

  const servicosDetectados = [];
  const serviceIndicators = [
    { servico: 'Delivery', keywords: ['delivery', 'entrega', 'ifood', 'rappi'] },
    { servico: 'Atendimento 24h', keywords: ['24 horas', '24h', 'plantão'] },
    { servico: 'Agendamento Online', keywords: ['agendamento', 'agendar', 'horário'] },
    { servico: 'Pagamento Online', keywords: ['pagamento online', 'pix', 'cartão'] },
    { servico: 'Chatbot', keywords: ['chatbot', 'atendimento automático'] },
    { servico: 'WhatsApp', keywords: ['whatsapp', 'zap'] },
    { servico: 'App Mobile', keywords: ['aplicativo', 'app mobile', 'ios', 'android'] },
    { servico: 'Automação', keywords: ['automação', 'automacao', 'rpa'] }
  ];

  for (const s of serviceIndicators) {
    for (const kw of s.keywords) {
      if (allText.includes(kw)) {
        if (!servicosDetectados.includes(s.servico)) {
          servicosDetectados.push(s.servico);
        }
        break;
      }
    }
  }

  const servicosEspecificos = extractSpecificServices(allText, businessType);
  
  const negocioInfo = getCompetitorsForServices(businessType.tipo, servicosEspecificos, allText);

  console.log(`[Products] === ANÁLISE DETALHADA DO NEGÓCIO ===`);
  console.log(`[Products] Tipo identificado: ${businessType.tipo}`);
  console.log(`[Products] Descrição: ${businessType.description}`);
  console.log(`[Products] Título do site: ${businessType.title}`);
  console.log(`[Products] Proposta de valor: ${businessType.valueProposition}`);
  console.log(`[Products] Serviços específicos detectados: ${servicosEspecificos.join(', ')}`);
  console.log(`[Products] Recursos detectados: ${servicosDetectados.join(', ')}`);
  console.log(`[Products] Concorrentes baseados nos serviços: ${negocioInfo.concorrentes.slice(0, 5).join(', ')}`);

  return {
    tipo: businessType.tipo,
    description: businessType.description,
    score: businessType.score,
    services: businessType.services,
    allMatches: businessType.allMatches,
    title: businessType.title,
    valueProposition: businessType.valueProposition,
    specificServices: servicosEspecificos,
    servicos: servicosDetectados,
    negocios: [{
      tipo: businessType.tipo,
      description: businessType.description,
      concorrentes: negocioInfo.concorrentes,
      concorrentesPrincipais: negocioInfo.principais,
      concorrentesRegionais: negocioInfo.regionais,
      concorrentesSimilares: negocioInfo.similares,
      servicosBase: negocioInfo.servicosBase
    }],
    produtos: [],
    categorias: []
  };
}

function getCompetitorsForServices(businessType, specificServices, allText) {
  const allServices = [...specificServices];
  
  const serviceBasedCompetitors = {
    'AI e Machine Learning': {
      principais: ['Accenture AI', 'IBM Watson', 'DataRobot', 'Google AI', 'Microsoft Azure AI'],
      regionais: ['Qranio', 'Stacking', 'Sensedia', 'Looqbox'],
      similares: ['Startups de IA Locais', 'Consultorias de IA']
    },
    'Análise de Dados': {
      principais: ['Tableau', 'Power BI', 'Looker', 'TIBCO'],
      regionais: ['DataStory', 'Cosmos', 'Indicium'],
      similares: ['Consultorias de BI', 'Agências de Analytics']
    },
    'Desenvolvimento Web': {
      principais: [' Accenture Digital', 'ThoughtWorks', 'DEPT Agency'],
      regionais: ['TOTVS', 'Locaweb', 'Vindi'],
      similares: ['Agências de Desenvolvimento Web Locais']
    },
    'Aplicativos': {
      principais: ['Toptal', 'Upwork', 'CleverTech'],
      regionais: ['Mobicare', 'M死角', 'AppPresser'],
      similares: ['Desenvolvedores de App Locais']
    },
    'Cloud': {
      principais: ['AWS', 'Azure', 'Google Cloud'],
      regionais: ['Locaweb', 'KingHost', 'Uol Diveo'],
      similares: ['Provedores de Cloud Locais']
    },
    'E-commerce': {
      principais: ['Shopify', 'VTEX', 'Nuvemshop', 'Tray'],
      regionais: ['E-Commerce Brasil', 'Webstore'],
      similares: ['Agências de E-commerce Locais']
    },
    'Marketing Digital': {
      principais: ['Rock Content', 'Resultados Digitais', 'Youpage'],
      regionais: ['Maudit', 'Agência FATO'],
      similares: ['Agências de Marketing Locais']
    },
    'Automação': {
      principais: ['Zapier', 'Make', 'Power Automate'],
      regionais: ['Uipath', 'Automation Anywhere'],
      similares: ['Consultorias de Automação Locais']
    }
  };

  let concorrentes = [];
  let principais = [];
  let regionais = [];
  let similares = [];

  if (specificServices.length > 0) {
    for (const servico of specificServices) {
      if (serviceBasedCompetitors[servico]) {
        const info = serviceBasedCompetitors[servico];
        concorrentes.push(...info.principais, ...info.regionais);
        principais.push(...info.principais);
        regionais.push(...info.regionais);
        similares.push(...info.similares);
      }
    }
  }

  if (concorrentes.length === 0) {
    const defaultCompetitors = {
      principais: ['Líderes de Mercado do Setor'],
      regionais: ['Concorrentes Regionais'],
      similares: ['Alternativas e Substitutos']
    };
    concorrentes = [...defaultCompetitors.principais, ...defaultCompetitors.regionais];
    principais = defaultCompetitors.principais;
    regionais = defaultCompetitors.regionais;
    similares = defaultCompetitors.similares;
  }

  const uniqueConcorrentes = [...new Set(concorrentes)].slice(0, 10);
  const uniquePrincipais = [...new Set(principais)].slice(0, 5);
  const uniqueRegionais = [...new Set(regionais)].slice(0, 5);
  const uniqueSimilares = [...new Set(similares)].slice(0, 5);

  return {
    concorrentes: uniqueConcorrentes,
    principais: uniquePrincipais,
    regionais: uniqueRegionais,
    similares: uniqueSimilares,
    servicosBase: specificServices.join(', ')
  };
}

function extractSpecificServices(text, businessType) {
  const services = [];
  
  const servicePatterns = {
    'AI e Machine Learning': ['machine learning', 'deep learning', 'ia ', 'inteligência artificial', 'chatbot', 'nlp', 'visão computacional', 'data science', 'ml'],
    'Análise de Dados': ['analytics', 'bi', 'business intelligence', 'dashboard', 'big data', 'dados', 'reporting'],
    'Automação': ['automação', 'automacao', 'rpa', 'workflow', 'processos automatizados', 'bot'],
    'Desenvolvimento Web': ['site', 'website', 'web', 'landing page', 'front-end', 'back-end', 'fullstack'],
    'Aplicativos': ['app', 'aplicativo', 'mobile', 'ios', 'android', 'react native', 'flutter'],
    'Cloud': ['cloud', 'nuvem', 'aws', 'azure', 'gcp', 'heroku', 'hosting'],
    'E-commerce': ['e-commerce', 'loja virtual', 'carrinho', 'pagamento digital', ' checkout'],
    'Marketing Digital': ['marketing digital', 'seo', 'tráfego', 'redes sociais', 'conteúdo', 'social media'],
    'Consultoria': ['consultoria', 'assessoria', 'estratégia', 'planejamento', 'roadmap'],
    'Treinamento': ['treinamento', 'capacitação', 'workshop', 'curso', 'certificação']
  };
  
  for (const [service, keywords] of Object.entries(servicePatterns)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        if (!services.includes(service)) {
          services.push(service);
        }
        break;
      }
    }
  }
  
  return services.slice(0, 6);
}

function extractRegion(url, analysis) {
  const statePatterns = {
    'SP': ['.sp.', 'sp.com.br', '/sp/', '-sp', '_sp', 'são paulo', 'sao paulo', 'campinas', 'santos', 'ribeirao', 'sao bernardo', 'guarulhos', 'osasco', 'barueri', 'jundiai', 'são josé dos campos'],
    'RJ': ['.rj.', 'rj.com.br', '/rj/', '-rj', '_rj', 'niteroi', 'niterói', 'rio de janeiro', 'nova iguacu', 'petropolis', 'belford roxo', 'duque de caxias'],
    'MG': ['.mg.', 'mg.com.br', '/mg/', '-mg', '_mg', 'belo horizonte', 'bh ', 'uberlandia', 'contagem', 'juiz de fora', 'betim', 'sete lagoas'],
    'BA': ['.ba.', 'ba.com.br', '/ba/', '-ba', '_ba', 'bahia', 'salvador', 'feira de santana', 'victoria da conquista'],
    'PE': ['.pe.', 'pe.com.br', '/pe/', '-pe', '_pe', 'pernambuco', 'recife', 'olinda', 'jaboatao', 'caruaru'],
    'PR': ['.pr.', 'pr.com.br', '/pr/', '-pr', '_pr', 'parana', 'curitiba', 'londrina', 'maringa', 'foz do iguaçu'],
    'RS': ['.rs.', 'rs.com.br', '/rs/', '-rs', '_rs', 'rio grande do sul', 'porto alegre', 'gramado', 'caxias do sul', 'pelotas'],
    'SC': ['.sc.', 'sc.com.br', '/sc/', '-sc', '_sc', 'santa catarina', 'florianopolis', 'blumenau', 'joinville', 'itajai'],
    'GO': ['.go.', 'go.com.br', '/go/', '-go', '_go', 'goias', 'goiânia', 'goiania', 'anapolis', 'rio verde'],
    'DF': ['.df.', 'df.com.br', '/df/', '-df', '_df', 'brasilia', 'brasília', 'ceilandia', 'taguatinga', 'samambaia'],
    'CE': ['.ce.', 'ce.com.br', '/ce/', '-ce', '_ce', 'ceara', 'fortaleza', 'caucaia', 'juazeiro do norte'],
    'ES': ['.es.', 'es.com.br', '/es/', '-es', '_es', 'vitoria', 'vitória', 'vila velha', 'serra', 'cariacica'],
    'PA': ['.pa.', 'pa.com.br', '/pa/', '-pa', '_pa', 'belém', 'belem', 'ananindeua', 'santarem', 'maringa'],
    'AM': ['.am.', 'am.com.br', '/am/', '-am', '_am', 'amazonas', 'manaus'],
    'PB': ['.pb.', 'pb.com.br', '/pb/', '-pb', '_pb', 'paraíba', 'paraiba', 'joão pessoa', 'joao pessoa', 'campina grande'],
    'AL': ['.al.', 'al.com.br', '/al/', '-al', '_al', 'alagoas', 'maceió', 'maceio'],
    'MA': ['.ma.', 'ma.com.br', '/ma/', '-ma', '_ma', 'maranhão', 'maranhao', 'são luis', 'sao luis', 'imperatriz'],
    'PI': ['.pi.', 'pi.com.br', '/pi/', '-pi', '_pi', 'piauí', 'piaui', 'teresina', 'parnaiba'],
    'RN': ['.rn.', 'rn.com.br', '/rn/', '-rn', '_rn', 'natal', 'mossoro', 'parnamirim', 'rio grande do norte'],
    'MT': ['.mt.', 'mt.com.br', '/mt/', '-mt', '_mt', 'cuiabá', 'cuiaba', 'rondonopolis', 'varejo'],
    'MS': ['.ms.', 'ms.com.br', '/ms/', '-ms', '_ms', 'campo grande', 'dourados', 'mato grosso do sul', 'ms', 'aquidauana', 'tres lagoas', 'corumbá', 'ponta porã'],
    'SE': ['.se.', 'se.com.br', '/se/', '-se', '_se', 'sergipe', 'aracaju'],
    'RO': ['.ro.', 'ro.com.br', '/ro/', '-ro', '_ro', 'rondônia', 'rondonia', 'porto velho', 'ji-paraná'],
    'TO': ['.to.', 'to.com.br', '/to/', '-to', '_to', 'tocantins', 'palmas', 'araguaina'],
    'AC': ['.ac.', 'ac.com.br', '/ac/', '-ac', '_ac', 'acre', 'rio branco'],
    'AP': ['.ap.', 'ap.com.br', '/ap/', '-ap', '_ap', 'amapá', 'amapa', 'macapá', 'macapa'],
    'RR': ['.rr.', 'rr.com.br', '/rr/', '-rr', '_rr', 'roraima', 'boa vista']
  };
  
  const urlLower = url.toLowerCase().replace(/https?:\/\//g, '').replace(/\//g, ' ');
  
  const allContent = [
    analysis.title || '',
    analysis.description || '',
    (analysis.footerLinks || []).join(' '),
    (analysis.navLinks || []).join(' ')
  ].join(' ').toLowerCase();
  
  const textContent = allContent;
  
  const matches = [];
  
  for (const [state, patterns] of Object.entries(statePatterns)) {
    for (const pattern of patterns) {
      let regex;
      if (pattern.length <= 2) {
        regex = new RegExp('\\b' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      } else {
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
      if (regex.test(textContent)) {
        matches.push({ state, pattern, length: pattern.length });
      }
    }
  }
  
  if (matches.length > 0) {
    matches.sort((a, b) => b.length - a.length);
    console.log(`[Region] Match encontrado: ${matches[0].pattern} -> ${matches[0].state}`);
    return matches[0].state;
  }
  
  return null;
}

function findCompetitorsByProductsAndServices(productsAndServices, companyName, url, analysis) {
  const region = extractRegion(url, analysis);
  const competitors = new Set();
  
  const regionalCompetitors = {
    'SP': {
      'Restaurante': ['Bar do Luiz', 'Restaurante Fasano', 'Coco Bambu', 'Fogo de Chão', 'Outback SP', 'Mariantoni'],
      'Academia': ['Academia Competition', 'Bio Ritmo', 'Smart Fit', 'Gold\'s Gym', 'Blue Fit', 'Power Fit'],
      'Clínica Médica': ['Hospital Sirio-Libanes', 'Hospital Albert Einstein', 'Fleury', 'Sabin', 'A+'],
      'Farmácia': ['Drogaria São Paulo', 'Drogarias Extra', 'Drogasil', 'Raia Drogasil'],
      'Educação': ['Colégio Bandeirantes', 'Colégio Santa Cruz', 'FIA', 'ESPM'],
      'Advocacia': ['TozziniFreire', 'Mattos Filho', 'Pinheiro Neto', 'Levy & Partners'],
      'Contabilidade': ['Contabilizei', 'Contabilidade App', 'Confere'],
      'Imobiliária': ['Lopes', 'Viva Real', 'Zap Imóveis', 'Fernando Simões'],
      'Pet Shop': ['Petz', 'Cobasi', 'Pet Center Marginal', 'Petland'],
      'Beleza/Salão': ['Salão Anaís', 'Espaço VIP Beauty', 'Studio W', 'Instituto de Beleza'],
      'Odontologia': ['Orthodontic', 'Sorriden', 'CIO', 'Dental ODONTO'],
      'Associação/Entidade': ['ACSP', 'CDL São Paulo', 'FECOMÉRCIO SP', 'ACIESP']
    },
    'RJ': {
      'Restaurante': ['Bar do Flamengo', 'Marius', 'Saturnino', 'Porão', 'Zuka'],
      'Academia': ['Smart Fit', 'Bio Ritmo', 'Academia Corp', 'Blue Fit'],
      'Clínica Médica': ['Hospital Copa D\'Or', 'Hospital Samaritano', 'Lavoisier'],
      'Farmácia': ['Drogaria Venancio', 'Drogarias Extra', 'Drogasil'],
      'Associação/Entidade': ['ACERJ', 'CDL Rio', 'FECOMÉRCIO RJ', 'Sebrae RJ']
    },
    'MG': {
      'Restaurante': ['Belo Traira', 'O Pascoal', 'Manteiga', 'Café de La Paix'],
      'Academia': ['Smart Fit', 'Bio Ritmo', 'Academia Body Tech', 'Blue Fit'],
      'Clínica Médica': ['Hospital Mater Dei', 'Felippo', 'Hermes Pardini'],
      'Farmácia': ['Drogaria Araujo', 'Drogaria São Paulo', 'Ultrafarma'],
      'Associação/Entidade': ['ACD', 'CDL BH', 'FECOMÉRCIO MG', 'Sebrae MG', 'ACI BH']
    },
    'PR': {
      'Restaurante': ['Madalosso', 'Bamboo', 'Capo Restô', 'Verdi'],
      'Academia': ['Smart Fit', 'Bio Ritmo', 'Academia Winner'],
      'Farmácia': ['Drogaria São Paulo', 'Drogarias Extra'],
      'Associação/Entidade': ['ACP', 'CDL Curitiba', 'FECOMÉRCIO PR', 'Sebrae PR']
    },
    'RS': {
      'Restaurante': ['Café do Mercadinho', 'Bar do Centro', 'Restaurante Gallo'],
      'Academia': ['Smart Fit', 'Bio Ritmo', 'Academia Shape'],
      'Associação/Entidade': ['ACDIG', 'CDL POA', 'FECOMÉRCIO RS', 'Sebrae RS']
    },
    'SC': {
      'Restaurante': ['Restaurante给你的', 'Casarão', 'Empório Santa Maria'],
      'Academia': ['Smart Fit', 'Blue Fit', 'Bio Ritmo'],
      'Associação/Entidade': ['ACAT', 'CDL Florianópolis', 'FECOMÉRCIO SC', 'Sebrae SC']
    },
    'BA': {
      'Restaurante': ['Restaurante São Jorge', 'Casarão', 'Dona Ju'],
      'Farmácia': ['Drogaria Araujo', 'Drogaria São Paulo'],
      'Associação/Entidade': ['ACB', 'CDL Salvador', 'FECOMÉRCIO BA', 'Sebrae BA']
    },
    'PE': {
      'Restaurante': ['Restaurante Leite', 'Bargaço', 'Beco do Frade'],
      'Associação/Entidade': ['ACP', 'CDL Recife', 'FECOMÉRCIO PE', 'Sebrae PE']
    },
    'CE': {
      'Restaurante': ['Restaurante Mumba', 'Café Santa Clara', 'Mário Lúdio'],
      'Associação/Entidade': ['ACB', 'CDL Fortaleza', 'FECOMÉRCIO CE', 'Sebrae CE']
    },
    'GO': {
      'Restaurante': ['Beco das Quituteiras', 'Restaurante da Júlia'],
      'Associação/Entidade': ['ACG', 'CDL Goiânia', 'FECOMÉRCIO GO', 'Sebrae GO']
    },
    'DF': {
      'Restaurante': ['KIKU', 'Tordesilhas', 'Cá com Fome'],
      'Associação/Entidade': ['ACDF', 'CDL Brasília', 'FECOMÉRCIO DF', 'Sebrae DF']
    }
  };
  
  const businessType = productsAndServices.tipo || 'Geral';
  
  if (region && regionalCompetitors[region] && regionalCompetitors[region][businessType]) {
    regionalCompetitors[region][businessType].forEach(c => competitors.add(c));
  }
  
  if (productsAndServices.negocios && productsAndServices.negocios.length > 0) {
    for (const negocio of productsAndServices.negocios) {
      if (negocio.concorrentes) {
        negocio.concorrentes.forEach(c => competitors.add(c));
      }
    }
  }

  let competitorsList = Array.from(competitors);

  if (companyName) {
    const nameLower = companyName.toLowerCase();
    const cleanName = nameLower.replace(/[^a-záàâãéèêíìîóòôõúùûç0-9\s]/g, '').trim().replace(/\s+/g, '');
    const nameParts = cleanName.split(/\s+/).filter(p => p.length > 2);
    
    competitorsList = competitorsList.filter(c => {
      const cLower = c.toLowerCase();
      const cClean = cLower.replace(/[^a-záàâãéèêíìîóòôõúùûç0-9\s]/g, '').trim().replace(/\s+/g, '');
      
      if (cLower.includes(nameLower) || nameLower.includes(cLower)) return false;
      if (cleanName.includes(cClean) || cClean.includes(cleanName)) return false;
      if (cleanName === cClean) return false;
      
      for (const part of nameParts) {
        if (cClean.includes(part) && part.length > 3) return false;
      }
      
      return true;
    });
  }

  console.log(`[Competitors] Concorrentes: ${competitorsList.join(', ')}`);

  return competitorsList;
}

async function findRelevantCompetitors(companyName, businessType, companySize, socialMedia, analysis) {
  const url = analysis.url || '';
  const productsAndServices = analyzeProductsAndServices(analysis);
  const region = extractRegion(url, analysis);
  
  console.log(`[Competitors] === INICIANDO ANÁLISE DE CONCORRENTES ===`);
  console.log(`[Competitors] Empresa: ${companyName}`);
  console.log(`[Competitors] Tipo de negócio identificado: ${productsAndServices.tipo}`);
  console.log(`[Competitors] Descrição: ${productsAndServices.description}`);
  console.log(`[Competitors] Serviços específicos detectados: ${productsAndServices.specificServices.join(', ')}`);
  console.log(`[Competitors] Região: ${region || 'N/I'}`);
  
  const localCompetitors = findCompetitorsByProductsAndServices(productsAndServices, companyName, url, analysis);
  
  const allCompetitors = [...new Set([...localCompetitors])];
  
  const competitorsList = allCompetitors.filter(c => {
    const cLower = c.toLowerCase();
    const nameLower = companyName.toLowerCase();
    const cleanName = nameLower.replace(/[^a-záàâãéèêíìîóòôõúùûç0-9\s]/g, '').trim();
    
    if (cLower.includes(nameLower) || nameLower.includes(cLower)) return false;
    if (cleanName.includes(cLower.replace(/\s+/g, '')) && cleanName.length > 3) return false;
    
    return true;
  }).slice(0, 8);
  
  console.log(`[Competitors] === CONCORRENTES IDENTIFICADOS ===`);
  console.log(`[Competitors] Baseado em: ${productsAndServices.tipo} - ${productsAndServices.description}`);
  console.log(`[Competitors] Lista: ${competitorsList.join(', ')}`);

  return {
    competitors: competitorsList,
    productsAndServices: productsAndServices,
    googleSearched: false,
    businessDescription: `${productsAndServices.tipo}: ${productsAndServices.description}`
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
  if (!homepageHtml || typeof homepageHtml !== 'string') {
    return {};
  }
  
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
  if (!html || typeof html !== 'string') {
    return { pageType: 'outras', path, wordCount: 0 };
  }
  
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
    const pageText = $('body').text().trim();
    
    const isBlocked = /access denied|acesso bloqueado|verifique|CAPTCHA/i.test(pageText);
    
    const followersMatch = pageText.match(/([\d.,]+)\s*(?:seguidores|followers)/i) || 
                          pageText.match(/(\d+[\d.,]*)\s*followers/i);
    
    const employeesMatch = pageText.match(/(\d+[\d.,]*)\s*(?:funcionários|employees)/i);
    
    const industryMatch = pageText.match(/Setor[:\s]+([^\n<]+)/i) || 
                         pageText.match(/Industry[:\s]+([^\n<]+)/i);
    
    const sizeMatch = pageText.match(/Número de funcionários[:\s]+([^\n<]+)/i) ||
                     pageText.match(/Company size[:\s]+([^\n<]+)/i);
    
    const aboutMatch = $('section[id="about"]').text().trim() ||
                      $('p[data-test-id="about-us-description"]').text().trim() ||
                      $('meta[name="description"]').attr('content') || '';
    
    const hasAboutSection = aboutMatch.length > 50;
    const hasPosts = /publicações|posts|updates/i.test(pageText);
    
    return {
      url,
      found: true,
      blocked: isBlocked,
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
    const pageText = $('body').text().trim();
    
    const isBlocked = /access denied|acesso bloqueado|CAPTCHA/i.test(pageText);
    
    const followersMatch = html.match(/"edge_followed_by":\s*\{"count":\s*(\d+)/) ||
                          html.match(/"followers":\s*(\d+)/);
    
    const postsMatch = html.match(/"edge_owner_to_timeline_media":\s*\{"count":\s*(\d+)/) ||
                       html.match(/"media_count":\s*(\d+)/);
    
    const followingMatch = html.match(/"edge_follow":\s*\{"count":\s*(\d+)/);
    
    const fullName = $('meta[property="og:title"]').attr('content') ||
                   $('title').text().trim().replace(/.*\//, '').replace(/\s*\(.*\)/, '');
    
    const bioMatch = $('meta[name="description"]').attr('content')?.replace(/.*Instagram:?\s*/i, '').trim() ||
                    html.match(/"biography":"([^"]+)"/);
    
    return {
      url,
      found: true,
      blocked: isBlocked,
      followers: followersMatch ? parseInt(followersMatch[1]).toLocaleString() : null,
      posts: postsMatch ? postsMatch[1] : null,
      following: followingMatch ? followingMatch[1] : null,
      name: fullName?.length > 0 ? fullName : null,
      bio: bioMatch ? (typeof bioMatch === 'string' ? bioMatch : bioMatch[1]).replace(/\\n/g, ' ').substring(0, 300) : null,
    };
  }

  async function fetchFacebook(url) {
    if (!url) return null;
    const html = await fetchSite(url, 10000);
    if (!html) return null;
    
    const $ = cheerio.load(html);
    const pageText = $('body').text().trim();
    
    const isBlocked = /access denied|acesso bloqueado|CAPTCHA/i.test(pageText);
    
    const likesMatch = html.match(/"page_liked":\s*(\d+)/) ||
                     html.match(/(\d+[\d.,]*)\s*(?:curtidas|likes)/i) ||
                     html.match(/"like_count":\s*(\d+)/);
    
    const talkingMatch = html.match(/(\d+[\d.,]*)\s*(?:falando sobre isso|talking about)/i) ||
                        html.match(/"talk_about_count":\s*(\d+)/);
    
    const pageName = $('meta[property="og:title"]').attr('content') ||
                    $('title').text().trim().replace(/.*\//, '').replace(/\s*-\s*Facebook.*/i, '');
    
    const aboutMatch = $('meta[name="description"]').attr('content')?.substring(0, 300) ||
                      html.match(/"about":"([^"]+)"/);
    
    const categoryMatch = html.match(/"category":"([^"]+)"/);
    
    return {
      url,
      found: true,
      blocked: isBlocked,
      likes: likesMatch ? parseInt(likesMatch[1]).toLocaleString() : null,
      talkingAbout: talkingMatch ? talkingMatch[1] : null,
      name: pageName?.length > 0 ? pageName : null,
      about: aboutMatch ? (typeof aboutMatch === 'string' ? aboutMatch : aboutMatch[1]).replace(/\\n/g, ' ').substring(0, 300) : null,
      category: categoryMatch ? categoryMatch[1] : null,
    };
  }

  async function fetchYouTube(url) {
    if (!url) return null;
    const html = await fetchSite(url, 10000);
    if (!html) return null;
    
    const $ = cheerio.load(html);
    const pageText = $('body').text().trim();
    
    const isBlocked = /access denied|acesso bloqueado|CAPTCHA/i.test(pageText);
    
    const subscribersMatch = html.match(/"subscriberCountText":\s*\{"runs":\s*\[\{"text":\s*"([^"]+)"/) ||
                          html.match(/(\d+[\d.,]*[KMB]?)\s*(?:inscritos|subscribers)/i) ||
                          html.match(/"subscribers":"([^"]+)"/);
    
    const videosMatch = html.match(/"videoCountText":\s*\{"runs":\s*\[\{"text":\s*"([^"]+)"/) ||
                        html.match(/(\d+)\s*(?:vídeos|videos)/i);
    
    const channelName = $('meta[property="og:title"]').attr('content')?.replace(/\s*-\s*YouTube.*/i, '') ||
                       $('title').text().trim().replace(/\s*-\s*YouTube.*/i, '');
    
    const descriptionMatch = $('meta[name="description"]').attr('content');
    
    const viewCountMatch = html.match(/(\d+[\d.,]*)\s*(?:visualizações|views)/i);
    
    return {
      url,
      found: true,
      blocked: isBlocked,
      subscribers: subscribersMatch ? subscribersMatch[1] : null,
      videos: videosMatch ? videosMatch[1] : null,
      channelName: channelName?.length > 0 ? channelName : null,
      description: descriptionMatch ? descriptionMatch.substring(0, 300) : null,
      viewCount: viewCountMatch ? viewCountMatch[1] : null,
    };
  }

  async function fetchTwitter(url) {
    if (!url) return null;
    const html = await fetchSite(url, 10000);
    if (!html) return null;
    
    const $ = cheerio.load(html);
    const pageText = $('body').text().trim();
    
    const isBlocked = /access denied|acesso bloqueado|CAPTCHA/i.test(pageText);
    
    const followersMatch = html.match(/"followers_count":\s*(\d+)/) ||
                         html.match(/(\d+[\d.,]*)\s*(?:seguidores|followers)/i);
    
    const followingMatch = html.match(/"following_count":\s*(\d+)/) ||
                         html.match(/(\d+)\s*(?:seguindo|following)/i);
    
    const tweetsMatch = html.match(/"statuses_count":\s*(\d+)/) ||
                       html.match(/(\d+)\s*(?:tweets|posts)/i);
    
    const accountName = $('meta[property="og:title"]').attr('content')?.replace(/\s*\(.*\)\s*\|\s*X$/, '').replace(/\s*@\w+\s*-\s*X$/, '') ||
                      $('title').text().trim().replace(/.*@/, '').replace(/\s*\(.*\)\s*\|\s*X$/, '');
    
    const bioMatch = $('meta[name="description"]').attr('content');
    
    return {
      url,
      found: true,
      blocked: isBlocked,
      followers: followersMatch ? parseInt(followersMatch[1]).toLocaleString() : null,
      following: followingMatch ? followingMatch[1] : null,
      tweets: tweetsMatch ? tweetsMatch[1] : null,
      name: accountName?.length > 0 ? accountName : null,
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
  if (!html || typeof html !== 'string') {
    throw new Error('Não foi possível obter o conteúdo do site');
  }
  
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

async function analyzeSite(url, llmConfig = null, progressCallback = null) {
  console.log(`Iniciando análise de: ${url}`);
  
  const updateStep = (step, status, message) => {
    if (progressCallback?.updateStep) {
      progressCallback.updateStep(step, status, message);
    }
  };

  updateStep(1, 'done', 'Site encontrado');
  
  const html = await fetchSite(url);
  const companyName = extractCompanyName(url);
  
  updateStep(2, 'done', 'Conteúdo analisado');
  
  console.log(`Analisando site de: ${companyName}`);
  const analysis = analyzeSiteContent(html, url);
  
  updateStep(3, 'done', 'Páginas raspadas');
  
  console.log(`Raspando páginas internas...`);
  const internalPages = await scrapeInternalPages(url, html);
  analysis.internalPages = internalPages;
  
  if (Object.keys(internalPages).length > 0) {
    console.log(`Páginas internas analisadas: ${Object.keys(internalPages).length}`);
  }
  
  updateStep(4, 'done', 'Redes sociais analisadas');
  
  console.log(`Analisando redes sociais...`);
  const companySlug = extractCompanySlug(url);
  const socialMedia = await analyzeSocialMedia(analysis.socialLinks, companySlug);
  analysis.socialMedia = socialMedia;
  
  const activeSocials = socialMedia.summary?.activeProfiles || 0;
  console.log(`Redes sociais ativas encontradas: ${activeSocials}`);
  
  updateStep(5, 'done', 'Negócio identificado');
  
  console.log(`Analisando tipo de negócio e gerando benchmark...`);
  const businessType = identifyBusinessType(analysis);
  console.log(`Tipo de negócio identificado: ${businessType.tipo}`);
  console.log(`Descrição: ${businessType.description}`);
  analysis.businessType = businessType.tipo;
  
  if (llmConfig && llmConfig.apiKey) {
    console.log(`Usando LLM (${llmConfig.provider}) para análise avançada...`);
    updateStep(6, 'done', 'Scores calculados');
    const llmResult = await analyzeWithLLM(analysis, llmConfig);
    llmResult.using_llm = true;
    llmResult.provider = llmConfig.provider.toUpperCase();
    
    const scores = llmResult.scores || { finalScore: 50, presenceDigital: 50, socialMedia: 50, cultureInnovation: 50, communication: 50, transformation: 50 };
    llmResult.benchmark = await generateBenchmark(analysis, scores, businessType.tipo, companyName);
    llmResult.segmento = businessType.tipo;
    
    return {
      analysis,
      llmResult,
      html: generateHTMLReport(llmResult, analysis),
    };
  }
  
  console.log('Usando análise baseada em regras...');
  const { calculateScores, getForcesAndGaps, getMainFindings, getRecommendations, getMaturityLevel } = require('./scoringRules');
  
  updateStep(6, 'done', 'Scores calculados');
  
  const scores = calculateScores(analysis);
  const { forces, gaps } = getForcesAndGaps(analysis, scores);
  const findings = getMainFindings(analysis, scores);
  const recommendations = getRecommendations(scores);
  const maturity = getMaturityLevel(scores.finalScore);
  const benchmark = await generateBenchmark(analysis, scores, businessType.tipo, companyName);
  
  const result = {
    empresa: companyName,
    segmento: businessType.tipo,
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
        .email-btn { display: inline-block; background: var(--success); color: white; padding: 10px 25px; border-radius: 25px; text-decoration: none; font-weight: 600; margin-top: 15px; cursor: pointer; border: none; font-size: 0.95rem; }
        .email-btn:hover { background: #228b75; }
        .email-btn:disabled { background: #6c757d; cursor: not-allowed; }
        .email-status { margin-top: 10px; text-align: center; font-size: 0.95rem; }
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
        <br><br>
        <div id="emailForm" style="margin-top: 15px;">
            <input type="email" id="emailInput" placeholder="Digite seu email para receber o relatório" style="padding: 12px 20px; border: 2px solid rgba(255,255,255,0.3); border-radius: 25px; font-size: 0.95rem; width: 300px; background: rgba(255,255,255,0.9); color: #333;">
            <button class="email-btn" onclick="sendReport()" id="sendBtn">📧 Enviar PDF por Email</button>
        </div>
        <div id="emailStatus" style="margin-top: 10px; font-size: 0.95rem;"></div>
    </header>
    
    <script>
        async function sendReport() {
            const email = document.getElementById('emailInput').value;
            const status = document.getElementById('emailStatus');
            const btn = document.getElementById('sendBtn');
            
            if (!email || !email.includes('@')) {
                status.textContent = 'Email inválido';
                status.style.color = '#e76f51';
                return;
            }
            
            btn.disabled = true;
            btn.textContent = 'Enviando...';
            status.textContent = 'Gerando PDF e enviando...';
            status.style.color = '#fff';
            
            try {
                const apiUrl = window.location.origin.includes('render') 
                    ? window.location.origin + '/api/send-email' 
                    : '/api/send-email';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        reportHtml: document.documentElement.outerHTML,
                        companyName: '${result.empresa}'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    status.textContent = 'Email enviado com sucesso! Verifique sua caixa de entrada.';
                    status.style.color = '#2a9d8f';
                    btn.textContent = 'Enviado!';
                } else {
                    status.textContent = 'Erro: ' + (data.details || data.error || 'Tente novamente');
                    status.style.color = '#e76f51';
                    btn.disabled = false;
                    btn.textContent = '📧 Enviar PDF por Email';
                }
            } catch (e) {
                status.textContent = 'Erro de conexão';
                status.style.color = '#e76f51';
                btn.disabled = false;
                btn.textContent = '📧 Enviar PDF por Email';
            }
        }
    </script>

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
                <tr><th>Tipo de Negócio</th><td>${result.segmento || 'A ser definido'}</td></tr>
                <tr><th>Porte</th><td>${result.benchmark?.companySizeLabel || result.porte || 'Não identificado'}</td></tr>
                <tr><th>URL</th><td>${analysis.url}</td></tr>
                <tr><th>Título do Site</th><td>${analysis.title}</td></tr>
                <tr><th>Segurança HTTPS</th><td>${analysis.hasHttps ? '✓ Ativo' : '✗ Inativo'}</td></tr>
            </table>
        </section>

        ${analysis.socialMedia && (analysis.socialMedia.linkedin || analysis.socialMedia.instagram || analysis.socialMedia.youtube || analysis.socialMedia.facebook || analysis.socialMedia.twitter) ? `
        <section class="card">
            <h2>Redes Sociais Analisadas</h2>
            <p style="margin-bottom: 15px; color: var(--gray);">Perfis encontrados no site: <strong>${analysis.socialMedia.summary?.activeProfiles || 0}</strong></p>
            <div class="social-grid">
                ${analysis.socialMedia.linkedin ? `
                    <div class="social-item linkedin ${analysis.socialMedia.linkedin.blocked && !analysis.socialMedia.linkedin.followers ? 'inactive' : ''}">
                        <div class="social-icon">🔗</div>
                        <div class="social-name">LinkedIn</div>
                        ${analysis.socialMedia.linkedin.followers ? `
                            <div class="social-stat">${analysis.socialMedia.linkedin.followers}</div>
                            <div class="social-label">seguidores</div>
                            ${analysis.socialMedia.linkedin.employees ? `<div style="margin-top: 5px; font-size: 0.8rem; color: var(--gray);">${analysis.socialMedia.linkedin.employees} funcionários</div>` : ''}
                        ` : `
                            <div style="color: var(--gray); font-size: 0.85rem; margin-top: 5px;">Sem dados</div>
                        `}
                    </div>
                ` : ''}
                ${analysis.socialMedia.instagram ? `
                    <div class="social-item instagram ${analysis.socialMedia.instagram.blocked && !analysis.socialMedia.instagram.followers ? 'inactive' : ''}">
                        <div class="social-icon">📸</div>
                        <div class="social-name">Instagram</div>
                        ${analysis.socialMedia.instagram.followers ? `
                            <div class="social-stat">${analysis.socialMedia.instagram.followers}</div>
                            <div class="social-label">seguidores</div>
                            ${analysis.socialMedia.instagram.posts ? `<div style="margin-top: 5px; font-size: 0.8rem; color: var(--gray);">${analysis.socialMedia.instagram.posts} posts</div>` : ''}
                        ` : `
                            <div style="color: var(--gray); font-size: 0.85rem; margin-top: 5px;">Sem dados</div>
                        `}
                    </div>
                ` : ''}
                ${analysis.socialMedia.youtube ? `
                    <div class="social-item youtube ${analysis.socialMedia.youtube.blocked && !analysis.socialMedia.youtube.subscribers ? 'inactive' : ''}">
                        <div class="social-icon">▶️</div>
                        <div class="social-name">YouTube</div>
                        ${analysis.socialMedia.youtube.subscribers ? `
                            <div class="social-stat">${analysis.socialMedia.youtube.subscribers}</div>
                            <div class="social-label">inscritos</div>
                            ${analysis.socialMedia.youtube.videos ? `<div style="margin-top: 5px; font-size: 0.8rem; color: var(--gray);">${analysis.socialMedia.youtube.videos} vídeos</div>` : ''}
                        ` : `
                            <div style="color: var(--gray); font-size: 0.85rem; margin-top: 5px;">Sem dados</div>
                        `}
                    </div>
                ` : ''}
                ${analysis.socialMedia.facebook ? `
                    <div class="social-item facebook ${analysis.socialMedia.facebook.blocked && !analysis.socialMedia.facebook.likes ? 'inactive' : ''}">
                        <div class="social-icon">👍</div>
                        <div class="social-name">Facebook</div>
                        ${analysis.socialMedia.facebook.likes ? `
                            <div class="social-stat">${analysis.socialMedia.facebook.likes}</div>
                            <div class="social-label">curtidas</div>
                        ` : `
                            <div style="color: var(--gray); font-size: 0.85rem; margin-top: 5px;">Sem dados</div>
                        `}
                    </div>
                ` : ''}
                ${analysis.socialMedia.twitter ? `
                    <div class="social-item twitter ${analysis.socialMedia.twitter.blocked && !analysis.socialMedia.twitter.followers ? 'inactive' : ''}">
                        <div class="social-icon">🐦</div>
                        <div class="social-name">Twitter/X</div>
                        ${analysis.socialMedia.twitter.followers ? `
                            <div class="social-stat">${analysis.socialMedia.twitter.followers}</div>
                            <div class="social-label">seguidores</div>
                        ` : `
                            <div style="color: var(--gray); font-size: 0.85rem; margin-top: 5px;">Sem dados</div>
                        `}
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
            ${result.benchmark.serviceProfile && result.benchmark.serviceProfile.problema_principal ? `
            <div style="margin-top: 20px; padding: 15px; background: var(--light); border-radius: 8px;">
                <h4 style="color: var(--primary); margin-bottom: 10px;">Perfil do Negócio Identificado</h4>
                <div style="font-size: 0.9rem;">
                    <p><strong>Problema Principal:</strong> ${result.benchmark.serviceProfile.problema_principal.name || result.benchmark.serviceProfile.problema_principal.categoria}</p>
                    ${result.benchmark.serviceProfile.publico_alvo && result.benchmark.serviceProfile.publico_alvo.length > 0 ? `<p><strong>Público-alvo:</strong> ${result.benchmark.serviceProfile.publico_alvo.join(', ')}</p>` : ''}
                    ${result.benchmark.serviceProfile.tecnologias && result.benchmark.serviceProfile.tecnologias.length > 0 ? `<p><strong>Tecnologias:</strong> ${result.benchmark.serviceProfile.tecnologias.slice(0, 5).join(', ')}</p>` : ''}
                    <p style="color: var(--gray); font-size: 0.8rem;">Confiança do perfil: ${result.benchmark.serviceProfile.score_confianca || 0}%</p>
                </div>
            </div>
            ` : ''}
            ${result.benchmark.productsAndServices && result.benchmark.productsAndServices.negocios && result.benchmark.productsAndServices.negocios.length > 0 ? `
            <div style="margin-top: 20px; padding: 15px; background: var(--light); border-radius: 8px;">
                <h4 style="color: var(--primary); margin-bottom: 10px;">Negócios e Concorrentes Identificados</h4>
                ${result.benchmark.productsAndServices.negocios.map(n => `
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #ddd;">
                    <strong style="color: var(--secondary);">${n.tipo}:</strong>
                    <div style="margin-top: 5px; font-size: 0.85rem; color: var(--gray);">
                        <strong>Concorrentes:</strong> ${n.concorrentes.join(', ')}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
            ${result.benchmark.productsAndServices && (result.benchmark.productsAndServices.produtos.length > 0 || result.benchmark.productsAndServices.servicos.length > 0) ? `
            <div style="margin-top: 15px; padding: 12px; background: var(--light); border-radius: 8px;">
                <p style="font-size: 0.85rem; color: var(--gray); margin-bottom: 5px;"><strong>Tecnologias/Serviços identificados:</strong></p>
                ${result.benchmark.productsAndServices.servicos.length > 0 ? `<span style="font-size: 0.8rem; color: var(--gray);">${result.benchmark.productsAndServices.servicos.join(', ')}</span>` : ''}
                ${result.benchmark.productsAndServices.produtos.length > 0 ? `<span style="font-size: 0.8rem; color: var(--gray); margin-left: 10px;">${result.benchmark.productsAndServices.produtos.join(', ')}</span>` : ''}
            </div>
            ` : ''}
            ${result.benchmark.leaders && result.benchmark.leaders.length > 0 ? `
            <div style="margin-top: 20px;">
                <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 10px;">Concorrentes identificados:</p>
                <div class="leader-list">
                    ${result.benchmark.leaders.map(l => `<span class="leader-tag" title="Concorrente identificado pelo sistema Problem-Solution">${l}</span>`).join('')}
                </div>
                <p style="color: var(--gray); font-size: 0.75rem; margin-top: 8px;">Fonte: Análise baseada nos serviços reais da empresa</p>
            </div>
            ` : ''}
            ${result.benchmark.recommendations && result.benchmark.recommendations.length > 0 ? `
            <div style="margin-top: 20px; padding: 15px; background: var(--light); border-radius: 8px;">
                <h4 style="color: var(--primary); margin-bottom: 10px;">Prioridades para Catch-up Setorial</h4>
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
