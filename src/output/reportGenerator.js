class ReportGenerator {
  
  generateCompetitorAnalysisReport(profile, competitors, scores = {}) {
    console.log('[ReportGenerator] Gerando relatório...');
    
    return {
      metadata: {
        empresa: profile.empresa,
        url: profile.url,
        data_analise: new Date().toISOString(),
        score_confianca: profile.score_confianca
      },
      
      serviceProfile: {
        problema_principal: profile.problema_principal,
        problemas_secundarios: profile.problemas_secundarios,
        subcategorias: profile.subcategorias,
        publico_alvo: profile.publico_alvo,
        tecnologias: profile.tecnologias,
        faixa_preco: profile.faixa_preco,
        beneficio_chave: profile.beneficio_chave,
        diferenciais: profile.diferenciais,
        nivel_automatizacao: profile.nivel_automatizacao
      },
      
      competitorAnalysis: {
        total_encontrados: competitors.length,
        top_competitor: competitors[0]?.nome || 'N/A',
        score_top_competitor: competitors[0]?.similarity?.scoreComposto || 0,
        
        competitors: competitors.map((c, index) => ({
          rank: index + 1,
          nome: c.nome,
          url: c.url || 'N/A',
          score: c.similarity?.scoreComposto || 0,
          scores: c.similarity?.scores || {},
          match_reasons: c.matchReasons || c.match_reasons || [],
          benchmark_data: this.getBenchmarkData(c.profile)
        }))
      },
      
      benchmark: {
        empresa_score: scores.finalScore || 0,
        media_concorrentes: this.calculateAverageCompetitorScore(competitors),
        posicionamento: this.calculatePositioning(scores.finalScore, competitors),
        comparacao_detalhada: this.generateComparacaoDetalhada(profile, competitors, scores)
      },
      
      summary: this.generateSummary(profile, competitors, scores)
    };
  }

  calculateAverageCompetitorScore(competitors) {
    if (!competitors.length) return 0;
    
    const competitorsWithScores = competitors.filter(c => c.profile?.presenca_digital);
    
    if (competitorsWithScores.length === 0) return 0;
    
    const total = competitorsWithScores.reduce((sum, c) => {
      const scores = [
        c.profile.presenca_digital || 0,
        c.profile.social_media || 0,
        c.profile.culture_innovation || 0,
        c.profile.communication || 0,
        c.profile.transformation || 0
      ];
      return sum + (scores.reduce((a, b) => a + b, 0) / 5);
    }, 0);
    
    return Math.round(total / competitorsWithScores.length);
  }

  calculatePositioning(companyScore, competitors) {
    if (!companyScore) return 'N/A - Score não disponível';
    
    const avgCompetitorScore = this.calculateAverageCompetitorScore(competitors);
    
    if (avgCompetitorScore === 0) return 'N/A - Dados de concorrentes não disponíveis';
    
    const diff = companyScore - avgCompetitorScore;
    
    if (diff > 15) return 'Leader - Acima da média significativa';
    if (diff > 5) return 'Above Average - Acima da média';
    if (diff > -5) return 'At Par - Na média';
    if (diff > -15) return 'Below Average - Abaixo da média';
    return 'Lagging - Oportunidade de melhoria';
  }

  getBenchmarkData(competitorProfile) {
    if (!competitorProfile) {
      return {
        presenca_digital: 'N/A',
        social_media: 'N/A',
        culture_innovation: 'N/A',
        communication: 'N/A',
        transformation: 'N/A'
      };
    }
    
    return {
      presenca_digital: competitorProfile.presenca_digital || 'N/A',
      social_media: competitorProfile.social_media || 'N/A',
      culture_innovation: competitorProfile.culture_innovation || 'N/A',
      communication: competitorProfile.communication || 'N/A',
      transformation: competitorProfile.transformation || 'N/A'
    };
  }

  generateComparacaoDetalhada(profile, competitors, scores) {
    const comparacao = {
      problema_match_rate: 0,
      audiencia_overlap: [],
      tech_overlap: [],
      price_segment: profile.faixa_preco,
      recommendations: []
    };

    const competitorsWithMatchingProblem = competitors.filter(
      c => c.profile?.problema_principal?.categoria === profile.problema_principal?.categoria
    );
    
    comparacao.problema_match_rate = Math.round(
      (competitorsWithMatchingProblem.length / Math.max(competitors.length, 1)) * 100
    );

    if (profile.publico_alvo.length > 0 && competitors.length > 0) {
      const allAudiences = competitors
        .filter(c => c.profile?.publico_alvo)
        .flatMap(c => c.profile.publico_alvo);
      
      const audienceOverlap = profile.publico_alvo.filter(
        a => allAudiences.map(aud => aud.toLowerCase()).includes(a.toLowerCase())
      );
      comparacao.audiencia_overlap = audienceOverlap;
    }

    if (profile.tecnologias.length > 0 && competitors.length > 0) {
      const allTechs = competitors
        .filter(c => c.profile?.tecnologias)
        .flatMap(c => c.profile.tecnologias);
      
      const techOverlap = profile.tecnologias.filter(
        t => allTechs.map(tech => tech.toLowerCase()).includes(t.toLowerCase())
      );
      comparacao.tech_overlap = techOverlap;
    }

    comparacao.recommendations = this.generateRecommendations(
      profile, 
      competitors, 
      comparacao
    );

    return comparacao;
  }

  generateRecommendations(profile, competitors, comparacao) {
    const recommendations = [];

    if (comparacao.problema_match_rate < 50) {
      recommendations.push({
        tipo: 'concorrentes',
        prioridade: 'alta',
        mensagem: `Apenas ${comparacao.problema_match_rate}% dos concorrentes resolvem o mesmo problema principal. Considere validar o posicionamento.`
      });
    }

    if (comparacao.tech_overlap.length === 0 && profile.tecnologias.length > 0) {
      recommendations.push({
        tipo: 'tecnologia',
        prioridade: 'media',
        mensagem: `Nenhum concorrente usa as mesmas tecnologias (${profile.tecnologias.join(', ')}). Isso pode ser um diferencial ou um risco.`
      });
    }

    if (comparacao.audiencia_overlap.length > 0) {
      recommendations.push({
        tipo: 'publico',
        prioridade: 'baixa',
        mensagem: `Concorrentes que atendem o mesmo público: ${comparacao.audiencia_overlap.join(', ')}`
      });
    }

    const priceMatches = competitors.filter(
      c => c.profile?.faixa_preco === profile.faixa_preco
    );
    
    if (priceMatches.length > competitors.length * 0.5) {
      recommendations.push({
        tipo: 'preco',
        prioridade: 'media',
        mensagem: `A maioria dos concorrentes está na mesma faixa de preço (${profile.faixa_preco}).`
      });
    }

    return recommendations;
  }

  generateSummary(profile, competitors, scores) {
    const summaryParts = [];

    summaryParts.push(`Análise de concorrência para **${profile.empresa}**, especializada em **${profile.problema_principal?.name || 'problema não identificado'}**.`);

    if (profile.score_confianca >= 70) {
      summaryParts.push(`Perfil com alta confiança (${profile.score_confianca}%) - Problema principal bem identificado.`);
    } else if (profile.score_confianca >= 40) {
      summaryParts.push(`Perfil com confiança moderada (${profile.score_confianca}%). Recomenda-se validação manual.`);
    } else {
      summaryParts.push(`Perfil com baixa confiança (${profile.score_confianca}%). Análise requer revisão manual.`);
    }

    if (competitors.length > 0) {
      const topCompetitor = competitors[0];
      summaryParts.push(`${competitors.length} concorrentes identificados. Líder: **${topCompetitor.nome}** (${topCompetitor.similarity?.scoreComposto || 0}% de similaridade).`);
    } else {
      summaryParts.push(`Nenhum concorrente direto identificado. Considere expandir o escopo da análise.`);
    }

    if (scores.finalScore && this.calculateAverageCompetitorScore(competitors) > 0) {
      const positioning = this.calculatePositioning(scores.finalScore, competitors);
      summaryParts.push(`**Posicionamento:** ${positioning}`);
    }

    return summaryParts.join(' ');
  }
}

module.exports = ReportGenerator;
