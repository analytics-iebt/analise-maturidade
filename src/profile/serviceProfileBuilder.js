class ServiceProfileBuilder {
  constructor() {
    this.profile = {
      empresa: '',
      url: '',
      problema_principal: null,
      problemas_secundarios: [],
      beneficio_chave: '',
      publico_alvo: [],
      tecnologias: [],
      faixa_preco: 'unknown',
      diferenciais: [],
      nivel_automatizacao: 0,
      canais_atendimento: [],
      subcategorias: [],
      score_confianca: 0
    };
  }

  addEmpresa(nome) {
    this.profile.empresa = nome;
    return this;
  }

  addUrl(url) {
    this.profile.url = url;
    return this;
  }

  addProblemaPrincipal(problema) {
    if (!problema) return this;
    
    this.profile.problema_principal = {
      categoria: problema.categoria,
      subcategoria: problema.subcategorias?.[0]?.subcategoria || null,
      name: problema.name,
      keywords_encontradas: problema.keywords_encontradas || [],
      confianca: problema.confianca || 0,
      score: problema.score || 0
    };

    if (problema.subcategorias?.length > 0) {
      this.profile.subcategorias = problema.subcategorias.map(s => ({
        subcategoria: s.subcategoria,
        name: s.name,
        score: s.score
      }));
    }

    return this;
  }

  addProblemasSecundarios(problemas) {
    if (!problemas?.length) return this;
    
    this.profile.problemas_secundarios = problemas
      .filter(p => p.categoria !== this.profile.problema_principal?.categoria)
      .slice(0, 5)
      .map(p => ({
        categoria: p.categoria,
        subcategoria: p.subcategorias?.[0]?.subcategoria || null,
        name: p.name,
        keywords_encontradas: p.keywords_encontradas || [],
        peso: p.peso || 1,
        confianca: p.confianca || 0
      }));

    return this;
  }

  addPublicoAlvo(publico) {
    if (!publico?.length) return this;
    this.profile.publico_alvo = [...new Set([...this.profile.publico_alvo, ...publico])];
    return this;
  }

  addTecnologias(tecnologias) {
    if (!tecnologias?.length) return this;
    this.profile.tecnologias = [...new Set([...this.profile.tecnologias, ...tecnologias])];
    return this;
  }

  addFaixaPreco(faixa) {
    const validFaixas = ['free', '$', '$$', '$$$', 'enterprise', 'unknown'];
    if (validFaixas.includes(faixa)) {
      this.profile.faixa_preco = faixa;
    }
    return this;
  }

  addDiferenciais(diferenciais) {
    if (!diferenciais?.length) return this;
    this.profile.diferenciais = [...new Set([...this.profile.diferenciais, ...diferenciais])];
    return this;
  }

  addCanaisAtendimento(canais) {
    if (!canais?.length) return this;
    this.profile.canais_atendimento = [...new Set([...this.profile.canais_atendimento, ...canais])];
    return this;
  }

  addBeneficioChave(beneficio) {
    if (beneficio) {
      this.profile.beneficio_chave = beneficio;
    }
    return this;
  }

  calculateConfidenceScore() {
    let score = 0;
    
    if (this.profile.problema_principal?.categoria) score += 25;
    if (this.profile.problema_principal?.confianca >= 70) score += 10;
    if (this.profile.problema_principal?.confianca >= 50) score += 5;
    
    if (this.profile.publico_alvo.length > 0) score += 15;
    if (this.profile.publico_alvo.length >= 2) score += 5;
    
    if (this.profile.tecnologias.length > 0) score += 10;
    if (this.profile.tecnologias.length >= 3) score += 5;
    
    if (this.profile.problemas_secundarios.length > 0) score += 10;
    if (this.profile.problemas_secundarios.length >= 2) score += 5;
    
    if (this.profile.faixa_preco !== 'unknown') score += 10;
    
    if (this.profile.subcategorias.length > 0) score += 10;
    
    if (this.profile.diferenciais.length > 0) score += 5;
    
    this.profile.score_confianca = Math.min(100, score);
    return this;
  }

  extractDiferenciais(siteData) {
    const diferenciais = [];
    
    const benefitSelectors = [
      'unique', 'diferente', 'diferencial', 'especial', 'exclusive',
      'only', 'only one', 'unico', 'exclusivo', 'você escolhe',
      'personalizado', 'custom', 'made for you'
    ];
    
    const text = siteData.features?.join(' ').toLowerCase() || '';
    const benefits = siteData.benefits?.join(' ').toLowerCase() || '';
    
    for (const keyword of benefitSelectors) {
      if (text.includes(keyword) || benefits.includes(keyword)) {
        const matches = text.match(new RegExp(`.{0,50}${keyword}.{0,50}`, 'gi'));
        if (matches) {
          diferenciais.push(...matches.map(m => m.trim()));
        }
      }
    }
    
    const featureKeywords = [
      'automacao', 'automação', 'ia', 'ai', 'machine learning', 'inteligencia',
      'integracao', 'integração', 'api', 'real-time', 'tempo real',
      'easy', 'facil', 'easy', 'simple', 'intuitivo', 'intuitive',
      'secure', 'seguro', 'rapido', 'fast', 'performant'
    ];
    
    for (const keyword of featureKeywords) {
      if (text.includes(keyword)) {
        diferenciais.push(keyword);
      }
    }

    return [...new Set(diferenciais)].slice(0, 10);
  }

  extractBeneficioChave(siteData) {
    const benefits = siteData.benefits || [];
    
    const benefitPatterns = [
      /(\d+%)\s*(?:de|redução|economia|aumento|mais|menos)/gi,
      /(?:economize|ganhe|tenha|conquiste)\s+([^.]+)/gi,
      /(?:de\s+(\d+)\s*(?:a|até)\s*(\d+)\s*horas?|(\d+)\s*(?:vezes|horas?|dias?))\s*mais/gi
    ];
    
    for (const pattern of benefitPatterns) {
      const match = benefits.join(' ').match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    if (benefits.length > 0) {
      const sortedBenefits = benefits.sort((a, b) => b.length - a.length);
      return sortedBenefits[0];
    }

    return siteData.description || '';
  }

  build() {
    this.calculateConfidenceScore();
    return { ...this.profile };
  }
}

module.exports = ServiceProfileBuilder;
