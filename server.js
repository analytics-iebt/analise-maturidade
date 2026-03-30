const express = require('express');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const { analyzeSite } = require('./functions/analyzeSite');

const app = express();
const PORT = process.env.PORT || 3000;
const LLM_PROVIDER = process.env.LLM_PROVIDER || null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const GROQ_API_KEY = process.env.GROQ_API_KEY || null;
const MODEL = process.env.MODEL || 'llama-3.3-70b-versatile';
const TEMPERATURE = parseFloat(process.env.TEMPERATURE) || 0.7;

function getLLMConfig() {
    if (LLM_PROVIDER === 'groq' && GROQ_API_KEY) {
        return { provider: 'groq', apiKey: GROQ_API_KEY, model: MODEL, temperature: TEMPERATURE };
    }
    if (LLM_PROVIDER === 'openai' && OPENAI_API_KEY) {
        return { provider: 'openai', apiKey: OPENAI_API_KEY, model: MODEL, temperature: TEMPERATURE };
    }
    return null;
}

function isLLMEnabled() {
    return getLLMConfig() !== null;
}

function getProviderName() {
    const config = getLLMConfig();
    return config ? config.provider.toUpperCase() : 'Regras';
}

const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
};

app.use(corsMiddleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        llm_enabled: isLLMEnabled(),
        provider: getProviderName(),
        model: MODEL,
        message: isLLMEnabled() 
            ? `LLM ativado (${getProviderName()}) - análises serão geradas por inteligência artificial` 
            : 'LLM desativado - usando análise baseada em regras'
    });
});

const analysisProgress = new Map();

app.get('/api/progress/:analysisId', (req, res) => {
    const { analysisId } = req.params;
    
    const progress = analysisProgress.get(analysisId);
    
    if (!progress) {
        console.log(`[Progress] ID ${analysisId} nao encontrado`);
        return res.json({ steps: {}, completed: false });
    }

    console.log(`[Progress] Enviando progresso para ${analysisId}:`, JSON.stringify(progress.steps));
    res.json(progress);
});

app.post('/api/analyze', async (req, res) => {
    const { url, lead } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const analysisId = Date.now().toString();

    const progress = {
        steps: {
            1: { status: 'active', message: 'Salvando seus dados...' },
            2: { status: 'pending', message: 'Buscando site...' },
            3: { status: 'pending', message: 'Analisando conteudo...' },
            4: { status: 'pending', message: 'Analisando redes sociais...' },
            5: { status: 'pending', message: 'Calculando benchmark...' },
            6: { status: 'pending', message: 'Gerando relatorio PDF...' }
        },
        completed: false,
        currentStep: 1
    };

    analysisProgress.set(analysisId, progress);

    try {
        let normalizedUrl = url.trim();
        
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        new URL(normalizedUrl);

        const llmConfig = getLLMConfig();
        
        console.log(`[${new Date().toLocaleTimeString()}] Análise iniciada: ${normalizedUrl}`);
        if (lead) {
            console.log(`[${new Date().toLocaleTimeString()}] Lead: ${lead.nome} - ${lead.empresa}`);
        }
        if (llmConfig) {
            console.log(`[${new Date().toLocaleTimeString()}] Usando LLM: ${llmConfig.provider.toUpperCase()} (${llmConfig.model})`);
        }

        const updateStep = (stepNum, status, message) => {
            progress.steps[stepNum] = { status, message };
            progress.currentStep = stepNum;
            console.log(`[Progress] Step ${stepNum}: ${status} - ${message}`);
            if (status === 'done' && stepNum < 6) {
                progress.steps[stepNum + 1] = { status: 'active', message: progress.steps[stepNum + 1]?.message || '' };
                progress.currentStep = stepNum + 1;
            }
        };

        const result = await analyzeSite(normalizedUrl, llmConfig, { updateStep }, lead);

        updateStep(6, 'done', 'Relatorio gerado com sucesso!');
        
        progress.completed = true;
        progress.result = {
            success: true,
            url: normalizedUrl,
            scores: result.llmResult.scores,
            maturity: result.llmResult.maturidade,
            using_llm: isLLMEnabled(),
            provider: getProviderName(),
            reportHtml: result.html,
            lead: lead
        };

        console.log(`[${new Date().toLocaleTimeString()}] Relatório gerado`);
        console.log(`[${new Date().toLocaleTimeString()}] Score: ${result.llmResult.scores.finalScore}/100`);

        res.json({ 
            success: true,
            analysisId,
            steps: progress.steps,
            completed: true,
            url: normalizedUrl,
            scores: result.llmResult.scores,
            maturity: result.llmResult.maturidade,
            using_llm: isLLMEnabled(),
            provider: getProviderName(),
            reportHtml: result.html
        });

    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Erro:`, error.message);
        const progress = analysisProgress.get(analysisId);
        if (progress) {
            progress.completed = true;
            progress.error = error.message;
        }
        res.status(500).json({ 
            error: 'Erro ao analisar site',
            details: error.message 
        });
    }
});

app.get('/reports/:filename', (req, res) => {
    const { filename } = req.params;
    
    if (!filename || !filename.includes('.html') || filename.includes('..')) {
        return res.status(400).json({ error: 'Nome de arquivo inválido' });
    }
    
    const filepath = path.join(reportsDir, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    res.sendFile(filepath);
});

app.get('/api/reports', (req, res) => {
    if (!fs.existsSync(reportsDir)) {
        return res.json({ reports: [] });
    }

    const files = fs.readdirSync(reportsDir)
        .filter(f => f.endsWith('.html'))
        .map(f => ({
            filename: f,
            created: fs.statSync(path.join(reportsDir, f)).mtime,
            size: fs.statSync(path.join(reportsDir, f)).size
        }))
        .sort((a, b) => b.created - a.created);

    res.json({ reports: files.slice(0, 20) });
});

app.post('/api/send-email', async (req, res) => {
    const { email, reportHtml, companyName } = req.body;
    
    if (!email || !reportHtml) {
        return res.status(400).json({ error: 'Email e relatório são obrigatórios' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
    }
    
    try {
        console.log('=== INICIANDO ENVIO DE EMAIL ===');
        console.log('Configuração RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'CONFIGURADO' : 'FALTANDO');
        
        if (!process.env.RESEND_API_KEY) {
            console.error('RESEND_API_KEY não configurada');
            return res.status(500).json({ 
                error: 'Configuração de email incompleta',
                details: 'A variável RESEND_API_KEY precisa estar configurada no servidor. Cadastre-se em https://resend.com'
            });
        }
        
        const { Resend } = require('resend');
        const puppeteer = require('puppeteer-core');
        const chromium = require('@sparticuz/chromium');
        console.log('Etapa 1: Módulos carregados');
        
        console.log('Etapa 2: Gerando PDF...');
        let safeName = (companyName || 'analise').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
        
        let pdfBuffer;
        let isPdfSuccess = false;
        try {
            chromium.setHeadlessMode = true;
            chromium.setGraphicsMode = false;
            
            const browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless
            });
            
            const page = await browser.newPage();
            await page.setContent(reportHtml, { waitUntil: 'networkidle0' });
            await page.emulateMediaType('screen');
            
            pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
            });
            
            await browser.close();
            console.log('Etapa 3: PDF gerado com sucesso!');
            safeName = safeName + '.pdf';
            isPdfSuccess = true;
        } catch (pdfError) {
            console.error('Erro ao gerar PDF com Chromium:', pdfError.message);
            console.log('Fallback: enviando HTML ao invés de PDF');
            pdfBuffer = Buffer.from(reportHtml, 'utf-8');
            safeName = safeName + '.html';
        }
        
        const resend = new Resend(process.env.RESEND_API_KEY);
        console.log('Etapa 4: Enviando email para:', email);
        
        const isHtmlFallback = !isPdfSuccess;
        
        const attachmentContent = Buffer.isBuffer(pdfBuffer) ? pdfBuffer.toString('base64') : (typeof pdfBuffer === 'string' ? Buffer.from(pdfBuffer).toString('base64') : pdfBuffer);
        
        const { data, error } = await resend.emails.send({
            from: 'IEBT Inovação <onboarding@resend.dev>',
            to: [email],
            subject: `Relatório de Maturidade de Inovação - ${companyName || 'Análise'}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 1.5rem;">Relatório de Maturidade de Inovação</h1>
                    </div>
                    <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
                        <h2 style="color: #1e3a5f;">Olá!</h2>
                        <p>Segue o relatório de maturidade de inovação para <strong>${companyName || 'a empresa analisada'}</strong>.</p>
                        <p>Este relatório contém:</p>
                        <ul>
                            <li>Análise das 5 dimensões de inovação</li>
                            <li>Pontuação detalhada e benchmark competitivo</li>
                            <li>Recomendações de melhoria</li>
                            <li>Análise comparativa com o setor</li>
                        </ul>
                        <p><strong>Relatório em anexo!</strong> ${isHtmlFallback ? 'Abra o arquivo HTML em qualquer navegador.' : 'Abra o arquivo PDF em qualquer leitor de PDF.'}</p>
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                        <p style="color: #6c757d; font-size: 0.9rem;">Atenciosamente,<br><strong>Equipe IEBT Inovação</strong></p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `relatorio-maturidade-${safeName}`,
                    content: attachmentContent
                }
            ]
        });
        
        console.log('Etapa 5: Resposta do Resend:', data, error);
        
        if (error) {
            console.error('Erro do Resend:', JSON.stringify(error, null, 2));
            let errorMessage = 'Erro ao enviar email';
            if (error.message) errorMessage = error.message;
            if (error.code === 'missing_required_parameter') errorMessage = 'Parâmetros obrigatórios faltando';
            if (error.code === 'invalid_parameter') errorMessage = 'Parâmetro inválido: ' + (error.field || '');
            if (error.message?.includes('not authorized') || error.message?.includes('only send testing emails')) {
                errorMessage = 'Domínio não verificado. Acesse resend.com/domains para verificar um domínio e enviar para outros emails.';
            }
            
            return res.status(500).json({ 
                error: 'Erro ao enviar email',
                details: errorMessage,
                code: error.code || 'RESEND_ERROR'
            });
        }
        
        console.log('=== EMAIL ENVIADO COM SUCESSO ===');
        console.log('Email ID:', data?.id);
        res.json({ success: true, message: 'Email enviado com sucesso!', emailId: data?.id });
    } catch (error) {
        console.error('=== ERRO COMPLETO ===');
        console.error('Nome do erro:', error.name);
        console.error('Mensagem do erro:', error.message);
        console.error('Código do erro:', error.code);
        console.error('Erro completo:', JSON.stringify(error, null, 2));
        res.status(500).json({ 
            error: 'Erro ao enviar email',
            details: error.message || 'Erro desconhecido',
            code: error.code || 'SEM_CODIGO',
            name: error.name || 'Erro'
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Analisador de Maturidade de Inovação                    ║
║                                                            ║
║   Servidor rodando em: http://localhost:${PORT}              ║
║                                                            ║
║   LLM: ${isLLMEnabled() ? 'Ativado (' + getProviderName() + ' - ' + MODEL + ')' : 'Desativado (regras)'}     ║
║                                                            ║
║   Acesse no navegador para analisar sites!                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});
