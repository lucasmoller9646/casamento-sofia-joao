/*
 * Lista de presentes — edite à vontade.
 *
 * Cada presente tem: id (único, sem espaços), categoria, nome em português (pt),
 * nome em italiano (it) e valor em reais (número inteiro, sem "R$" e sem pontos).
 * Os itens vieram da lista do casar.com, com os valores arredondados.
 * Para tirar um presente, apague a linha; para incluir, copie uma linha e ajuste.
 */
window.LISTA_PRESENTES = {
  categorias: [
    { id: "lua-de-mel", pt: "Lua de mel", it: "Luna di miele" },
    { id: "casa", pt: "Casa", it: "Casa" },
    { id: "mesa", pt: "Cozinha e mesa", it: "Cucina e tavola" }
  ],
  itens: [
    { id: "passagens",   categoria: "lua-de-mel", valor: 2200, pt: "2 passagens aéreas para a lua de mel",        it: "2 biglietti aerei per la luna di miele" },
    { id: "carro",       categoria: "lua-de-mel", valor: 2150, pt: "Aluguel de carro para a lua de mel",          it: "Noleggio auto per la luna di miele" },

    { id: "adega",       categoria: "casa", valor: 1800, pt: "Adega de vinhos climatizada",                         it: "Cantinetta per vini climatizzata" },
    { id: "aparador",    categoria: "casa", valor: 1420, pt: "Aparador em madeira jequitibá, 200 cm",                it: "Credenza in legno di jequitibá, 200 cm" },
    { id: "ar",          categoria: "casa", valor: 2800, pt: "Ar-condicionado split inverter 12.000 BTUs",           it: "Condizionatore split inverter 12.000 BTU" },
    { id: "tv",          categoria: "casa", valor: 2150, pt: "Smart TV LED 32” AOC Roku",                            it: "Smart TV LED 32” AOC Roku" },
    { id: "robo",        categoria: "casa", valor: 1780, pt: "Aspirador de pó robô Mondial",                         it: "Robot aspirapolvere Mondial" },
    { id: "aspirador",   categoria: "casa", valor: 280,  pt: "Aspirador de pó vertical",                             it: "Aspirapolvere verticale" },
    { id: "abajur",      categoria: "casa", valor: 290,  pt: "Abajur decorativo",                                    it: "Lampada da tavolo decorativa" },

    { id: "chopeira",    categoria: "mesa", valor: 2150, pt: "Chopeira 5 litros Heineken",                           it: "Spillatore di birra da 5 litri Heineken" },
    { id: "cocotte",     categoria: "mesa", valor: 1050, pt: "4 panelas mini cocotte Botanique – Le Creuset",        it: "4 mini cocotte Botanique – Le Creuset" },
    { id: "balde",       categoria: "mesa", valor: 1180, pt: "Balde térmico para gelo em prata",                     it: "Secchiello termico per il ghiaccio in argento" },
    { id: "jantar30",    categoria: "mesa", valor: 870,  pt: "Aparelho de jantar branco, 30 peças",                  it: "Servizio di piatti bianco, 30 pezzi" },
    { id: "bandeja",     categoria: "mesa", valor: 440,  pt: "Bandeja preta com detalhe em pesponto",                it: "Vassoio nero con impunture" },
    { id: "oxford",      categoria: "mesa", valor: 380,  pt: "Aparelho de jantar e chá Oxford Daily",                it: "Servizio da tavola e da tè Oxford Daily" },
    { id: "fondue",      categoria: "mesa", valor: 180,  pt: "Aparelho de fondue preto",                             it: "Set da fonduta nero" },
    { id: "cha",         categoria: "mesa", valor: 120,  pt: "Aparelho para chá",                                    it: "Servizio da tè" },
    { id: "alho",        categoria: "mesa", valor: 60,   pt: "Amassador de alho",                                    it: "Spremiaglio" }
  ]
};
