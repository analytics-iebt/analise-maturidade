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
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const analysisId = Date.now().toString();

    const progress = {
        steps: {
            1: { status: 'active', message: 'Buscando site...' },
            2: { status: 'pending', message: 'Analisando conteudo...' },
            3: { status: 'pending', message: 'Raspando paginas internas...' },
            4: { status: 'pending', message: 'Analisando redes sociais...' },
            5: { status: 'pending', message: 'Classificando setor...' },
            6: { status: 'pending', message: 'Calculando scores...' },
            7: { status: 'pending', message: 'Gerando relatorio HTML...' }
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
        if (llmConfig) {
            console.log(`[${new Date().toLocaleTimeString()}] Usando LLM: ${llmConfig.provider.toUpperCase()} (${llmConfig.model})`);
        }

        const updateStep = (stepNum, status, message) => {
            progress.steps[stepNum] = { status, message };
            progress.currentStep = stepNum;
            console.log(`[Progress] Step ${stepNum}: ${status} - ${message}`);
            if (status === 'done' && stepNum < 7) {
                progress.steps[stepNum + 1] = { status: 'active', message: progress.steps[stepNum + 1]?.message || '' };
                progress.currentStep = stepNum + 1;
            }
        };

        const result = await analyzeSite(normalizedUrl, llmConfig, { updateStep });

        updateStep(7, 'done', 'Relatorio gerado com sucesso!');
        
        const timestamp = Date.now();
        const filename = `relatorio-${timestamp}.html`;
        const filepath = path.join(reportsDir, filename);

        fs.writeFileSync(filepath, result.html);
        
        progress.completed = true;
        progress.result = {
            success: true,
            filename: filename,
            url: normalizedUrl,
            scores: result.llmResult.scores,
            maturity: result.llmResult.maturidade,
            using_llm: isLLMEnabled(),
            provider: getProviderName(),
        };

        console.log(`[${new Date().toLocaleTimeString()}] Relatório gerado: ${filename}`);
        console.log(`[${new Date().toLocaleTimeString()}] Score: ${result.llmResult.scores.finalScore}/100`);

        res.json({ 
            success: true,
            analysisId,
            steps: progress.steps,
            completed: true,
            filename: filename,
            url: normalizedUrl,
            scores: result.llmResult.scores,
            maturity: result.llmResult.maturidade,
            using_llm: isLLMEnabled(),
            provider: getProviderName(),
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
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('EMAIL_USER or EMAIL_PASS not configured');
            return res.status(500).json({ 
                error: 'Configuração de email incompleta',
                details: 'As variáveis EMAIL_USER e EMAIL_PASS precisam estar configuradas no servidor'
            });
        }
        
        const nodemailer = require('nodemailer');
        const htmlPdf = require('html-pdf-node');
        
        const pdfBuffer = await htmlPdf.file({
            content: reportHtml,
            name: `relatorio-${companyName || 'analise'}.pdf`,
            format: 'A4',
            printOptions: {
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
            }
        }).toBuffer();
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Relatório de Maturidade de Inovação - ${companyName || 'Análise'}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #2563eb;">Relatório de Maturidade de Inovação</h2>
                    <p>Olá,</p>
                    <p>Segue em anexo o relatório de maturidade de inovação para <strong>${companyName || 'a empresa analisada'}</strong>.</p>
                    <p>Este relatório contém:</p>
                    <ul>
                        <li>Análise das 5 dimensões de inovação</li>
                        <li>Pontuação detalhada e benchmark competitivo</li>
                        <li>Recomendações de melhoria</li>
                        <li>Análise comparativa com o setor</li>
                    </ul>
                    <p>Atenciosamente,<br>Equipe IEBT Inovação</p>
                </div>
            `,
            attachments: [
                {
                    filename: `relatorio-maturidade-${(companyName || 'analise').replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
                    content: pdfBuffer
                }
            ]
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ success: true, message: 'Email enviado com sucesso!' });
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        res.status(500).json({ 
            error: 'Erro ao enviar email',
            details: error.message 
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
