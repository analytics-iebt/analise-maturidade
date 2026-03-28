const SiteScraper = require('./scraper/siteScraper');
const ProblemClassifier = require('./nlp/problemClassifier');
const ServiceProfileBuilder = require('./profile/serviceProfileBuilder');
const CompetitorFinder = require('./matcher/competitorFinder');
const SimilarityCalculator = require('./matcher/similarityCalculator');
const ReportGenerator = require('./output/reportGenerator');

const path = require('path');

class CompetitorAnalysisAgent {
  constructor(config = {}) {
    this.problemsDb = config.problemsDb || require('./data/problems-taxonomy.json');
    this.internalDb = config.internalDb || require('./data/competitors-profiles.json');
    this.scraper = new SiteScraper(config.scraper || {});
    this.classifier = new ProblemClassifier(this.problemsDb);
    this.finder = new CompetitorFinder({
      problemsDb: this.problemsDb,
      internalDb: this.internalDb
    });
    this.calculator = new SimilarityCalculator();
    this.reportGenerator = new ReportGenerator();
  }

  async analyzeCompetitors(siteUrl, companyScores = null) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 INICIANDO ANÁLISE DE CONCORRENTES');
    console.log(`📍 URL: ${siteUrl}`);
    console.log('═══════════════════════════════════════════════════════════════');

    try {
      console.log('\n📥 ETAPA 1: RASPANDO SITE');
      console.log('───────────────────────────────────────────────────────────────');
      const siteData = await this.scraper.scrape(siteUrl);
      
      console.log('\n🏷️ ETAPA 2: CLASSIFICANDO PROBLEMAS');
      console.log('───────────────────────────────────────────────────────────────');
      const classification = this.classifier.classify(siteData);
      
      console.log('\n📋 ETAPA 3: CONSTRUINDO SERVICE PROFILE');
      console.log('───────────────────────────────────────────────────────────────');
      const profileBuilder = new ServiceProfileBuilder();
      const profile = profileBuilder
        .addEmpresa(siteData.companyName)
        .addUrl(siteUrl)
        .addProblemaPrincipal(classification.primary)
        .addProblemasSecundarios(classification.secondary)
        .addPublicoAlvo(siteData.audience)
        .addTecnologias(siteData.technologies)
        .addFaixaPreco(siteData.priceRange)
        .addDiferenciais(profileBuilder.extractDiferenciais(siteData))
        .addBeneficioChave(profileBuilder.extractBeneficioChave(siteData))
        .build();
      
      console.log(`   ✓ Empresa: ${profile.empresa}`);
      console.log(`   ✓ Problema: ${profile.problema_principal?.name || 'N/A'}`);
      console.log(`   ✓ Público: ${profile.publico_alvo.join(', ') || 'N/A'}`);
      console.log(`   ✓ Tecnologias: ${profile.tecnologias.slice(0, 5).join(', ')}${profile.tecnologias.length > 5 ? '...' : ''}`);
      console.log(`   ✓ Confiança: ${profile.score_confianca}%`);
      
      console.log('\n🎯 ETAPA 4: BUSCANDO CONCORRENTES');
      console.log('───────────────────────────────────────────────────────────────');
      let competitors = await this.finder.findCompetitors(profile);
      
      console.log('\n📐 ETAPA 5: CALCULANDO SIMILARIDADE');
      console.log('───────────────────────────────────────────────────────────────');
      for (const competitor of competitors) {
        competitor.similarity = this.calculator.calculateProfileSimilarity(
          profile, 
          competitor.profile
        );
        console.log(`   ${competitor.nome}: ${competitor.similarity.scoreComposto}%`);
      }
      
      competitors.sort((a, b) => b.similarity.scoreComposto - a.similarity.scoreComposto);
      
      console.log('\n📝 ETAPA 6: GERANDO RELATÓRIO');
      console.log('───────────────────────────────────────────────────────────────');
      const report = this.reportGenerator.generateCompetitorAnalysisReport(
        profile, 
        competitors,
        companyScores || {}
      );
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('✅ ANÁLISE CONCLUÍDA');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`   📊 Concorrentes encontrados: ${report.competitorAnalysis.total_encontrados}`);
      console.log(`   🏆 Top concorrente: ${report.competitorAnalysis.top_competitor}`);
      console.log(`   📈 Posicionamento: ${report.benchmark.posicionamento}`);
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      return {
        success: true,
        report,
        profile,
        competitors,
        siteData
      };

    } catch (error) {
      console.error('\n❌ ERRO NA ANÁLISE:', error.message);
      throw error;
    }
  }

  async analyzeCompetitorsFromData(siteData, companyScores = null) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 INICIANDO ANÁLISE DE CONCORRENTES (DADOS FORNECIDOS)');
    console.log('═══════════════════════════════════════════════════════════════');

    try {
      console.log('\n🏷️ ETAPA 1: CLASSIFICANDO PROBLEMAS');
      console.log('───────────────────────────────────────────────────────────────');
      const classification = this.classifier.classify(siteData);
      
      console.log('\n📋 ETAPA 2: CONSTRUINDO SERVICE PROFILE');
      console.log('───────────────────────────────────────────────────────────────');
      const profileBuilder = new ServiceProfileBuilder();
      const profile = profileBuilder
        .addEmpresa(siteData.companyName || 'Empresa')
        .addUrl(siteData.url || '')
        .addProblemaPrincipal(classification.primary)
        .addProblemasSecundarios(classification.secondary)
        .addPublicoAlvo(siteData.audience || [])
        .addTecnologias(siteData.technologies || [])
        .addFaixaPreco(siteData.priceRange || 'unknown')
        .addDiferenciais(profileBuilder.extractDiferenciais(siteData))
        .addBeneficioChave(profileBuilder.extractBeneficioChave(siteData))
        .build();
      
      console.log('\n🎯 ETAPA 3: BUSCANDO CONCORRENTES');
      console.log('───────────────────────────────────────────────────────────────');
      let competitors = await this.finder.findCompetitors(profile);
      
      console.log('\n📐 ETAPA 4: CALCULANDO SIMILARIDADE');
      console.log('───────────────────────────────────────────────────────────────');
      for (const competitor of competitors) {
        competitor.similarity = this.calculator.calculateProfileSimilarity(
          profile, 
          competitor.profile
        );
      }
      
      competitors.sort((a, b) => b.similarity.scoreComposto - a.similarity.scoreComposto);
      
      console.log('\n📝 ETAPA 5: GERANDO RELATÓRIO');
      const report = this.reportGenerator.generateCompetitorAnalysisReport(
        profile, 
        competitors,
        companyScores || {}
      );
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('✅ ANÁLISE CONCLUÍDA');
      console.log('═══════════════════════════════════════════════════════════════');
      
      return {
        success: true,
        report,
        profile,
        competitors,
        siteData
      };

    } catch (error) {
      console.error('\n❌ ERRO NA ANÁLISE:', error.message);
      throw error;
    }
  }
}

module.exports = CompetitorAnalysisAgent;
