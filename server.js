const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const bodyParser = require('body-parser');
const requestIp = require('request-ip');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'guanabara_secret_key_2026';

// Middlewares
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

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// PostgreSQL Pool
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
    console.error('❌ Erro ao conectar ao PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado ao PostgreSQL com sucesso');
    release();
  }
});

// ===========================
// INICIALIZAÇÃO DO BANCO
// ===========================
async function initDatabase() {
  const client = await pool.connect();
  try {
    // LOGS
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

    // USUÁRIOS
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

    // TICKETS
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

    // BUSCAS
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

    // VISITANTES
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

    // CLIENTES
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

    // DESTINOS
    await client.query(`
      CREATE TABLE IF NOT EXISTS destinos (
        id SERIAL PRIMARY KEY,
        cidade VARCHAR(100) NOT NULL,
        estado VARCHAR(2),
        vendas INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'ativo'
      )
    `);

    // OFERTAS
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

    // SERVIÇOS
    await client.query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        status VARCHAR(20) DEFAULT 'ativo'
      )
    `);

    // PAGAMENTOS
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

    // CONFIGURAÇÕES
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

    // ADMIN PADRÃO
    const adminExists = await client.query('SELECT * FROM usuarios WHERE email = $1', ['admin@viajeguanabara.com']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await client.query(`
        INSERT INTO usuarios (nome, email, senha, role, status, cpf, telefone, ip, ultimo_acesso)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, ['Administrador', 'admin@viajeguanabara.com', hashedPassword, 'admin', 'online', '000.000.000-00', '(11) 99999-0000', '127.0.0.1', new Date().toISOString()]);
      console.log('✅ Admin criado: admin@viajeguanabara.com / admin123');
    }

    // DESTINOS INICIAIS
    const destinosCheck = await client.query('SELECT COUNT(*) FROM destinos');
    if (parseInt(destinosCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO destinos (cidade, estado, vendas, status) VALUES
        ('Rio de Janeiro', 'RJ', 152, 'ativo'),
        ('São Paulo', 'SP', 234, 'ativo'),
        ('Brasília', 'DF', 98, 'ativo'),
        ('Fortaleza', 'CE', 67, 'ativo'),
        ('Salvador', 'BA', 43, 'ativo'),
        ('Belo Horizonte', 'MG', 89, 'ativo'),
        ('Curitiba', 'PR', 56, 'ativo'),
        ('Porto Alegre', 'RS', 34, 'ativo')
      `);
      console.log('✅ Destinos iniciais criados');
    }

    // OFERTAS INICIAIS
    const ofertasCheck = await client.query('SELECT COUNT(*) FROM ofertas');
    if (parseInt(ofertasCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO ofertas (origem, destino, preco, desconto, validade, status) VALUES
        ('Rio de Janeiro', 'Brasília', 204.00, 15, '2026-08-31', 'ativo'),
        ('São Paulo', 'Rio de Janeiro', 180.00, 10, '2026-08-30', 'ativo'),
        ('Brasília', 'Salvador', 250.00, 20, '2026-09-15', 'ativo')
      `);
      console.log('✅ Ofertas iniciais criadas');
    }

    // SERVIÇOS INICIAIS
    const servicosCheck = await client.query('SELECT COUNT(*) FROM servicos');
    if (parseInt(servicosCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO servicos (nome, descricao, status) VALUES
        ('Wi-Fi a bordo', 'Internet gratuita durante a viagem', 'ativo'),
        ('Ar-condicionado', 'Climatização para seu conforto', 'ativo'),
        ('Banheiro a bordo', 'Banheiros limpos e confortáveis', 'ativo'),
        ('Poltronas reclináveis', 'Assentos confortáveis', 'ativo'),
        ('Tomada USB', 'Carregue seus dispositivos', 'ativo'),
        ('TV a bordo', 'Entretenimento durante a viagem', 'ativo')
      `);
      console.log('✅ Serviços iniciais criados');
    }

    // CONFIGURAÇÕES INICIAIS
    const configCheck = await client.query('SELECT COUNT(*) FROM configuracoes');
    if (parseInt(configCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO configuracoes (nome_site, manutencao, logs_ativos, notificacoes_email, alertas_seguranca, auto_update, update_interval)
        VALUES ('Viaje Guanabara', false, true, true, true, true, 10)
      `);
      console.log('✅ Configurações iniciais criadas');
    }

    console.log('✅ Banco de dados inicializado com sucesso');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err.message);
  } finally {
    client.release();
  }
}

initDatabase();

// ===========================
// MIDDLEWARE DE AUTENTICAÇÃO
// ===========================
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
  if (!token) return res.status(401).json({ error: 'Não autorizado' });
  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

// ===========================
// ROTAS PÚBLICAS
// ===========================

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    const validPassword = bcrypt.compareSync(senha, user.senha);
    if (!validPassword) {
      await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
        ['Sistema', 'login_falhou', req.clientIp || req.ip, 'Senha incorreta: ' + email]);
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    await pool.query('UPDATE usuarios SET ultimo_acesso = $1, ip = $2, status = $3 WHERE id = $4',
      [new Date().toISOString(), req.clientIp || req.ip, 'online', user.id]);

    await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
      ['Sistema', 'login', req.clientIp || req.ip, 'Login realizado: ' + user.nome]);

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

// REGISTRO
app.post('/api/register', async (req, res) => {
  const { nome, email, senha, telefone, cpf } = req.body;
  try {
    const existingEmail = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = bcrypt.hashSync(senha, 10);
    const result = await pool.query(`
      INSERT INTO usuarios (nome, email, senha, telefone, cpf, role, status, ip, ultimo_acesso)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, nome, email, role
    `, [nome, email, hashedPassword, telefone || '', cpf || '', 'user', 'online', req.clientIp || req.ip, new Date().toISOString()]);

    const user = result.rows[0];
    await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
      ['Sistema', 'cadastro', req.clientIp || req.ip, 'Novo usuário: ' + user.nome]);

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

// LOGOUT
app.post('/api/logout', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE usuarios SET status = $1 WHERE id = $2', ['offline', req.user.id]);
    await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
      ['Sistema', 'logout', req.clientIp || req.ip, 'Logout: ' + req.user.nome]);
    req.session.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// VISITANTE
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
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// BUSCA
app.post('/api/busca', async (req, res) => {
  try {
    const { origem, destino, data, passageiros } = req.body;
    await pool.query(`
      INSERT INTO buscas (origem, destino, data, passageiros, ip)
      VALUES ($1, $2, $3, $4, $5)
    `, [origem || 'Não informado', destino || 'Não informado', data || null, passageiros || 1, req.clientIp || req.ip]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE
app.post('/api/cliente', async (req, res) => {
  try {
    const { nome, cpf, telefone, email, qtdCriancas } = req.body;
    const result = await pool.query(`
      INSERT INTO clientes (nome, cpf, telefone, email, qtd_criancas, ip)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [nome, cpf, telefone, email, qtdCriancas || 0, req.clientIp || req.ip]);
    res.json({ success: true, cliente_id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// COMPRA
app.post('/api/compra', async (req, res) => {
  try {
    const { origem, destino, passageiro, data, valor, metodoPagamento } = req.body;
    const codigo = 'GV' + new Date().toISOString().slice(0,10).replace(/-/g,'') + String(Math.floor(Math.random()*1000)).padStart(3,'0');
    const result = await pool.query(`
      INSERT INTO tickets (codigo, origem, destino, passageiro, data, valor, status, metodo_pagamento, ip)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, codigo
    `, [codigo, origem, destino, passageiro, data, parseFloat(valor), 'confirmado', metodoPagamento || 'PIX', req.clientIp || req.ip]);
    await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
      ['Sistema', 'compra', req.clientIp || req.ip, 'Compra: ' + codigo + ' - ' + origem + ' -> ' + destino + ' - R$ ' + valor]);
    res.json({ success: true, ticket: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// ROTAS ADMIN
// ===========================

// DASHBOARD
app.get('/api/admin/dashboard', authenticate, isAdmin, async (req, res) => {
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
        totalTickets: parseInt(totalTickets.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].sum) || 0,
        totalBuscas: parseInt(totalBuscas.rows[0].count),
        totalVisitantes: parseInt(totalVisitantes.rows[0].count),
        totalClientes: parseInt(totalClientes.rows[0].count)
      },
      recentLogs: logs.rows,
      recentTickets: tickets.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// USUÁRIOS
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, telefone, cpf, status, ultimo_acesso, ip, role, criado_em FROM usuarios ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TICKETS
app.get('/api/admin/tickets', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DESTINOS
app.get('/api/admin/destinos', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM destinos ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/destinos', authenticate, isAdmin, async (req, res) => {
  try {
    const { cidade, estado, status } = req.body;
    const result = await pool.query(`
      INSERT INTO destinos (cidade, estado, status) VALUES ($1, $2, $3) RETURNING id
    `, [cidade, estado, status || 'ativo']);
    await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
      ['Sistema', 'criar_destino', req.clientIp || req.ip, 'Destino: ' + cidade]);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OFERTAS
app.get('/api/admin/ofertas', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ofertas ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/ofertas', authenticate, isAdmin, async (req, res) => {
  try {
    const { origem, destino, preco, desconto, validade, status } = req.body;
    const result = await pool.query(`
      INSERT INTO ofertas (origem, destino, preco, desconto, validade, status)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [origem, destino, preco, desconto || 0, validade, status || 'ativo']);
    await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
      ['Sistema', 'criar_oferta', req.clientIp || req.ip, 'Oferta: ' + origem + ' -> ' + destino]);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGS
app.get('/api/admin/logs', authenticate, isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const result = await pool.query('SELECT * FROM logs ORDER BY data DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/logs', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM logs');
    await pool.query('INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
      ['Sistema', 'limpeza_logs', req.clientIp || req.ip, 'Logs limpos por ' + req.user.nome]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// ROTAS DE PÁGINAS
// ===========================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin', 'index.html')));

// ===========================
// INICIALIZAÇÃO
// ===========================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================');
  console.log('  🚍 VIAJE GUANABARA - SISTEMA COMPLETO');
  console.log('  Servidor: http://localhost:' + PORT);
  console.log('  Admin: http://localhost:' + PORT + '/admin');
  console.log('  Login Admin: admin@viajeguanabara.com');
  console.log('  Senha: admin123');
  console.log('  PostgreSQL: ' + (process.env.DATABASE_URL ? '✅ Conectado' : '⚠️ Usando SQLite'));
  console.log('=================================================');
  console.log('');
});

module.exports = app;
