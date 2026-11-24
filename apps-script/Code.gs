/**
 * Confirmações do casamento de Sofia e João Otávio → Planilha Google (no seu Drive)
 *
 * Como instalar (detalhes no README.md do repositório):
 *  1. Crie uma Planilha Google em branco no seu Drive, por exemplo
 *     "Casamento Sofia e João – Confirmações".
 *  2. Na planilha: Extensões › Apps Script. Apague o que houver e cole
 *     este arquivo inteiro. Salve.
 *  3. Selecione a função "configurar" e clique em Executar (autorize
 *     com a sua conta). Ela cria as abas Respostas, Convidados e Resumo.
 *  4. Implantar › Nova implantação › tipo "App da Web":
 *       Executar como: Eu
 *       Quem pode acessar: Qualquer pessoa
 *     Copie a URL que termina em /exec e cole em config.js (endpoint).
 *
 * Cada envio gera uma linha em "Respostas" e uma linha por pessoa em
 * "Convidados". Se a mesma família responder de novo (mesmo WhatsApp ou,
 * sem WhatsApp, mesmo nome), as linhas antigas viram "substituída" e o
 * Resumo passa a contar só a resposta mais recente.
 *
 * Lista de presentes: quando um convidado aperta "Já fiz o Pix", o site manda
 * nome, recado, os presentes escolhidos e o valor. Cada envio vira uma linha
 * na aba "Presentes". O site não sabe se o Pix foi pago de fato; confira com
 * o extrato do banco (a coluna "Código Pix" ajuda a identificar o pagamento).
 */

var ABA_RESPOSTAS = 'Respostas';
var ABA_CONVIDADOS = 'Convidados';
var ABA_RESUMO = 'Resumo';
var ABA_PRESENTES = 'Presentes';

var COLS_RESPOSTAS = ['Recebido', 'Estado', 'Responsável', 'WhatsApp', 'Vem', 'Cerimônia', 'Festa',
  'Adultos', 'Crianças', 'Total pessoas', 'Restrições alimentares', 'Hospedagem', 'Idioma', 'Chave', 'ID'];
var COLS_CONVIDADOS = ['Recebido', 'Estado', 'Nome', 'Tipo', 'Idade', 'Cerimônia', 'Festa', 'Responsável', 'Chave', 'ID'];
var COLS_PRESENTES = ['Recebido', 'Nome', 'Presentes', 'Total (R$)', 'Recado', 'Código Pix', 'Idioma', 'ID'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    garantirAbas_(ss);
    if (data.tipo === 'presente') return registrarPresente_(ss, data);
    var resp = ss.getSheetByName(ABA_RESPOSTAS);
    var conv = ss.getSheetByName(ABA_CONVIDADOS);

    var id = String(data.id || '');
    if (id && jaExiste_(resp, id)) return json_({ ok: true, duplicado: true });

    var responsavel = limpar_(data.responsavel, 80);
    if (!responsavel) return json_({ ok: false, error: 'sem nome' });
    var telefone = limpar_(data.telefone, 30);
    var chave = chave_(telefone, responsavel);
    var vem = data.vem === 'sim';
    var cerimonia = vem && data.cerimonia === true;
    var festa = vem && data.festa === true;
    var adultos = vem ? inteiro_(data.adultos, 0, 30) : 0;
    var criancas = vem ? inteiro_(data.criancas, 0, 30) : 0;
    var pessoas = vem && Array.isArray(data.pessoas) ? data.pessoas.slice(0, 60) : [];
    var restricoes = vem ? limpar_(data.restricoes, 300) : '';
    var hospedagem = vem ? limpar_(data.hospedagem, 20) : '';
    var agora = new Date();

    marcarSubstituidas_(resp, chave, COLS_RESPOSTAS.indexOf('Chave') + 1);
    marcarSubstituidas_(conv, chave, COLS_CONVIDADOS.indexOf('Chave') + 1);

    resp.appendRow([agora, 'atual', responsavel, telefone, vem ? 'Sim' : 'Não', cerimonia ? 'Sim' : 'Não', festa ? 'Sim' : 'Não',
      adultos, criancas, adultos + criancas, restricoes, hospedagem, data.idioma === 'it' ? 'IT' : 'PT', chave, id]);

    if (pessoas.length) {
      var linhas = pessoas.map(function (p) {
        var crianca = p.tipo === 'Criança';
        return [agora, 'atual', limpar_(p.nome, 80), crianca ? 'Criança' : 'Adulto', crianca ? limpar_(p.idade, 20) : '',
          cerimonia ? 'Sim' : 'Não', festa ? 'Sim' : 'Não', responsavel, chave, id];
      });
      conv.getRange(conv.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function registrarPresente_(ss, data) {
  var sh = ss.getSheetByName(ABA_PRESENTES);
  var id = String(data.id || '');
  if (id && jaExisteEm_(sh, COLS_PRESENTES.indexOf('ID') + 1, id)) return json_({ ok: true, duplicado: true });
  var nome = limpar_(data.nome, 80);
  if (!nome) return json_({ ok: false, error: 'sem nome' });
  var itens = Array.isArray(data.itens) ? data.itens.slice(0, 40) : [];
  var total = 0;
  var descricao = itens.map(function (it) {
    var qtd = inteiro_(it.qtd, 1, 99);
    var valor = Math.round(Math.max(0, Number(it.valor) || 0) * 100) / 100;
    var sub = Math.round(qtd * valor * 100) / 100;
    total += sub;
    return (qtd > 1 ? qtd + '× ' : '') + String(it.nome || '').slice(0, 80) + ' (R$ ' + reais_(sub) + ')';
  }).join('; ');
  total = Math.round(total * 100) / 100;
  sh.appendRow([new Date(), nome, limpar_(descricao, 1500), total, limpar_(data.recado, 500),
    limpar_(data.txid, 25), data.idioma === 'it' ? 'IT' : 'PT', id]);
  return json_({ ok: true });
}

function reais_(v) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

function doGet() {
  return json_({ ok: true, servico: 'Confirmações Casamento Sofia e João Otávio' });
}

/** Rode uma vez pelo editor para criar as abas e o resumo. */
function configurar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  garantirAbas_(ss);
  SpreadsheetApp.flush();
}

function garantirAbas_(ss) {
  var resp = ss.getSheetByName(ABA_RESPOSTAS) || ss.insertSheet(ABA_RESPOSTAS);
  if (resp.getLastRow() === 0) prepararAba_(resp, COLS_RESPOSTAS);
  var conv = ss.getSheetByName(ABA_CONVIDADOS) || ss.insertSheet(ABA_CONVIDADOS);
  if (conv.getLastRow() === 0) prepararAba_(conv, COLS_CONVIDADOS);
  var pres = ss.getSheetByName(ABA_PRESENTES) || ss.insertSheet(ABA_PRESENTES);
  if (pres.getLastRow() === 0) {
    prepararAba_(pres, COLS_PRESENTES);
    pres.getRange('D:D').setNumberFormat('"R$" #,##0.00');
    pres.setColumnWidth(3, 420); pres.setColumnWidth(5, 320);
  }
  var res = ss.getSheetByName(ABA_RESUMO);
  if (!res) { res = ss.insertSheet(ABA_RESUMO, 0); prepararResumo_(res); }
  var vazia = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1');
  if (vazia && vazia.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(vazia);
}

function prepararAba_(sh, cols) {
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#eef0e6');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
}

/** Rode se o Resumo mostrar #ERROR! (por exemplo, depois de mudar o idioma/local da planilha). */
function refazerResumo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var res = ss.getSheetByName(ABA_RESUMO) || ss.insertSheet(ABA_RESUMO, 0);
  prepararResumo_(res);
  SpreadsheetApp.flush();
}

// Planilhas em português, espanhol, italiano etc. separam os argumentos das fórmulas com ";",
// as em inglês com ",". As fórmulas abaixo usam "¦" e trocamos pelo separador do local da planilha.
function separador_(ss) {
  var loc = String(ss.getSpreadsheetLocale() || 'en_US');
  return /^(en|ja|ko|zh|th|iw|he|hi|ms|fil|tl)/.test(loc) ? ',' : ';';
}

function prepararResumo_(sh) {
  var SEP = separador_(sh.getParent());
  var f = function (txt) { return txt.split('¦').join(SEP); };
  var R = "'" + ABA_RESPOSTAS + "'!", C = "'" + ABA_CONVIDADOS + "'!", P = "'" + ABA_PRESENTES + "'!";
  var atual = R + 'B:B¦"atual"';
  var linhas = [
    ['Casamento de Sofia e João Otávio · 2 de outubro de 2027', ''],
    ['', ''],
    ['Respostas recebidas (atuais)', '=COUNTIF(' + R + 'B:B¦"atual")'],
    ['Famílias que vêm', '=COUNTIFS(' + atual + '¦' + R + 'E:E¦"Sim")'],
    ['Famílias que não vêm', '=COUNTIFS(' + atual + '¦' + R + 'E:E¦"Não")'],
    ['', ''],
    ['Pessoas no total', '=SUMIFS(' + R + 'J:J¦' + atual + ')'],
    ['Adultos', '=SUMIFS(' + R + 'H:H¦' + atual + ')'],
    ['Crianças', '=SUMIFS(' + R + 'I:I¦' + atual + ')'],
    ['', ''],
    ['Pessoas na cerimônia', '=SUMIFS(' + R + 'J:J¦' + atual + '¦' + R + 'F:F¦"Sim")'],
    ['Pessoas na festa', '=SUMIFS(' + R + 'J:J¦' + atual + '¦' + R + 'G:G¦"Sim")'],
    ['', ''],
    ['Pessoas que vão se hospedar em Guaratinguetá', '=SUMIFS(' + R + 'J:J¦' + atual + '¦' + R + 'L:L¦"Sim")'],
    ['Pessoas que ainda não sabem', '=SUMIFS(' + R + 'J:J¦' + atual + '¦' + R + 'L:L¦"Ainda não sabe")'],
    ['', ''],
    ['Presentes avisados pelos convidados', '=COUNTA(' + P + 'B2:B)'],
    ['Valor avisado (confira no extrato)', '=SUM(' + P + 'D2:D)']
  ].map(function (l) { return [l[0], f(l[1])]; });
  sh.getRange(1, 1, linhas.length, 2).setValues(linhas);
  sh.getRange('A1').setFontSize(14).setFontWeight('bold');
  sh.getRange('A3:A' + linhas.length).setFontWeight('bold');
  sh.getRange('B' + linhas.length).setNumberFormat('"R$" #,##0.00');
  // listas em colunas separadas: cada QUERY cresce para baixo sem invadir a outra
  sh.getRange('D3').setValue('Restrições alimentares').setFontWeight('bold');
  sh.getRange('D4').setFormula(f('=IFERROR(QUERY(' + R + 'A:O¦"select C, K where B = \'atual\' and K <> \'\' label C \'Família\', K \'Restrições\'"¦1)¦"Nenhuma restrição informada")'));
  sh.getRange('G3').setValue('Crianças e suas idades').setFontWeight('bold');
  sh.getRange('G4').setFormula(f('=IFERROR(QUERY(' + C + 'A:J¦"select C, E, H where B = \'atual\' and D = \'Criança\' label C \'Criança\', E \'Idade\', H \'Família\'"¦1)¦"Ainda não há crianças confirmadas")'));
  sh.setColumnWidth(1, 340);
  sh.setColumnWidth(2, 180);
  sh.setColumnWidth(4, 200); sh.setColumnWidth(5, 260);
  sh.setColumnWidth(7, 200); sh.setColumnWidth(8, 120); sh.setColumnWidth(9, 200);
}

function marcarSubstituidas_(sh, chave, colChave) {
  var n = sh.getLastRow();
  if (n < 2 || !chave) return;
  var chaves = sh.getRange(2, colChave, n - 1, 1).getValues();
  var estados = sh.getRange(2, 2, n - 1, 1).getValues();
  var mudou = false;
  for (var i = 0; i < chaves.length; i++) {
    if (chaves[i][0] === chave && estados[i][0] === 'atual') { estados[i][0] = 'substituída'; mudou = true; }
  }
  if (mudou) sh.getRange(2, 2, n - 1, 1).setValues(estados);
}

function jaExisteEm_(sh, col, id) {
  var n = sh.getLastRow();
  if (n < 2) return false;
  var ids = sh.getRange(2, col, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return true;
  return false;
}

function jaExiste_(sh, id) {
  var n = sh.getLastRow();
  if (n < 2) return false;
  var col = COLS_RESPOSTAS.indexOf('ID') + 1;
  var ids = sh.getRange(2, col, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return true;
  return false;
}

function chave_(telefone, nome) {
  var dig = String(telefone || '').replace(/\D/g, '');
  if (dig.length >= 6) return 'tel:' + dig.slice(-9);
  return 'nome:' + String(nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

function limpar_(v, max) {
  var s = String(v == null ? '' : v).trim().slice(0, max);
  // evita que um texto começando com = + - @ vire fórmula na planilha
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function inteiro_(v, min, max) {
  var n = parseInt(v, 10);
  if (isNaN(n)) n = min;
  return Math.max(min, Math.min(max, n));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
