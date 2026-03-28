class CompetitorFinder {
  constructor(config = {}) {
    this.problemsDb = config.problemsDb;
    this.internalDb = config.internalDb;
  }

  async findCompetitors(serviceProfile) {
    console.log('[CompetitorFinder] Buscando concorrentes...');
    console.log(`[CompetitorFinder] Problema principal: ${serviceProfile.problema_principal?.categoria}`);
    
    const candidates = [];
    
    const internalMatches = this.findInInternalDb(serviceProfile);
    candidates.push(...internalMatches);
    console.log(`[CompetitorFinder] Encontrados ${internalMatches.length} no database interno`);
    
    const categoryMatches = this.findByCategory(serviceProfile);
    candidates.push(...categoryMatches);
    console.log(`[CompetitorFinder] Encontrados ${categoryMatches.length} por categoria`);
    
    const techMatches = this.findByTechnologies(serviceProfile);
    candidates.push(...techMatches);
    console.log(`[CompetitorFinder] Encontrados ${techMatches.length} por tecnologia`);
    
    const subcategoryMatches = this.findBySubcategory(serviceProfile);
    candidates.push(...subcategoryMatches);
    console.log(`[CompetitorFinder] Encontrados ${subcategoryMatches.length} por subcategoria`);
    
    const uniqueCandidates = this.deduplicateAndMerge(candidates);
    
    console.log(`[CompetitorFinder] Total de candidatos únicos: ${uniqueCandidates.length}`);
    
    return uniqueCandidates
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
  }

  findInInternalDb(profile) {
    if (!this.internalDb?.competitors) return [];
    
    const matches = [];
    const primaryProblem = profile.problema_principal?.categoria;
    const subcategories = profile.subcategorias?.map(s => s.subcategoria) || [];
    
    for (const competitor of this.internalDb.competitors) {
      let relevanceScore = 0;
      const matchReasons = [];
      
      if (competitor.problemas?.includes(primaryProblem)) {
        relevanceScore += 50;
        matchReasons.push(`Problema: ${primaryProblem}`);
      }
      
      for (const subcat of subcategories) {
        if (competitor.subcategorias?.includes(subcat)) {
          relevanceScore += 20;
          matchReasons.push(`Subcategoria: ${subcat}`);
        }
      }
      
      const techIntersection = competitor.tecnologias?.filter(
        t => profile.tecnologias?.map(te => te.toLowerCase()).includes(t.toLowerCase())
      );
      if (techIntersection?.length > 0) {
        relevanceScore += techIntersection.length * 10;
        matchReasons.push(`Tech: ${techIntersection.slice(0, 3).join(', ')}`);
      }
      
      const audienceIntersection = competitor.publico_alvo?.filter(
        p => profile.publico_alvo?.map(a => a.toLowerCase()).includes(p.toLowerCase())
      );
      if (audienceIntersection?.length > 0) {
        relevanceScore += audienceIntersection.length * 15;
        matchReasons.push(`Público: ${audienceIntersection.slice(0, 2).join(', ')}`);
      }
      
      if (relevanceScore > 0) {
        matches.push({
          nome: competitor.nome,
          url: competitor.url,
          source: 'internal_db',
          relevanceScore,
          matchReasons,
          profile: competitor
        });
      }
    }
    
    return matches;
  }

  findByCategory(profile) {
    if (!this.problemsDb?.problems || !profile.problema_principal?.categoria) return [];
    
    const primaryProblem = profile.problema_principal.categoria;
    const problemData = this.problemsDb.problems[primaryProblem];
    
    if (!problemData?.competitors) return [];
    
    return problemData.competitors.map(name => ({
      nome: name,
      source: 'category',
      relevanceScore: 40,
      matchReasons: [`Categoria: ${problemData.name}`],
      profile: {
        problema_principal: { categoria: primaryProblem },
        name: problemData.name,
        description: problemData.description
      }
    }));
  }

  findBySubcategory(profile) {
    if (!this.problemsDb?.problems || !profile.subcategorias?.length) return [];
    
    const matches = [];
    
    for (const subcat of profile.subcategorias) {
      const problemData = this.problemsDb.problems[profile.problema_principal?.categoria];
      if (!problemData?.subcategories?.[subcat.subcategoria]) continue;
      
      const subcatData = problemData.subcategories[subcat.subcategoria];
      if (subcatData?.competitors) {
        for (const competitor of subcatData.competitors) {
          matches.push({
            nome: competitor,
            source: 'subcategory',
            relevanceScore: 30 + subcat.score,
            matchReasons: [`Subcategoria: ${subcat.name}`],
            profile: {
              problema_principal: { categoria: profile.problema_principal.categoria },
              subcategoria: subcat.subcategoria
            }
          });
        }
      }
    }
    
    return matches;
  }

  findByTechnologies(profile) {
    if (!profile.tecnologias?.length || !this.problemsDb?.problems) return [];
    
    const matches = [];
    
    for (const [problemKey, problemData] of Object.entries(this.problemsDb.problems)) {
      for (const tech of profile.tecnologias) {
        for (const [subcatKey, subcatData] of Object.entries(problemData.subcategories || {})) {
          for (const keyword of subcatData.keywords || []) {
            if (tech.toLowerCase().includes(keyword) || keyword.includes(tech.toLowerCase())) {
              matches.push({
                nome: `${tech} Solutions`,
                source: 'technology_match',
                relevanceScore: 20,
                matchReasons: [`Tecnologia ${tech} relacionada a ${problemData.name}`],
                profile: {
                  problema_principal: { categoria: problemKey },
                  subcategoria: subcatKey,
                  tecnologias: [tech]
                }
              });
            }
          }
        }
      }
    }
    
    return matches;
  }

  deduplicateAndMerge(candidates) {
    const map = new Map();
    
    for (const candidate of candidates) {
      const key = candidate.nome.toLowerCase();
      
      if (map.has(key)) {
        const existing = map.get(key);
        
        existing.relevanceScore = Math.max(existing.relevanceScore, candidate.relevanceScore);
        
        existing.matchReasons = [...new Set([...existing.matchReasons, ...candidate.matchReasons])];
        
        if (candidate.profile && Object.keys(candidate.profile).length > Object.keys(existing.profile).length) {
          existing.profile = { ...existing.profile, ...candidate.profile };
        }
        
        if (candidate.url && !existing.url) {
          existing.url = candidate.url;
        }
      } else {
        map.set(key, { ...candidate });
      }
    }
    
    return Array.from(map.values());
  }
}

module.exports = CompetitorFinder;
