const cidadesBrasil = [
    
    // ACRE
    { cidade: 'Rio Branco', estado: 'AC', rodoviaria: 'Rodoviária Internacional de Rio Branco' },
    { cidade: 'Cruzeiro do Sul', estado: 'AC', rodoviaria: 'Rodoviária de Cruzeiro do Sul' },
    { cidade: 'Sena Madureira', estado: 'AC', rodoviaria: 'Rodoviária de Sena Madureira' },
    { cidade: 'Tarauacá', estado: 'AC', rodoviaria: 'Rodoviária de Tarauacá' },
    { cidade: 'Feijó', estado: 'AC', rodoviaria: 'Rodoviária de Feijó' },
    
    // AMAPÁ
    { cidade: 'Macapá', estado: 'AP', rodoviaria: 'Rodoviária de Macapá' },
    { cidade: 'Santana', estado: 'AP', rodoviaria: 'Rodoviária de Santana' },
    { cidade: 'Laranjal do Jari', estado: 'AP', rodoviaria: 'Rodoviária de Laranjal do Jari' },
    { cidade: 'Oiapoque', estado: 'AP', rodoviaria: 'Rodoviária de Oiapoque' },
    
    // AMAZONAS
    { cidade: 'Manaus', estado: 'AM', rodoviaria: 'Rodoviária de Manaus' },
    { cidade: 'Parintins', estado: 'AM', rodoviaria: 'Rodoviária de Parintins' },
    { cidade: 'Itacoatiara', estado: 'AM', rodoviaria: 'Rodoviária de Itacoatiara' },
    { cidade: 'Manacapuru', estado: 'AM', rodoviaria: 'Rodoviária de Manacapuru' },
    { cidade: 'Coari', estado: 'AM', rodoviaria: 'Rodoviária de Coari' },
    { cidade: 'Humaitá', estado: 'AM', rodoviaria: 'Rodoviária de Humaitá' },
    { cidade: 'Tefé', estado: 'AM', rodoviaria: 'Rodoviária de Tefé' },
    
    // PARÁ
    { cidade: 'Belém', estado: 'PA', rodoviaria: 'Rodoviária de Belém' },
    { cidade: 'Santarém', estado: 'PA', rodoviaria: 'Rodoviária de Santarém' },
    { cidade: 'Marabá', estado: 'PA', rodoviaria: 'Rodoviária de Marabá' },
    { cidade: 'Castanhal', estado: 'PA', rodoviaria: 'Rodoviária de Castanhal' },
    { cidade: 'Parauapebas', estado: 'PA', rodoviaria: 'Rodoviária de Parauapebas' },
    { cidade: 'Altamira', estado: 'PA', rodoviaria: 'Rodoviária de Altamira' },
    { cidade: 'Barcarena', estado: 'PA', rodoviaria: 'Rodoviária de Barcarena' },
    { cidade: 'Ananindeua', estado: 'PA', rodoviaria: 'Rodoviária de Ananindeua' },
    { cidade: 'Tailândia', estado: 'PA', rodoviaria: 'Rodoviária de Tailândia' },
    { cidade: 'Redenção', estado: 'PA', rodoviaria: 'Rodoviária de Redenção' },
    
    // RONDÔNIA
    { cidade: 'Porto Velho', estado: 'RO', rodoviaria: 'Rodoviária de Porto Velho' },
    { cidade: 'Ji-Paraná', estado: 'RO', rodoviaria: 'Rodoviária de Ji-Paraná' },
    { cidade: 'Ariquemes', estado: 'RO', rodoviaria: 'Rodoviária de Ariquemes' },
    { cidade: 'Cacoal', estado: 'RO', rodoviaria: 'Rodoviária de Cacoal' },
    { cidade: 'Vilhena', estado: 'RO', rodoviaria: 'Rodoviária de Vilhena' },
    { cidade: 'Guajará-Mirim', estado: 'RO', rodoviaria: 'Rodoviária de Guajará-Mirim' },
    
    // RORAIMA
    { cidade: 'Boa Vista', estado: 'RR', rodoviaria: 'Rodoviária de Boa Vista' },
    { cidade: 'Rorainópolis', estado: 'RR', rodoviaria: 'Rodoviária de Rorainópolis' },
    { cidade: 'Caracaraí', estado: 'RR', rodoviaria: 'Rodoviária de Caracaraí' },
    
    // TOCANTINS
    { cidade: 'Palmas', estado: 'TO', rodoviaria: 'Rodoviária de Palmas' },
    { cidade: 'Araguaína', estado: 'TO', rodoviaria: 'Rodoviária de Araguaína' },
    { cidade: 'Gurupi', estado: 'TO', rodoviaria: 'Rodoviária de Gurupi' },
    { cidade: 'Porto Nacional', estado: 'TO', rodoviaria: 'Rodoviária de Porto Nacional' },
    { cidade: 'Paraíso do Tocantins', estado: 'TO', rodoviaria: 'Rodoviária de Paraíso do Tocantins' },
    
    // ========== NORDESTE ==========
    // ALAGOAS
    { cidade: 'Maceió', estado: 'AL', rodoviaria: 'Rodoviária de Maceió' },
    { cidade: 'Arapiraca', estado: 'AL', rodoviaria: 'Rodoviária de Arapiraca' },
    { cidade: 'Rio Largo', estado: 'AL', rodoviaria: 'Rodoviária de Rio Largo' },
    { cidade: 'Palmeira dos Índios', estado: 'AL', rodoviaria: 'Rodoviária de Palmeira dos Índios' },
    { cidade: 'Penedo', estado: 'AL', rodoviaria: 'Rodoviária de Penedo' },
    
    // BAHIA
    { cidade: 'Salvador', estado: 'BA', rodoviaria: 'Rodoviária de Salvador' },
    { cidade: 'Feira de Santana', estado: 'BA', rodoviaria: 'Rodoviária de Feira de Santana' },
    { cidade: 'Vitória da Conquista', estado: 'BA', rodoviaria: 'Rodoviária de Vitória da Conquista' },
    { cidade: 'Camaçari', estado: 'BA', rodoviaria: 'Rodoviária de Camaçari' },
    { cidade: 'Ilhéus', estado: 'BA', rodoviaria: 'Rodoviária de Ilhéus' },
    { cidade: 'Juazeiro', estado: 'BA', rodoviaria: 'Rodoviária de Juazeiro' },
    { cidade: 'Itabuna', estado: 'BA', rodoviaria: 'Rodoviária de Itabuna' },
    { cidade: 'Lauro de Freitas', estado: 'BA', rodoviaria: 'Rodoviária de Lauro de Freitas' },
    { cidade: 'Barreiras', estado: 'BA', rodoviaria: 'Rodoviária de Barreiras' },
    { cidade: 'Jequié', estado: 'BA', rodoviaria: 'Rodoviária de Jequié' },
    { cidade: 'Alagoinhas', estado: 'BA', rodoviaria: 'Rodoviária de Alagoinhas' },
    { cidade: 'Eunápolis', estado: 'BA', rodoviaria: 'Rodoviária de Eunápolis' },
    { cidade: 'Teixeira de Freitas', estado: 'BA', rodoviaria: 'Rodoviária de Teixeira de Freitas' },
    { cidade: 'Porto Seguro', estado: 'BA', rodoviaria: 'Rodoviária de Porto Seguro' },
    
    // CEARÁ
    { cidade: 'Fortaleza', estado: 'CE', rodoviaria: 'Rodoviária de Fortaleza' },
    { cidade: 'Caucaia', estado: 'CE', rodoviaria: 'Rodoviária de Caucaia' },
    { cidade: 'Juazeiro do Norte', estado: 'CE', rodoviaria: 'Rodoviária de Juazeiro do Norte' },
    { cidade: 'Maracanaú', estado: 'CE', rodoviaria: 'Rodoviária de Maracanaú' },
    { cidade: 'Sobral', estado: 'CE', rodoviaria: 'Rodoviária de Sobral' },
    { cidade: 'Crato', estado: 'CE', rodoviaria: 'Rodoviária de Crato' },
    { cidade: 'Itapipoca', estado: 'CE', rodoviaria: 'Rodoviária de Itapipoca' },
    { cidade: 'Quixadá', estado: 'CE', rodoviaria: 'Rodoviária de Quixadá' },
    { cidade: 'Iguatu', estado: 'CE', rodoviaria: 'Rodoviária de Iguatu' },
    
    // MARANHÃO
    { cidade: 'São Luís', estado: 'MA', rodoviaria: 'Rodoviária de São Luís' },
    { cidade: 'Imperatriz', estado: 'MA', rodoviaria: 'Rodoviária de Imperatriz' },
    { cidade: 'São José de Ribamar', estado: 'MA', rodoviaria: 'Rodoviária de São José de Ribamar' },
    { cidade: 'Timon', estado: 'MA', rodoviaria: 'Rodoviária de Timon' },
    { cidade: 'Caxias', estado: 'MA', rodoviaria: 'Rodoviária de Caxias' },
    { cidade: 'Codó', estado: 'MA', rodoviaria: 'Rodoviária de Codó' },
    { cidade: 'Bacabal', estado: 'MA', rodoviaria: 'Rodoviária de Bacabal' },
    { cidade: 'Pinheiro', estado: 'MA', rodoviaria: 'Rodoviária de Pinheiro' },
    
    // PARAÍBA
    { cidade: 'João Pessoa', estado: 'PB', rodoviaria: 'Rodoviária de João Pessoa' },
    { cidade: 'Campina Grande', estado: 'PB', rodoviaria: 'Rodoviária de Campina Grande' },
    { cidade: 'Santa Rita', estado: 'PB', rodoviaria: 'Rodoviária de Santa Rita' },
    { cidade: 'Patos', estado: 'PB', rodoviaria: 'Rodoviária de Patos' },
    { cidade: 'Bayeux', estado: 'PB', rodoviaria: 'Rodoviária de Bayeux' },
    { cidade: 'Sousa', estado: 'PB', rodoviaria: 'Rodoviária de Sousa' },
    { cidade: 'Cajazeiras', estado: 'PB', rodoviaria: 'Rodoviária de Cajazeiras' },
    
    // PERNAMBUCO
    { cidade: 'Recife', estado: 'PE', rodoviaria: 'Rodoviária de Recife' },
    { cidade: 'Jaboatão dos Guararapes', estado: 'PE', rodoviaria: 'Rodoviária de Jaboatão' },
    { cidade: 'Olinda', estado: 'PE', rodoviaria: 'Rodoviária de Olinda' },
    { cidade: 'Caruaru', estado: 'PE', rodoviaria: 'Rodoviária de Caruaru' },
    { cidade: 'Petrolina', estado: 'PE', rodoviaria: 'Rodoviária de Petrolina' },
    { cidade: 'Paulista', estado: 'PE', rodoviaria: 'Rodoviária de Paulista' },
    { cidade: 'Cabó', estado: 'PE', rodoviaria: 'Rodoviária de Cabó' },
    { cidade: 'Garanhuns', estado: 'PE', rodoviaria: 'Rodoviária de Garanhuns' },
    { cidade: 'Serra Talhada', estado: 'PE', rodoviaria: 'Rodoviária de Serra Talhada' },
    { cidade: 'Arcoverde', estado: 'PE', rodoviaria: 'Rodoviária de Arcoverde' },
    
    // PIAUÍ
    { cidade: 'Teresina', estado: 'PI', rodoviaria: 'Rodoviária de Teresina' },
    { cidade: 'Parnaíba', estado: 'PI', rodoviaria: 'Rodoviária de Parnaíba' },
    { cidade: 'Picos', estado: 'PI', rodoviaria: 'Rodoviária de Picos' },
    { cidade: 'Floriano', estado: 'PI', rodoviaria: 'Rodoviária de Floriano' },
    { cidade: 'Campo Maior', estado: 'PI', rodoviaria: 'Rodoviária de Campo Maior' },
    
    // RIO GRANDE DO NORTE
    { cidade: 'Natal', estado: 'RN', rodoviaria: 'Rodoviária de Natal' },
    { cidade: 'Mossoró', estado: 'RN', rodoviaria: 'Rodoviária de Mossoró' },
    { cidade: 'Parnamirim', estado: 'RN', rodoviaria: 'Rodoviária de Parnamirim' },
    { cidade: 'São Gonçalo do Amarante', estado: 'RN', rodoviaria: 'Rodoviária de São Gonçalo' },
    { cidade: 'Caicó', estado: 'RN', rodoviaria: 'Rodoviária de Caicó' },
    { cidade: 'Assu', estado: 'RN', rodoviaria: 'Rodoviária de Assu' },
    
    // SERGIPE
    { cidade: 'Aracaju', estado: 'SE', rodoviaria: 'Rodoviária de Aracaju' },
    { cidade: 'Nossa Senhora do Socorro', estado: 'SE', rodoviaria: 'Rodoviária de Nossa Senhora do Socorro' },
    { cidade: 'Lagarto', estado: 'SE', rodoviaria: 'Rodoviária de Lagarto' },
    { cidade: 'Itabaiana', estado: 'SE', rodoviaria: 'Rodoviária de Itabaiana' },
    { cidade: 'São Cristóvão', estado: 'SE', rodoviaria: 'Rodoviária de São Cristóvão' },
    
    // ========== CENTRO-OESTE ==========
    // DISTRITO FEDERAL
    { cidade: 'Brasília', estado: 'DF', rodoviaria: 'Rodoviária do Plano Piloto' },
    { cidade: 'Ceilândia', estado: 'DF', rodoviaria: 'Rodoviária de Ceilândia' },
    { cidade: 'Taguatinga', estado: 'DF', rodoviaria: 'Rodoviária de Taguatinga' },
    { cidade: 'Gama', estado: 'DF', rodoviaria: 'Rodoviária do Gama' },
    { cidade: 'Planaltina', estado: 'DF', rodoviaria: 'Rodoviária de Planaltina' },
    
    // GOIÁS
    { cidade: 'Goiânia', estado: 'GO', rodoviaria: 'Rodoviária de Goiânia' },
    { cidade: 'Aparecida de Goiânia', estado: 'GO', rodoviaria: 'Rodoviária de Aparecida' },
    { cidade: 'Anápolis', estado: 'GO', rodoviaria: 'Rodoviária de Anápolis' },
    { cidade: 'Rio Verde', estado: 'GO', rodoviaria: 'Rodoviária de Rio Verde' },
    { cidade: 'Caldas Novas', estado: 'GO', rodoviaria: 'Rodoviária de Caldas Novas' },
    { cidade: 'Catalão', estado: 'GO', rodoviaria: 'Rodoviária de Catalão' },
    { cidade: 'Formosa', estado: 'GO', rodoviaria: 'Rodoviária de Formosa' },
    { cidade: 'Itumbiara', estado: 'GO', rodoviaria: 'Rodoviária de Itumbiara' },
    { cidade: 'Jataí', estado: 'GO', rodoviaria: 'Rodoviária de Jataí' },
    { cidade: 'Luziânia', estado: 'GO', rodoviaria: 'Rodoviária de Luziânia' },
    
    // MATO GROSSO
    { cidade: 'Cuiabá', estado: 'MT', rodoviaria: 'Rodoviária de Cuiabá' },
    { cidade: 'Várzea Grande', estado: 'MT', rodoviaria: 'Rodoviária de Várzea Grande' },
    { cidade: 'Rondonópolis', estado: 'MT', rodoviaria: 'Rodoviária de Rondonópolis' },
    { cidade: 'Sinop', estado: 'MT', rodoviaria: 'Rodoviária de Sinop' },
    { cidade: 'Tangará da Serra', estado: 'MT', rodoviaria: 'Rodoviária de Tangará da Serra' },
    { cidade: 'Cáceres', estado: 'MT', rodoviaria: 'Rodoviária de Cáceres' },
    { cidade: 'Barra do Garças', estado: 'MT', rodoviaria: 'Rodoviária de Barra do Garças' },
    
    // MATO GROSSO DO SUL
    { cidade: 'Campo Grande', estado: 'MS', rodoviaria: 'Rodoviária de Campo Grande' },
    { cidade: 'Dourados', estado: 'MS', rodoviaria: 'Rodoviária de Dourados' },
    { cidade: 'Três Lagoas', estado: 'MS', rodoviaria: 'Rodoviária de Três Lagoas' },
    { cidade: 'Corumbá', estado: 'MS', rodoviaria: 'Rodoviária de Corumbá' },
    { cidade: 'Ponta Porã', estado: 'MS', rodoviaria: 'Rodoviária de Ponta Porã' },
    { cidade: 'Naviraí', estado: 'MS', rodoviaria: 'Rodoviária de Naviraí' },
    
    // ========== SUDESTE ==========
    // ESPÍRITO SANTO
    { cidade: 'Vitória', estado: 'ES', rodoviaria: 'Rodoviária de Vitória' },
    { cidade: 'Vila Velha', estado: 'ES', rodoviaria: 'Rodoviária de Vila Velha' },
    { cidade: 'Serra', estado: 'ES', rodoviaria: 'Rodoviária da Serra' },
    { cidade: 'Cariacica', estado: 'ES', rodoviaria: 'Rodoviária de Cariacica' },
    { cidade: 'Linhares', estado: 'ES', rodoviaria: 'Rodoviária de Linhares' },
    { cidade: 'Colatina', estado: 'ES', rodoviaria: 'Rodoviária de Colatina' },
    { cidade: 'Guarapari', estado: 'ES', rodoviaria: 'Rodoviária de Guarapari' },
    
    // MINAS GERAIS
    { cidade: 'Belo Horizonte', estado: 'MG', rodoviaria: 'Rodoviária de Belo Horizonte' },
    { cidade: 'Uberlândia', estado: 'MG', rodoviaria: 'Rodoviária de Uberlândia' },
    { cidade: 'Contagem', estado: 'MG', rodoviaria: 'Rodoviária de Contagem' },
    { cidade: 'Juiz de Fora', estado: 'MG', rodoviaria: 'Rodoviária de Juiz de Fora' },
    { cidade: 'Betim', estado: 'MG', rodoviaria: 'Rodoviária de Betim' },
    { cidade: 'Montes Claros', estado: 'MG', rodoviaria: 'Rodoviária de Montes Claros' },
    { cidade: 'Uberaba', estado: 'MG', rodoviaria: 'Rodoviária de Uberaba' },
    { cidade: 'Governador Valadares', estado: 'MG', rodoviaria: 'Rodoviária de Governador Valadares' },
    { cidade: 'Ipatinga', estado: 'MG', rodoviaria: 'Rodoviária de Ipatinga' },
    { cidade: 'Divinópolis', estado: 'MG', rodoviaria: 'Rodoviária de Divinópolis' },
    { cidade: 'Sete Lagoas', estado: 'MG', rodoviaria: 'Rodoviária de Sete Lagoas' },
    { cidade: 'Santa Luzia', estado: 'MG', rodoviaria: 'Rodoviária de Santa Luzia' },
    { cidade: 'Poços de Caldas', estado: 'MG', rodoviaria: 'Rodoviária de Poços de Caldas' },
    { cidade: 'Pouso Alegre', estado: 'MG', rodoviaria: 'Rodoviária de Pouso Alegre' },
    { cidade: 'Varginha', estado: 'MG', rodoviaria: 'Rodoviária de Varginha' },
    { cidade: 'Itajubá', estado: 'MG', rodoviaria: 'Rodoviária de Itajubá' },
    
    // RIO DE JANEIRO
    { cidade: 'Rio de Janeiro', estado: 'RJ', rodoviaria: 'Rodoviária Novo Rio' },
    { cidade: 'São Gonçalo', estado: 'RJ', rodoviaria: 'Rodoviária de São Gonçalo' },
    { cidade: 'Duque de Caxias', estado: 'RJ', rodoviaria: 'Rodoviária de Duque de Caxias' },
    { cidade: 'Nova Iguaçu', estado: 'RJ', rodoviaria: 'Rodoviária de Nova Iguaçu' },
    { cidade: 'Niterói', estado: 'RJ', rodoviaria: 'Rodoviária de Niterói' },
    { cidade: 'Campos dos Goytacazes', estado: 'RJ', rodoviaria: 'Rodoviária de Campos' },
    { cidade: 'Petrópolis', estado: 'RJ', rodoviaria: 'Rodoviária de Petrópolis' },
    { cidade: 'Volta Redonda', estado: 'RJ', rodoviaria: 'Rodoviária de Volta Redonda' },
    { cidade: 'Macaé', estado: 'RJ', rodoviaria: 'Rodoviária de Macaé' },
    { cidade: 'Cabo Frio', estado: 'RJ', rodoviaria: 'Rodoviária de Cabo Frio' },
    { cidade: 'Angra dos Reis', estado: 'RJ', rodoviaria: 'Rodoviária de Angra dos Reis' },
    { cidade: 'Teresópolis', estado: 'RJ', rodoviaria: 'Rodoviária de Teresópolis' },
    
    // SÃO PAULO
    { cidade: 'São Paulo', estado: 'SP', rodoviaria: 'Terminal Tietê' },
    { cidade: 'Guarulhos', estado: 'SP', rodoviaria: 'Rodoviária de Guarulhos' },
    { cidade: 'Campinas', estado: 'SP', rodoviaria: 'Rodoviária de Campinas' },
    { cidade: 'São Bernardo do Campo', estado: 'SP', rodoviaria: 'Rodoviária de São Bernardo' },
    { cidade: 'Santo André', estado: 'SP', rodoviaria: 'Rodoviária de Santo André' },
    { cidade: 'Osasco', estado: 'SP', rodoviaria: 'Rodoviária de Osasco' },
    { cidade: 'Ribeirão Preto', estado: 'SP', rodoviaria: 'Rodoviária de Ribeirão Preto' },
    { cidade: 'Sorocaba', estado: 'SP', rodoviaria: 'Rodoviária de Sorocaba' },
    { cidade: 'Santos', estado: 'SP', rodoviaria: 'Rodoviária de Santos' },
    { cidade: 'São José dos Campos', estado: 'SP', rodoviaria: 'Rodoviária de São José dos Campos' },
    { cidade: 'Jundiaí', estado: 'SP', rodoviaria: 'Rodoviária de Jundiaí' },
    { cidade: 'Piracicaba', estado: 'SP', rodoviaria: 'Rodoviária de Piracicaba' },
    { cidade: 'Limeira', estado: 'SP', rodoviaria: 'Rodoviária de Limeira' },
    { cidade: 'Araraquara', estado: 'SP', rodoviaria: 'Rodoviária de Araraquara' },
    { cidade: 'São Carlos', estado: 'SP', rodoviaria: 'Rodoviária de São Carlos' },
    { cidade: 'Presidente Prudente', estado: 'SP', rodoviaria: 'Rodoviária de Presidente Prudente' },
    { cidade: 'Marília', estado: 'SP', rodoviaria: 'Rodoviária de Marília' },
    { cidade: 'Bauru', estado: 'SP', rodoviaria: 'Rodoviária de Bauru' },
    { cidade: 'Itapetininga', estado: 'SP', rodoviaria: 'Rodoviária de Itapetininga' },
    { cidade: 'Bragança Paulista', estado: 'SP', rodoviaria: 'Rodoviária de Bragança Paulista' },
    { cidade: 'Franca', estado: 'SP', rodoviaria: 'Rodoviária de Franca' },
    { cidade: 'São Vicente', estado: 'SP', rodoviaria: 'Rodoviária de São Vicente' },
    { cidade: 'Mogi das Cruzes', estado: 'SP', rodoviaria: 'Rodoviária de Mogi das Cruzes' },
    { cidade: 'Diadema', estado: 'SP', rodoviaria: 'Rodoviária de Diadema' },
    { cidade: 'Carapicuíba', estado: 'SP', rodoviaria: 'Rodoviária de Carapicuíba' },
    
    // ========== SUL ==========
    // PARANÁ
    { cidade: 'Curitiba', estado: 'PR', rodoviaria: 'Rodoviária de Curitiba' },
    { cidade: 'Londrina', estado: 'PR', rodoviaria: 'Rodoviária de Londrina' },
    { cidade: 'Maringá', estado: 'PR', rodoviaria: 'Rodoviária de Maringá' },
    { cidade: 'Ponta Grossa', estado: 'PR', rodoviaria: 'Rodoviária de Ponta Grossa' },
    { cidade: 'Cascavel', estado: 'PR', rodoviaria: 'Rodoviária de Cascavel' },
    { cidade: 'São José dos Pinhais', estado: 'PR', rodoviaria: 'Rodoviária de São José dos Pinhais' },
    { cidade: 'Foz do Iguaçu', estado: 'PR', rodoviaria: 'Rodoviária de Foz do Iguaçu' },
    { cidade: 'Guarapuava', estado: 'PR', rodoviaria: 'Rodoviária de Guarapuava' },
    { cidade: 'Paranaguá', estado: 'PR', rodoviaria: 'Rodoviária de Paranaguá' },
    { cidade: 'Apucarana', estado: 'PR', rodoviaria: 'Rodoviária de Apucarana' },
    { cidade: 'Umuarama', estado: 'PR', rodoviaria: 'Rodoviária de Umuarama' },
    { cidade: 'Campo Mourão', estado: 'PR', rodoviaria: 'Rodoviária de Campo Mourão' },
    
    // SANTA CATARINA
    { cidade: 'Florianópolis', estado: 'SC', rodoviaria: 'Rodoviária de Florianópolis' },
    { cidade: 'Joinville', estado: 'SC', rodoviaria: 'Rodoviária de Joinville' },
    { cidade: 'Blumenau', estado: 'SC', rodoviaria: 'Rodoviária de Blumenau' },
    { cidade: 'São José', estado: 'SC', rodoviaria: 'Rodoviária de São José' },
    { cidade: 'Chapecó', estado: 'SC', rodoviaria: 'Rodoviária de Chapecó' },
    { cidade: 'Itajaí', estado: 'SC', rodoviaria: 'Rodoviária de Itajaí' },
    { cidade: 'Criciúma', estado: 'SC', rodoviaria: 'Rodoviária de Criciúma' },
    { cidade: 'Balneário Camboriú', estado: 'SC', rodoviaria: 'Rodoviária de Balneário Camboriú' },
    { cidade: 'Brusque', estado: 'SC', rodoviaria: 'Rodoviária de Brusque' },
    { cidade: 'Jaraguá do Sul', estado: 'SC', rodoviaria: 'Rodoviária de Jaraguá do Sul' },
    { cidade: 'Lages', estado: 'SC', rodoviaria: 'Rodoviária de Lages' },
    
    // RIO GRANDE DO SUL
    { cidade: 'Porto Alegre', estado: 'RS', rodoviaria: 'Rodoviária de Porto Alegre' },
    { cidade: 'Caxias do Sul', estado: 'RS', rodoviaria: 'Rodoviária de Caxias do Sul' },
    { cidade: 'Pelotas', estado: 'RS', rodoviaria: 'Rodoviária de Pelotas' },
    { cidade: 'Canoas', estado: 'RS', rodoviaria: 'Rodoviária de Canoas' },
    { cidade: 'Santa Maria', estado: 'RS', rodoviaria: 'Rodoviária de Santa Maria' },
    { cidade: 'Novo Hamburgo', estado: 'RS', rodoviaria: 'Rodoviária de Novo Hamburgo' },
    { cidade: 'Viamão', estado: 'RS', rodoviaria: 'Rodoviária de Viamão' },
    { cidade: 'São Leopoldo', estado: 'RS', rodoviaria: 'Rodoviária de São Leopoldo' },
    { cidade: 'Gravataí', estado: 'RS', rodoviaria: 'Rodoviária de Gravataí' },
    { cidade: 'Passo Fundo', estado: 'RS', rodoviaria: 'Rodoviária de Passo Fundo' },
    { cidade: 'Uruguaiana', estado: 'RS', rodoviaria: 'Rodoviária de Uruguaiana' },
    { cidade: 'Rio Grande', estado: 'RS', rodoviaria: 'Rodoviária de Rio Grande' },
    { cidade: 'Bento Gonçalves', estado: 'RS', rodoviaria: 'Rodoviária de Bento Gonçalves' },
    { cidade: 'Erechim', estado: 'RS', rodoviaria: 'Rodoviária de Erechim' },
    { cidade: 'Santana do Livramento', estado: 'RS', rodoviaria: 'Rodoviária de Santana do Livramento' },
];

// ============================================
// FUNÇÕES PARA ACESSAR OS DADOS
// ============================================

function getCidades() {
    return cidadesBrasil.map(item => `${item.cidade} - ${item.estado}`);
}

function getCidadesComRodoviaria() {
    return cidadesBrasil.map(item => `${item.cidade} - ${item.estado} (${item.rodoviaria})`);
}

function getCidadesPorEstado(estado) {
    return cidadesBrasil.filter(item => item.estado === estado);
}

function getEstados() {
    const estados = [...new Set(cidadesBrasil.map(item => item.estado))];
    return estados.sort();
}

function getRodoviaria(cidade) {
    const encontrado = cidadesBrasil.find(item => item.cidade === cidade);
    return encontrado ? encontrado.rodoviaria : null;
}

function getCidadeInfo(cidade) {
    return cidadesBrasil.find(item => item.cidade === cidade);
}

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cidadesBrasil,
        getCidades,
        getCidadesComRodoviaria,
        getCidadesPorEstado,
        getEstados,
        getRodoviaria,
        getCidadeInfo
    };
}
