/*
 * Configuração do site do casamento — edite só este arquivo.
 *
 * endpoint: cole aqui a URL do App da Web do Google Apps Script
 *           (termina em /exec). Veja o passo a passo no README.md.
 *           Enquanto estiver vazio, o formulário funciona em "modo de teste"
 *           e NÃO grava nada.
 */
window.CASAMENTO_CONFIG = {
  endpoint: "",

  // prazo de confirmação (horário de Brasília, UTC-3) — provisório, a confirmar com o bufê
  prazo: "2027-09-02T23:59:00-03:00",
  // true = depois do prazo o formulário fecha e mostra um aviso
  fecharDepoisDoPrazo: false,

  // WhatsApp da Salete Guimarães (R.S.V.P.), só dígitos com DDI, ex.: "5512999999999".
  // Enquanto estiver vazio, o botão de WhatsApp fica escondido.
  whatsappRsvp: "5512988937221",

  // Lista de presentes: Pix de quem recebe (a conta da Sofia ou do João Otávio).
  //   chave:  e-mail, telefone (+55 DDD número), CPF ou chave aleatória. Prefira e-mail
  //           ou chave aleatória: a chave fica visível no código do site.
  //   nome:   o nome do titular como aparece no banco (até 25 letras).
  //   cidade: a cidade da conta (até 15 letras).
  // Enquanto a chave estiver vazia, a página gera um QR de teste e avisa que ele não paga ninguém.
  // Os presentes e os valores ficam em assets/js/lista-presentes.js.
  // conta da Sofia no Banco do Brasil (chave aleatória)
  pix: { chave: "d61803e0-80b9-4047-82bd-81e022794d4b", nome: "Sofia Chiavacci", cidade: "Sao Paulo" },

  // Transferência em euros para quem paga da Itália (opcional). Com "iban" vazio, não aparece.
  iban: { titular: "", iban: "", bic: "" },

  maxPorTipo: 12
};
