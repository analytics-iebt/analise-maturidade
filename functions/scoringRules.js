function calculateScores(analysis) {
  let presenceDigital = 40;
  if (analysis.hasHttps) presenceDigital += 10;
  if (analysis.hasBlog) presenceDigital += 15;
  if (analysis.hasCases) presenceDigital += 10;
  if (analysis.hasCareers) presenceDigital += 10;
  if (analysis.headingsCount > 10) presenceDigital += 10;
  if (analysis.forms > 2) presenceDigital += 5;
  
  if (analysis.internalPages && Object.keys(analysis.internalPages).length > 0) {
    const pages = analysis.internalPages;
    if (pages['/sobre'] || pages['/about']) presenceDigital += 5;
    if (pages['/contato'] || pages['/contact']) presenceDigital += 5;
    if (pages['/servicos'] || pages['/services']) presenceDigital += 5;
    if (pages['/carreiras'] || pages['/careers']) presenceDigital += 5;
  }
  
  presenceDigital = Math.min(100, presenceDigital);

  let socialMedia = 30;
  const activeSocials = Object.values(analysis.socialLinks).filter(Boolean).length;
  socialMedia += activeSocials * 12;
  if (analysis.hasPrivacy) socialMedia += 5;
  socialMedia = Math.min(100, socialMedia);

  let cultureInnovation = 30;
  cultureInnovation += Math.min(25, Object.keys(analysis.innovationKeywords).length * 5);
  
  if (!analysis.techIndicators.wordpress && !analysis.techIndicators.shopify && !analysis.techIndicators.wix) {
    cultureInnovation += 10;
  }
  if (analysis.techIndicators.react || analysis.techIndicators.vue || analysis.techIndicators.angular) {
    cultureInnovation += 15;
  }
  
  if (analysis.internalPages) {
    let totalTechOnPages = 0;
    let innovationOnPages = 0;
    Object.values(analysis.internalPages).forEach(page => {
      if (page.technologies && page.technologies.length > 0) totalTechOnPages += page.technologies.length;
      if (page.innovationKeywords && page.innovationKeywords.length > 0) innovationOnPages += page.innovationKeywords.length;
    });
    cultureInnovation += Math.min(10, totalTechOnPages * 2);
    cultureInnovation += Math.min(10, innovationOnPages * 3);
  }
  
  cultureInnovation = Math.min(100, cultureInnovation);

  let communication = 40;
  if (analysis.hasBlog) communication += 20;
  if (analysis.wordCount > 1000) communication += 15;
  if (analysis.headingsCount > 15) communication += 10;
  if (analysis.images > 10) communication += 10;
  
  if (analysis.internalPages) {
    let totalWords = analysis.wordCount;
    let totalImages = analysis.images;
    let hasVideos = false;
    Object.values(analysis.internalPages).forEach(page => {
      totalWords += page.wordCount || 0;
      totalImages += page.images || 0;
      if (page.videos > 0) hasVideos = true;
    });
    if (totalWords > 5000) communication += 10;
    if (totalImages > 20) communication += 5;
    if (hasVideos) communication += 5;
  }
  
  communication = Math.min(100, communication);

  let transformation = 35;
  if (analysis.forms > 2) transformation += 15;
  if (Object.keys(analysis.innovationKeywords).length > 3) transformation += 20;
  if (analysis.hasCases) transformation += 15;
  if (analysis.hasContact) transformation += 10;
  
  if (analysis.internalPages) {
    const pages = analysis.internalPages;
    let hasContactPage = pages['/contato'] || pages['/contact'];
    let hasFormsOnPages = false;
    let marketingTools = [];
    
    Object.values(pages).forEach(page => {
      if (page.hasForm) hasFormsOnPages = true;
      if (page.technologies) {
        marketingTools.push(...page.technologies.filter(t => 
          ['Google Analytics', 'Google Tag Manager', 'Facebook Pixel', 'HubSpot', 'Mailchimp', 'Hotjar'].includes(t)
        ));
      }
    });
    
    if (hasContactPage) transformation += 5;
    if (hasFormsOnPages) transformation += 5;
    if (marketingTools.length > 0) transformation += 10;
  }
  
  transformation = Math.min(100, transformation);

  const finalScore = Math.round(
    presenceDigital * 0.20 +
    socialMedia * 0.25 +
    cultureInnovation * 0.25 +
    communication * 0.15 +
    transformation * 0.15
  );

  return {
    presenceDigital: Math.min(100, presenceDigital),
    socialMedia: Math.min(100, socialMedia),
    cultureInnovation: Math.min(100, cultureInnovation),
    communication: Math.min(100, communication),
    transformation: Math.min(100, transformation),
    finalScore,
  };
}

function getMaturityLevel(score) {
  if (score >= 85) return { level: 5, name: 'Líder' };
  if (score >= 70) return { level: 4, name: 'Inovador' };
  if (score >= 50) return { level: 3, name: 'Desenvolvendo' };
  if (score >= 30) return { level: 2, name: 'Emergente' };
  return { level: 1, name: 'Nascent' };
}

function getForcesAndGaps(analysis, scores) {
  const forces = [];
  const gaps = [];

  if (analysis.hasHttps) forces.push('Site seguro com HTTPS');
  else gaps.push('Site sem HTTPS');

  if (analysis.hasBlog) forces.push('Possui blog/conteúdo');
  else gaps.push('Sem blog ou seção de conteúdo');

  if (analysis.hasCases) forces.push('Seção de cases/sucesso');
  else gaps.push('Sem cases de sucesso');

  if (analysis.hasCareers) forces.push('Página de carreiras');
  else gaps.push('Sem página de carreiras');

  if (analysis.socialLinks.linkedin) forces.push('Presença no LinkedIn');
  if (analysis.socialLinks.instagram) forces.push('Presença no Instagram');
  if (analysis.socialLinks.youtube) forces.push('Canal no YouTube');

  const activeSocials = Object.values(analysis.socialLinks).filter(Boolean).length;
  if (activeSocials < 2) gaps.push('Presença limitada em redes sociais');

  if (Object.keys(analysis.innovationKeywords).length > 0) {
    forces.push('Menções a tecnologias inovadoras');
  }

  if (analysis.techIndicators.react || analysis.techIndicators.vue) forces.push('Stack tecnológica moderna');
  if (analysis.techIndicators.wordpress) gaps.push('Tecnologia básica (WordPress)');
  if (analysis.techIndicators.webflow) forces.push('Site profissional (Webflow)');

  if (analysis.wordCount > 1000) forces.push('Conteúdo substancial');
  else gaps.push('Conteúdo limitado');
  
  if (analysis.internalPages) {
    const pages = analysis.internalPages;
    const pageCount = Object.keys(pages).length;
    
    if (pageCount >= 5) forces.push('Site com múltiplas páginas internas bem estruturadas');
    else if (pageCount < 3) gaps.push('Site com poucas páginas internas');
    
    const pagesWithForms = Object.values(pages).filter(p => p.hasForm).length;
    if (pagesWithForms >= 2) forces.push('Múltiplos formulários de captura');
    
    let allTech = [];
    let allInnovation = [];
    Object.values(pages).forEach(p => {
      if (p.technologies) allTech.push(...p.technologies);
      if (p.innovationKeywords) allInnovation.push(...p.innovationKeywords);
    });
    
    const uniqueTech = [...new Set(allTech)];
    if (uniqueTech.length >= 3) forces.push(`Usa múltiplas ferramentas: ${uniqueTech.slice(0, 3).join(', ')}`);
  }

  return { forces: forces.slice(0, 6), gaps: gaps.slice(0, 6) };
}

function getMainFindings(analysis, scores) {
  const findings = [];

  if (analysis.hasHttps && scores.finalScore >= 60) {
    findings.push({ title: 'Site bem estruturado', description: 'Presença digital funcional com foco em segurança e conteúdo.' });
  }

  if (Object.keys(analysis.innovationKeywords).length > 3) {
    findings.push({ title: 'Forte messaging de inovação', description: 'Site demonstra consciência sobre tecnologias emergentes e transformação digital.' });
  }

  if (analysis.hasBlog && analysis.hasCases) {
    findings.push({ title: 'Estratégia de conteúdo consolidada', description: 'Presença de blog e cases indica comunicação madura com mercado.' });
  }

  const activeSocials = Object.values(analysis.socialLinks).filter(Boolean).length;
  if (activeSocials >= 3) {
    findings.push({ title: 'Presença omnichannel', description: 'Atuação em múltiplas plataformas digitais demonstra estratégia de comunicação diversificada.' });
  }

  if (analysis.techIndicators.react || analysis.techIndicators.vue || analysis.techIndicators.angular) {
    findings.push({ title: 'Stack tecnológica moderna', description: 'Uso de frameworks modernos indica investimento em tecnologia.' });
  } else if (analysis.techIndicators.wordpress) {
    findings.push({ title: 'Tecnologia simples', description: 'Uso de WordPress pode limitar possibilidades de diferenciação digital.' });
  }
  
  if (analysis.internalPages) {
    const pages = analysis.internalPages;
    let totalTech = [];
    Object.values(pages).forEach(p => {
      if (p.technologies) totalTech.push(...p.technologies);
    });
    const uniqueTech = [...new Set(totalTech)];
    
    if (uniqueTech.length >= 3) {
      findings.push({ title: 'Ecossistema digital maduro', description: `Utiliza ${uniqueTech.length} ferramentas digitais incluindo: ${uniqueTech.slice(0, 4).join(', ')}.` });
    }
    
    const pagesWithContact = Object.values(pages).filter(p => p.email || p.phone || p.address);
    if (pagesWithContact.length > 0) {
      findings.push({ title: 'Canais de contato identificados', description: `${pagesWithContact.length} página(s) com informações de contato visíveis.` });
    }
  }

  if (Object.keys(analysis.innovationKeywords).length < 2) {
    findings.push({ title: 'Oportunidade de fortalecer messaging', description: 'Recomendável comunicar mais sobre inovações e tecnologias utilizadas.' });
  }

  if (findings.length < 3) {
    findings.push({ title: 'Espaço para evolução digital', description: 'Há oportunidades de investimento em presença online e conteúdo.' });
    findings.push({ title: 'Recomendável estratégia de redes sociais', description: 'Expandir presença em redes pode aumentar alcance e engajamento.' });
  }

  return findings.slice(0, 5);
}

function getRecommendations(scores) {
  const short = [];
  const medium = [];
  const long = [];

  if (scores.presenceDigital < 70) {
    short.push('Otimizar SEO e experiência do usuário');
    medium.push('Implementar blog com estratégia de conteúdo');
  }

  if (scores.socialMedia < 70) {
    short.push('Definir estratégia de conteúdo para LinkedIn');
    medium.push('Expandir presença para Instagram e YouTube');
  }

  if (scores.cultureInnovation < 70) {
    short.push('Documentar metodologias e processos de inovação');
    medium.push('Criar programa de inovação aberta');
    long.push('Implementar IA em processos-chave');
  }

  if (scores.communication < 70) {
    short.push('Produzir conteúdo técnico regularmente');
    medium.push('Desenvolver cases de sucesso detalhados');
  }

  if (scores.transformation < 70) {
    medium.push('Automatizar processos de captura de leads');
    long.push('Implementar CRM e automação de marketing');
  }

  if (short.length === 0) short.push('Manter e evoluir práticas atuais');
  if (medium.length === 0) medium.push('Investir em diferenciação competitiva');
  if (long.length === 0) long.push('Explorar expansão internacional');

  return {
    short: short.slice(0, 3),
    medium: medium.slice(0, 3),
    long: long.slice(0, 3),
  };
}

module.exports = {
  calculateScores,
  getMaturityLevel,
  getForcesAndGaps,
  getMainFindings,
  getRecommendations,
};
