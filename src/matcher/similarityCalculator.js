class SimilarityCalculator {
  
  calculateProfileSimilarity(profile1, profile2) {
    const scores = {
      problema_match: this.calculateProblemaSimilarity(
        profile1.problema_principal, 
        profile2.problema_principal
      ),
      secundario_match: this.calculateSecundariosSimilarity(
        profile1.problemas_secundarios,
        profile2.problemas_secundarios
      ),
      audiencia_match: this.calculateAudienciaSimilarity(
        profile1.publico_alvo,
        profile2.publico_alvo
      ),
      tecnologia_match: this.calculateTecnologiaSimilarity(
        profile1.tecnologias,
        profile2.tecnologias
      ),
      preco_match: this.calculatePrecoSimilarity(
        profile1.faixa_preco,
        profile2.faixa_preco
      )
    };

    const weights = {
      problema_match: 0.35,
      secundario_match: 0.15,
      audiencia_match: 0.20,
      tecnologia_match: 0.15,
      preco_match: 0.15
    };

    const scoreComposto = Object.entries(scores).reduce(
      (sum, [key, value]) => sum + (value * weights[key]),
      0
    );

    return {
      scores,
      scoreComposto: Math.round(scoreComposto),
      breakdown: this.getBreakdownText(scores)
    };
  }

  calculateProblemaSimilarity(p1, p2) {
    if (!p1?.categoria || !p2?.categoria) return 0;
    
    let score = 0;
    
    if (p1.categoria === p2.categoria) score += 50;
    
    if (p1.subcategoria && p2.subcategoria && p1.subcategoria === p2.subcategoria) {
      score += 30;
    } else if (p1.subcategoria && p2.subcategoria) {
      score += 10;
    }
    
    const keywords1 = new Set((p1.keywords_encontradas || []).map(k => k.toLowerCase()));
    const keywords2 = new Set((p2.keywords_encontradas || []).map(k => k.toLowerCase()));
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    
    if (intersection.size > 0) {
      score += Math.min(20, intersection.size * 5);
    }
    
    return Math.min(100, score);
  }

  calculateSecundariosSimilarity(sec1, sec2) {
    if (!sec1?.length || !sec2?.length) return 0;
    
    const cats1 = new Set(sec1.map(s => s.categoria));
    const cats2 = new Set(sec2.map(s => s.categoria));
    const intersection = new Set([...cats1].filter(x => cats2.has(x)));
    
    const union = new Set([...cats1, ...cats2]);
    
    const jaccard = intersection.size / union.size;
    
    const peso1 = sec1.reduce((sum, s) => sum + (s.peso || 1), 0) / sec1.length;
    const peso2 = sec2.reduce((sum, s) => sum + (s.peso || 1), 0) / sec2.length;
    const pesoDiff = Math.abs(peso1 - peso2) / Math.max(peso1, peso2);
    const pesoBonus = (1 - pesoDiff) * 10;
    
    return Math.round((jaccard * 100) + pesoBonus);
  }

  calculateAudienciaSimilarity(audiencia1, audiencia2) {
    if (!audiencia1?.length || !audiencia2?.length) return 0;
    
    const set1 = new Set(audiencia1.map(a => a.toLowerCase()));
    const set2 = new Set(audiencia2.map(a => a.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const jaccard = intersection.size / union.size;
    return Math.round(jaccard * 100);
  }

  calculateTecnologiaSimilarity(tech1, tech2) {
    if (!tech1?.length || !tech2?.length) return 0;
    
    const set1 = new Set(tech1.map(t => t.toLowerCase()));
    const set2 = new Set(tech2.map(t => t.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const jaccard = intersection.size / union.size;
    return Math.round(jaccard * 100);
  }

  calculatePrecoSimilarity(preco1, preco2) {
    if (preco1 === 'unknown' || preco2 === 'unknown') return 50;
    
    const priceLevels = { 'free': 1, '$': 2, '$$': 3, '$$$': 4, 'enterprise': 5 };
    
    const level1 = priceLevels[preco1] || 3;
    const level2 = priceLevels[preco2] || 3;
    
    const diff = Math.abs(level1 - level2);
    
    if (diff === 0) return 100;
    if (diff === 1) return 75;
    if (diff === 2) return 50;
    return 25;
  }

  getBreakdownText(scores) {
    return Object.entries(scores)
      .map(([key, value]) => {
        const labels = {
          problema_match: 'Problema',
          secundario_match: 'Secundários',
          audiencia_match: 'Público',
          tecnologia_match: 'Tecnologia',
          preco_match: 'Preço'
        };
        return `${labels[key] || key}: ${value}%`;
      })
      .join(' | ');
  }
}

module.exports = SimilarityCalculator;
