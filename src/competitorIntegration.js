const CompetitorAnalysisAgent = require('./index');

class CompetitorIntegration {
  constructor(config = {}) {
    this.agent = new CompetitorAnalysisAgent(config);
  }

  async analyze(url, maturityScores = null) {
    const result = await this.agent.analyzeCompetitors(url, maturityScores);
    return result;
  }

  async analyzeWithExistingData(siteData, maturityScores = null) {
    const result = await this.agent.analyzeCompetitorsFromData(siteData, maturityScores);
    return result;
  }

  formatCompetitorsForReport(competitors) {
    return competitors.map((c, index) => ({
      rank: index + 1,
      name: c.nome,
      url: c.url,
      similarityScore: c.similarity?.scoreComposto || 0,
      problemMatch: c.similarity?.scores?.problema_match || 0,
      audienceMatch: c.similarity?.scores?.audiencia_match || 0,
      techMatch: c.similarity?.scores?.tecnologia_match || 0,
      priceMatch: c.similarity?.scores?.preco_match || 0,
      reasons: c.matchReasons || []
    }));
  }

  getCompetitorNames(competitors, limit = 6) {
    return competitors
      .slice(0, limit)
      .map(c => c.nome);
  }

  generateCompetitorSummary(report) {
    const topCompetitor = report.competitorAnalysis.competitors[0];
    
    return {
      count: report.competitorAnalysis.total_encontrados,
      topName: topCompetitor?.nome || 'N/A',
      topScore: topCompetitor?.score || 0,
      names: report.competitorAnalysis.competitors.slice(0, 6).map(c => c.nome),
      profile: report.serviceProfile
    };
  }
}

module.exports = CompetitorIntegration;
