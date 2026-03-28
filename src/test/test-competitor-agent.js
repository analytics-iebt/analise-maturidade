const CompetitorAnalysisAgent = require('../src/index');

async function test() {
  console.log('🧪 TESTE DO AGENTE DE ANÁLISE DE CONCORRENTES\n');

  const agent = new CompetitorAnalysisAgent();

  const testUrl = process.argv[2] || 'https://intercom.com';

  console.log(`📍 Testando com URL: ${testUrl}\n`);

  try {
    const result = await agent.analyzeCompetitors(testUrl, { finalScore: 75 });

    console.log('\n📊 RESUMO DO RELATÓRIO:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`Empresa: ${result.report.metadata.empresa}`);
    console.log(`Problema: ${result.report.serviceProfile.problema_principal?.name}`);
    console.log(`Público: ${result.report.serviceProfile.publico_alvo.join(', ')}`);
    console.log(`Tecnologias: ${result.report.serviceProfile.tecnologias.slice(0, 5).join(', ')}`);
    console.log(`\nConcorrentes encontrados: ${result.report.competitorAnalysis.total_encontrados}`);
    console.log(`Top concorrente: ${result.report.competitorAnalysis.top_competitor}`);
    console.log(`Posicionamento: ${result.report.benchmark.posicionamento}`);
    console.log(`\nResumo: ${result.report.summary}`);

    console.log('\n📋 TOP 5 CONCORRENTES:');
    console.log('───────────────────────────────────────────────────────────────');
    result.report.competitorAnalysis.competitors.slice(0, 5).forEach((c, i) => {
      console.log(`${i + 1}. ${c.nome} (${c.score}% similaridade)`);
      console.log(`   Problema: ${c.scores?.problema_match}% | Público: ${c.scores?.audiencia_match}% | Tech: ${c.scores?.tecnologia_match}%`);
    });

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
  }
}

test();
