class ProblemClassifier {
  constructor(problemsDb) {
    this.problemsDb = problemsDb;
    
    this.GENERIC_KEYWORDS = ['pagamento', 'pagamentos', 'cartão', 'pix', 'boleto', 'crédito', 'débito', 'transferência', 'banco', 'financeiro', 'contato', 'sobre', 'termos', 'privacidade', 'politica', 'copyright', 'todos os direitos', 'endereço'];
  }

  classify(siteData) {
    console.log('[Classifier] Classificando problemas do site...');
    
    const allText = this.buildTextCorpus(siteData);
    const allTextLower = allText.toLowerCase();
    
    const headingsText = (siteData.headings || []).join(' ').toLowerCase();
    const heroText = (siteData.hero || '').toLowerCase();
    const featuresText = (siteData.features || []).join(' ').toLowerCase();
    const titleText = (siteData.title || '').toLowerCase();
    
    const problemScores = this.scoreProblems(allTextLower, headingsText, heroText, featuresText, titleText);
    const sortedProblems = Object.entries(problemScores)
      .sort((a, b) => b[1].score - a[1].score);

    const primary = sortedProblems[0];
    const primaryData = this.problemsDb.problems[primary[0]];
    
    const result = {
      primary: {
        categoria: primary[0],
        name: primaryData?.name || primary[0],
        description: primaryData?.description || '',
        score: primary[1].score,
        keywords_encontradas: primary[1].matchedKeywords,
        confianca: this.calculateConfidence(primary[1])
      },
      secondary: [],
      allMatches: sortedProblems.filter(p => p[1].score > 0).map(p => ({
        categoria: p[0],
        name: this.problemsDb.problems[p[0]]?.name || p[0],
        score: p[1].score,
        subcategories: this.extractSubcategories(p[0], allTextLower)
      }))
    };

    for (let i = 1; i < sortedProblems.length; i++) {
      const p = sortedProblems[i];
      if (p[1].score > 0) {
        result.secondary.push({
          categoria: p[0],
          name: this.problemsDb.problems[p[0]]?.name || p[0],
          score: p[1].score,
          keywords_encontradas: p[1].matchedKeywords,
          peso: p[1].score / primary[1].score,
          confianca: this.calculateConfidence(p[1])
        });
      }
    }

    console.log(`[Classifier] ✓ Problema principal: ${result.primary.name} (${result.primary.confianca}% confiança)`);
    console.log(`[Classifier]   Problemas secundários: ${result.secondary.length}`);
    result.secondary.slice(0, 3).forEach((p, i) => {
      console.log(`[Classifier]   ${i + 1}. ${p.name} (${p.score} pontos)`);
    });

    return result;
  }

  buildTextCorpus(siteData) {
    const parts = [
      siteData.title,
      siteData.description,
      siteData.hero,
      siteData.features.join(' '),
      siteData.benefits.join(' '),
      siteData.mainContent,
      siteData.headings.join(' '),
      siteData.keywords.join(' ')
    ];
    return parts.filter(p => p).join(' ');
  }

  isGenericKeyword(keyword) {
    return this.GENERIC_KEYWORDS.some(gk => keyword.toLowerCase().includes(gk));
  }

  countKeywordOccurrences(text, keyword) {
    const regex = new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  scoreProblems(text, headingsText, heroText, featuresText, titleText) {
    const scores = {};
    
    for (const [problemKey, problemData] of Object.entries(this.problemsDb.problems)) {
      scores[problemKey] = {
        score: 0,
        matchedKeywords: [],
        matchedSubcategories: [],
        headingScore: 0,
        heroScore: 0,
        featureScore: 0,
        titleScore: 0
      };

      for (const keyword of problemData.keywords || []) {
        if (this.isGenericKeyword(keyword)) continue;
        
        let baseScore = 0;
        let inHeading = false;
        let inHero = false;
        let inFeature = false;
        let inTitle = false;
        
        if (text.includes(keyword.toLowerCase())) {
          baseScore = 10;
        }
        
        if (headingsText.includes(keyword.toLowerCase())) {
          inHeading = true;
          scores[problemKey].headingScore += 15;
        }
        
        if (heroText.includes(keyword.toLowerCase())) {
          inHero = true;
          scores[problemKey].heroScore += 12;
        }
        
        if (featuresText.includes(keyword.toLowerCase())) {
          inFeature = true;
          scores[problemKey].featureScore += 8;
        }
        
        if (titleText.includes(keyword.toLowerCase())) {
          inTitle = true;
          scores[problemKey].titleScore += 10;
        }
        
        if (baseScore > 0 || inHeading || inHero || inFeature || inTitle) {
          scores[problemKey].matchedKeywords.push(keyword);
        }
        
        scores[problemKey].score += baseScore;
      }

      for (const [subKey, subData] of Object.entries(problemData.subcategories || {})) {
        for (const subKeyword of subData.keywords || []) {
          if (this.isGenericKeyword(subKeyword)) continue;
          
          let subScore = 0;
          
          if (text.includes(subKeyword.toLowerCase())) {
            subScore = 15;
          }
          
          if (headingsText.includes(subKeyword.toLowerCase())) {
            subScore += 20;
          }
          
          if (heroText.includes(subKeyword.toLowerCase())) {
            subScore += 15;
          }
          
          if (subScore > 0) {
            if (!scores[problemKey].matchedKeywords.includes(subKeyword)) {
              scores[problemKey].matchedKeywords.push(subKeyword);
            }
            if (!scores[problemKey].matchedSubcategories.includes(subKey)) {
              scores[problemKey].matchedSubcategories.push(subKey);
            }
            scores[problemKey].score += subScore;
          }
        }
      }
    }

    return scores;
  }

  extractSubcategories(problemKey, text) {
    const problemData = this.problemsDb.problems[problemKey];
    if (!problemData?.subcategories) return [];

    const subcategoryScores = [];
    
    for (const [subKey, subData] of Object.entries(problemData.subcategories)) {
      let score = 0;
      const matched = [];
      
      for (const keyword of subData.keywords || []) {
        if (this.isGenericKeyword(keyword)) continue;
        if (text.includes(keyword.toLowerCase())) {
          score += 5;
          matched.push(keyword);
        }
      }
      
      if (score > 0) {
        subcategoryScores.push({
          subcategoria: subKey,
          name: subData.name,
          score,
          keywords: matched
        });
      }
    }

    return subcategoryScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  calculateConfidence(scoreData) {
    let confidence = 0;
    
    if (scoreData.score >= 80) confidence += 40;
    else if (scoreData.score >= 50) confidence += 30;
    else if (scoreData.score >= 30) confidence += 20;
    else if (scoreData.score >= 15) confidence += 10;
    
    if (scoreData.headingScore >= 20) confidence += 25;
    else if (scoreData.headingScore >= 10) confidence += 15;
    
    if (scoreData.heroScore >= 15) confidence += 15;
    else if (scoreData.heroScore >= 5) confidence += 10;
    
    if (scoreData.matchedKeywords.length >= 5) confidence += 15;
    else if (scoreData.matchedKeywords.length >= 3) confidence += 10;
    else if (scoreData.matchedKeywords.length >= 1) confidence += 5;
    
    if (scoreData.matchedSubcategories?.length > 0) confidence += 15;
    
    return Math.min(100, confidence);
  }
}

module.exports = ProblemClassifier;
