const axios = require('axios');
const cheerio = require('cheerio');

class SiteScraper {
  constructor(config = {}) {
    this.timeout = config.timeout || 15000;
    this.maxContentLength = config.maxContentLength || 500000;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async scrape(url) {
    console.log(`[Scraper] Raspando site: ${url}`);
    
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        maxBodyLength: Infinity
      });

      const $ = cheerio.load(response.data);
      
      const siteData = {
        url: url,
        companyName: this.extractCompanyName($, url),
        title: this.extractTitle($),
        description: this.extractDescription($),
        hero: this.extractHero($),
        features: this.extractFeatures($),
        benefits: this.extractBenefits($),
        technologies: this.extractTechnologies($),
        audience: this.extractAudience($),
        priceRange: this.extractPriceRange($),
        testimonials: this.extractTestimonials($),
        socialLinks: this.extractSocialLinks($),
        headings: this.extractHeadings($),
        keywords: this.extractKeywords($),
        mainContent: this.extractMainContent($),
        rawHtml: response.data.substring(0, this.maxContentLength)
      };

      console.log(`[Scraper] ✓ Site raspado com sucesso`);
      console.log(`[Scraper]   - Título: ${siteData.title}`);
      console.log(`[Scraper]   - Empresa: ${siteData.companyName}`);
      console.log(`[Scraper]   - Features encontradas: ${siteData.features.length}`);
      console.log(`[Scraper]   - Tecnologias: ${siteData.technologies.length}`);

      return siteData;

    } catch (error) {
      console.error(`[Scraper] ✗ Erro ao raspar site: ${error.message}`);
      throw new Error(`Falha ao raspar site: ${error.message}`);
    }
  }

  extractCompanyName($, url) {
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    if (ogSiteName) return ogSiteName;

    const appName = $('meta[property="al:ios:app_name"]').attr('content');
    if (appName) return appName;

    const title = this.extractTitle($);
    if (title) {
      const parts = title.split(/[-|]/);
      if (parts.length > 1) {
        return parts[0].trim();
      }
      return title;
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const name = hostname.split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return 'Empresa Desconhecida';
    }
  }

  extractTitle($) {
    return $('title').text().trim() || 
           $('meta[property="og:title"]').attr('content') || 
           $('h1').first().text().trim() || '';
  }

  extractDescription($) {
    return $('meta[name="description"]').attr('content') || 
           $('meta[property="og:description"]').attr('content') || '';
  }

  extractHero($) {
    const heroSelectors = [
      '.hero',
      '.hero-section',
      '.jumbotron',
      'header .container',
      '.banner',
      '.masthead',
      '[class*="hero"]',
      '[class*="banner"]'
    ];

    for (const selector of heroSelectors) {
      const hero = $(selector).first();
      if (hero.length) {
        const text = hero.text().trim();
        if (text.length > 20) {
          return text.replace(/\s+/g, ' ').substring(0, 500);
        }
      }
    }

    const h1 = $('h1').first().text().trim();
    if (h1) return h1;

    return $('meta[property="og:title"]').attr('content') || '';
  }

  extractFeatures($) {
    const features = [];
    
    const featureSelectors = [
      '[class*="feature"]',
      '[class*="funcionalidad"]',
      '[class*="benefit"]',
      '[class*="capability"]',
      '.services li',
      '.products li',
      '[class*="product"]',
      '[class*="service"]',
      'ul.features li',
      '.what-we-do li'
    ];

    for (const selector of featureSelectors) {
      $(selector).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 5 && text.length < 200 && !features.includes(text)) {
          features.push(text);
        }
      });
    }

    const lists = $('ul, ol');
    lists.each((i, list) => {
      const listItems = $(list).find('li');
      if (listItems.length >= 3) {
        listItems.each((j, item) => {
          const text = $(item).text().trim();
          if (text.length > 5 && text.length < 200 && !features.includes(text)) {
            features.push(text);
          }
        });
      }
    });

    return [...new Set(features)].slice(0, 50);
  }

  extractBenefits($) {
    const benefits = [];
    
    const benefitSelectors = [
      '[class*="benefit"]',
      '[class*="vantagem"]',
      '[class*="resultad"]',
      '[class*="outcome"]',
      '[class*="value"]',
      '.advantages li',
      '.benefits li',
      '.why-us li'
    ];

    for (const selector of benefitSelectors) {
      $(selector).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 5 && text.length < 200 && !benefits.includes(text)) {
          benefits.push(text);
        }
      });
    }

    return [...new Set(benefits)].slice(0, 30);
  }

  extractTechnologies($) {
    const technologies = [];
    const techPatterns = [
      /react|reactjs|react\.js/gi,
      /vue|vuejs|vue\.js/gi,
      /angular/gi,
      /node|nodejs|node\.js/gi,
      /python/gi,
      /java(?!script)/gi,
      /typescript/gi,
      /javascript|js\b/gi,
      /php/gi,
      /ruby|ruby on rails/gi,
      /golang|go\s+language/gi,
      /swift/gi,
      /kotlin/gi,
      /flutter/gi,
      /react\s*native/gi,
      /\.net|dotnet/gi,
      /aws|amazon\s*web\s*services/gi,
      /azure/gi,
      /gcp|google\s*cloud/gi,
      /heroku/gi,
      /vercel/gi,
      /netlify/gi,
      /docker/gi,
      /kubernetes|k8s/gi,
      /graphql/gi,
      /mongodb|mongo/gi,
      /postgresql|postgres/gi,
      /mysql/gi,
      /redis/gi,
      /elasticsearch|elastic/gi,
      /tensorflow/gi,
      /pytorch/gi,
      /openai|chatgpt|gpt-/gi,
      /machine\s*learning|ml\b/gi,
      /artificial\s*intelligence|ai\b/gi,
      /wordpress|wp\b/gi,
      /shopify/gi,
      /vtex/gi,
      /hubspot/gi,
      /salesforce/gi,
      /stripe/gi,
      /twilio/gi,
      /sendgrid/gi
    ];

    const html = $.html().toLowerCase();
    
    for (const pattern of techPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        const tech = this.normalizeTechName(matches[0]);
        if (!technologies.includes(tech)) {
          technologies.push(tech);
        }
      }
    }

    const metaTech = $('meta[name="technology"]').attr('content');
    if (metaTech) {
      metaTech.split(',').forEach(tech => {
        const normalized = this.normalizeTechName(tech.trim());
        if (!technologies.includes(normalized)) {
          technologies.push(normalized);
        }
      });
    }

    return [...new Set(technologies)];
  }

  normalizeTechName(tech) {
    const normalizations = {
      'reactjs': 'React',
      'react.js': 'React',
      'react .js': 'React',
      'vuejs': 'Vue.js',
      'vue.js': 'Vue.js',
      'nodejs': 'Node.js',
      'node.js': 'Node.js',
      'python': 'Python',
      'javascript': 'JavaScript',
      'java': 'Java',
      'typescript': 'TypeScript',
      'golang': 'Go',
      'aws': 'AWS',
      'gcp': 'Google Cloud',
      'ml': 'Machine Learning',
      'ai': 'AI',
      'wp': 'WordPress',
      '.net': '.NET',
      'dotnet': '.NET',
      'postgresql': 'PostgreSQL',
      'postgres': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'mongo': 'MongoDB'
    };
    
    const lower = tech.toLowerCase().trim();
    return normalizations[lower] || tech.charAt(0).toUpperCase() + tech.slice(1).toLowerCase();
  }

  extractAudience($) {
    const audiences = [];
    
    const audiencePatterns = [
      { pattern: /pm[eé]|pequena\s*e\s*média|pequenas\s*empresas|pequeno\s*neg[óo]cio/gi, value: 'pme' },
      { pattern: /startup|start-up/gi, value: 'startup' },
      { pattern: /enterprise|grande\s*empresa|multinacional|corpora[çc][ãa]o/gi, value: 'enterprise' },
      { pattern: /b2b|b-to-b|empresa\s*para\s*empresa/gi, value: 'b2b' },
      { pattern: /b2c|b-to-c|consumidor\s*final|pessoa\s*f[ií]sica/gi, value: 'b2c' },
      { pattern: /ecommerce?|loja\s*virtual|com[eé]rcio\s*eletr[ôo]nico/gi, value: 'ecommerce' },
      { pattern: /desenvolvedor|developer|programador|dev\b/gi, value: 'developer' },
      { pattern: /ag[êe]ncia|agência\s*de\s*marketing|marketing\s*digital/gi, value: 'agency' },
      { pattern: /educa[çc][ãa]o|curso|ead|escola|universidade|treinamento/gi, value: 'educacao' },
      { pattern: /sa[úu]de|hospital|cl[ií]nica|m[eé]dico/gi, value: 'saude' },
      { pattern: /imobili[áa]ria|im[óo]vel|constru[çc][ãa]o/gi, value: 'imobiliario' },
      { pattern: /restaurante|food|bebida|gastronomia|bar\s*e\s*restaurante/gi, value: 'food' },
      { pattern: /ecommerce?|loja\s*online|venda\s*online/gi, value: 'ecommerce' }
    ];

    const text = $('body').text().toLowerCase();
    
    for (const { pattern, value } of audiencePatterns) {
      if (pattern.test(text)) {
        if (!audiences.includes(value)) {
          audiences.push(value);
        }
      }
    }

    return audiences;
  }

  extractPriceRange($) {
    const text = $('body').text().toLowerCase();
    
    const pricePatterns = [
      { pattern: /gr[áa]tis|free\s*plan|plan\s*gr[áa]tis|forever\s*free/gi, value: 'free' },
      { pattern: /sob\s*consulta|contact\s*sales|enterprise|personalizado/gi, value: 'enterprise' },
      { pattern: /r\$\s*\d+\.?\d*\s*(?:\/|a\s*m[ée]s)|\$\d+\s*(?:\/|per\s*month)|\d+\s*d[óo]lares?\s*(?:\/|a\s*month)|\$\d+\/m/gi, value: '$' },
      { pattern: /r\$\s*\d{2,}\.?\d*\s*(?:\/|a\s*m[ée]s)|\$\d{2,}\s*(?:\/|per\s*month)/gi, value: '$$' },
      { pattern: /r\$\s*\d{3,}\.?\d*\s*(?:\/|a\s*m[ée]s)|\$\d{3,}\s*(?:\/|per\s*month)/gi, value: '$$$' }
    ];

    for (const { pattern, value } of pricePatterns) {
      if (pattern.test(text)) {
        return value;
      }
    }

    return 'unknown';
  }

  extractTestimonials($) {
    const testimonials = [];
    
    const testimonialSelectors = [
      '[class*="testimonial"]',
      '[class*="review"]',
      '[class*="depoimento"]',
      '[class*="avalia"]',
      '.quote',
      '.testimonial-quote'
    ];

    for (const selector of testimonialSelectors) {
      $(selector).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 20 && text.length < 500 && !testimonials.includes(text)) {
          testimonials.push(text);
        }
      });
    }

    return testimonials.slice(0, 10);
  }

  extractSocialLinks($) {
    const socialLinks = {};
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      const hrefLower = href.toLowerCase();
      
      if (hrefLower.includes('linkedin.com')) {
        socialLinks.linkedin = href;
      } else if (hrefLower.includes('instagram.com')) {
        socialLinks.instagram = href;
      } else if (hrefLower.includes('facebook.com')) {
        socialLinks.facebook = href;
      } else if (hrefLower.includes('twitter.com') || hrefLower.includes('x.com')) {
        socialLinks.twitter = href;
      } else if (hrefLower.includes('youtube.com')) {
        socialLinks.youtube = href;
      } else if (hrefLower.includes('github.com')) {
        socialLinks.github = href;
      }
    });

    return socialLinks;
  }

  extractHeadings($) {
    const headings = [];
    
    $('h1, h2, h3').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 2) {
        headings.push(text);
      }
    });

    return headings;
  }

  extractKeywords($) {
    const keywords = [];
    
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    if (metaKeywords) {
      keywords.push(...metaKeywords.split(',').map(k => k.trim()).filter(k => k.length > 2));
    }

    const metaTags = $('meta[property="article:tag"]');
    metaTags.each((i, el) => {
      const tag = $(el).attr('content');
      if (tag && !keywords.includes(tag)) {
        keywords.push(tag);
      }
    });

    return [...new Set(keywords)];
  }

  extractMainContent($) {
    const $body = $('body');
    
    $body.find('script, style, nav, header, footer, aside, .sidebar, .menu, .nav, .cookie, .popup, .modal').remove();
    
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '.container',
      '.page-content'
    ];

    for (const selector of mainSelectors) {
      const content = $(selector).first();
      if (content.length) {
        const text = content.text().trim();
        if (text.length > 100) {
          return text.replace(/\s+/g, ' ').substring(0, this.maxContentLength);
        }
      }
    }

    return $body.text().replace(/\s+/g, ' ').trim().substring(0, this.maxContentLength);
  }
}

module.exports = SiteScraper;
