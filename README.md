# Sofia & João Otávio · 02·10·2027

Site do casamento de Sofia Chiavacci e João Otávio Figueiredo, em português e italiano, com a confirmação de presença gravada numa Planilha Google no Drive.

- **Cerimônia e festa:** sábado, 2 de outubro de 2027, 14h30, Hotel Resort & Golfe Clube dos 500 (Guaratinguetá-SP)
- **Prazo para confirmar:** 2 de setembro de 2027 (provisório — ajuste em `config.js` quando o bufê definir)

O site é estático (HTML, CSS e JavaScript, sem build), feito para o GitHub Pages. Ele abre em italiano se o celular do convidado estiver em italiano e em português nos demais casos; o link com `?lang=it` força o italiano e `?lang=pt` força o português.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `index.html` | Página completa, com os textos em português |
| `assets/js/i18n.js` | Todos os textos em italiano e as mensagens do formulário nos dois idiomas |
| `config.js` | **O principal arquivo para editar:** URL da planilha, prazo, WhatsApp da Salete, dados do Pix e IBAN |
| `assets/js/lista-presentes.js` | Os presentes da lista: nome em português e italiano, categoria e valor |
| `assets/css/site.css` | Estilos |
| `assets/js/site.js` | Idioma, contagem regressiva, agenda e formulário de confirmação |
| `assets/js/presentes.js` | Lista de presentes: carrinho, código Pix com valor e QR Code, formulário "Já fiz o Pix" |
| `assets/js/vendor/qrcode.js` | Gerador de QR Code (Kazuhiko Arase, licença MIT), hospedado no próprio site |
| `assets/img/` | Monograma do convite, as duas aquarelas (tocadores e roda de samba), arranjos de flores em aquarela, textura de papel `papel.webp` e imagem de compartilhamento `og.jpg` (imagens em WebP e JPG, em dois tamanhos) |
| `assets/fonts/` | Cormorant Garamond e Alex Brush, hospedadas no próprio site |
| `apps-script/Code.gs` | Script que recebe as confirmações e os avisos de presente e grava na planilha |

**Tarifas dos hotéis:** ficam em `index.html`, dentro de cada hotel, numa janela (`<dialog class="sheet">`, logo depois da lista de hotéis) que só abre quando o convidado clica no botão do cartão. O Legacy traz a tarifa especial (é preciso informar "Casamento Sofia & João Otávio" ao reservar, e o botão *Copiar* copia esse texto); o Ibis traz a cotação de 1 e 2 diárias. As traduções em italiano estão em `i18n.js` (chaves `leg_*` e `ibis_*`). Se o Clube dos 500 mandar condições para os convidados, dá para copiar o mesmo bloco.

## O que ainda falta preencher

- **Vinhos:** a seção `#vinhos` em `index.html` está com o atributo `hidden`. Preencha a lista (`<li>` com nome e nota) e tire o `hidden`. A tradução dos nomes fica em `i18n.js`, se precisar.
- **Pix dos noivos** (`config.js` › `pix`): chave, nome e cidade de quem recebe. Enquanto a chave estiver vazia, a lista funciona em modo de teste e avisa que o QR não paga ninguém. Detalhes na seção 2.
- **IBAN** (`config.js` › `iban`), se houver conta em euros para os convidados da Itália.

## 1. Ligar a confirmação à planilha no Drive (uns 5 minutos)

1. No Google Drive, crie uma **Planilha Google** em branco, por exemplo "Casamento Sofia e João – Confirmações".
2. Na planilha, abra **Extensões › Apps Script**. Apague o código que aparecer, cole todo o conteúdo de `apps-script/Code.gs` e salve.
3. No menu de funções, escolha **configurar** e clique em **Executar**. O Google pede autorização: entre com a sua conta, clique em "Avançado" e em "Acessar (não seguro)", que é o aviso padrão para scripts próprios. Ao voltar à planilha, ela terá as abas **Resumo**, **Respostas**, **Convidados** e **Presentes**.
4. Clique em **Implantar › Nova implantação**, engrenagem › **App da Web**, com:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a **URL do app da Web** (termina em `/exec`) e cole em `config.js`, no campo `endpoint`.
6. Faça o commit. Envie uma confirmação de teste pelo site e confira se ela aparece na planilha; depois apague essa linha de teste.

Enquanto `endpoint` estiver vazio, o formulário funciona em **modo de teste**: mostra o agradecimento, avisa que nada foi gravado e não envia nada.

**Como a planilha se organiza:** cada envio vira uma linha em *Respostas* (com restrições alimentares e se a família vai se hospedar em Guaratinguetá) e uma linha por pessoa em *Convidados* (com a idade de cada criança). Se a mesma família responder de novo, com o mesmo WhatsApp ou, sem WhatsApp, com o mesmo nome, as linhas anteriores ficam marcadas como `substituída` e o *Resumo* conta só a resposta mais recente. O *Resumo* traz famílias que vêm e que não vêm, total de pessoas, adultos, crianças, quantos vão à cerimônia e à festa, quantos vão se hospedar, a lista de restrições alimentares e a lista das crianças com as idades.

**Presentes:** cada "Já fiz o Pix" vira uma linha na aba *Presentes*, com o nome, os presentes escolhidos, o valor, o recado e o código do Pix. O *Resumo* soma quantos presentes foram avisados e o valor avisado.

Se mudar o código do script depois, use **Implantar › Gerenciar implantações › editar › Nova versão**, para manter a mesma URL.

## 2. Lista de presentes por Pix

O convidado escolhe um ou mais presentes, ajusta as quantidades e aperta **Gerar Pix**. O site monta, no próprio navegador, um **código Pix com o valor exato** (o mesmo formato do "Pix Copia e Cola" dos bancos) e mostra o QR Code. No celular, ele copia o código e cola no app do banco; no computador, lê o QR com o celular. O dinheiro vai **direto para a conta dos noivos**, sem plataforma no meio e sem taxa. Depois, o convidado aperta **Já fiz o Pix**, deixa o nome e um recado, e isso vai para a aba *Presentes* da planilha.

**O que preencher em `config.js`:**

```js
pix: { chave: "sofia@exemplo.com", nome: "Sofia Chiavacci", cidade: "Sao Paulo" },
```

- **chave:** e-mail, telefone (`+55 12 99999-8888`), CPF ou chave aleatória. Prefiram **e-mail ou chave aleatória**, porque a chave fica visível no código do site e uma chave de CPF exporia o documento.
- **nome:** o nome do titular da conta, até 25 letras (os acentos são removidos automaticamente). Se o nome completo for maior, usem uma forma curta, por exemplo "Sofia Chiavacci".
- **cidade:** a cidade da conta, até 15 letras.

**Testem antes de divulgar:** escolham o presente mais barato (o amassador de alho, R$ 60), gerem o Pix e paguem de verdade pelo app de um de vocês. O banco deve mostrar o nome certo e o valor já preenchido.

**Presente em dinheiro:** no topo da lista, o convidado pode digitar o valor que quiser (até R$ 50.000); ele entra no mesmo Pix dos outros presentes e aparece na planilha como "Presente em dinheiro".

**Editar os presentes:** em `assets/js/lista-presentes.js`, cada linha é um presente com nome em português, nome em italiano, categoria e valor em reais (número inteiro, sem pontos). Para tirar um presente, apaguem a linha; para incluir, copiem uma linha e ajustem. Os valores vieram da lista do casar.com, arredondados.

**Limites do Pix estático:** o site não fica sabendo se o pagamento foi feito; quem confirma é o extrato do banco. A aba *Presentes* registra o que o convidado disse ter dado, com o código do Pix (os bancos que exibem esse código ajudam a casar os dois). Como cada presente pode ser escolhido por várias pessoas, a lista funciona como cotas e nunca "esgota".

**Convidados da Itália:** Pix só funciona com conta em banco brasileiro. Se houver conta em euros, preencham `iban` em `config.js` (titular, IBAN e BIC); os dados aparecem junto do QR Code, para quem preferir uma transferência internacional.

## 3. Publicar no GitHub Pages

O repositório é `lucasmoller9646/casamento-sofia-joao` e precisa ser **público** (no plano gratuito o Pages só publica repositórios públicos; privado dá 404). O `index.html` fica na **raiz** do repositório, ao lado das pastas `assets` e `apps-script`.

1. Em **Settings › Pages**, *Build and deployment*, *Source*: **Deploy from a branch**; *Branch*: **main** e pasta **/ (root)**. Clique em **Save**.
2. Espere um ou dois minutos (o andamento aparece na aba **Actions**) e recarregue a página de Settings › Pages, que vai mostrar *Your site is live at* **https://lucasmoller9646.github.io/casamento-sofia-joao/** (com o domínio configurado, passa a ser **https://joaosofia.com.br**).
3. Abra o endereço no celular e confira os dois idiomas (`?lang=it` força o italiano).

**Cache do navegador:** o GitHub Pages manda o navegador guardar os arquivos por 10 minutos. Por isso o `index.html` chama `config.js?v=…`, `site.js?v=…` etc.: ao mudar um desses arquivos, troque também o número depois de `?v=` no `index.html`, para os visitantes receberem a versão nova logo.

**Para mudar algo depois:** abra o arquivo no GitHub, clique no lápis (*Edit this file*), altere e clique em **Commit changes**; o site se atualiza em um ou dois minutos. É assim que se cola a URL da planilha no `config.js` (passo 5 da seção 1).

**Domínio próprio: joaosofia.com.br (registro.br).** O arquivo `CNAME` na raiz já contém `joaosofia.com.br`, e a `og:image`/`og:url` do `index.html` já apontam para esse endereço. Não apague o `CNAME`.

1. No registro.br, abra o domínio › **Configurar endereçamento** › **Modo avançado** e confirme. A partir daí a zona DNS é editável (a ativação pode levar um tempo).
2. Crie estas entradas (nome em branco = o próprio `joaosofia.com.br`):

   | Tipo | Nome | Dado |
   |---|---|---|
   | A | (em branco) | 185.199.108.153 |
   | A | (em branco) | 185.199.109.153 |
   | A | (em branco) | 185.199.110.153 |
   | A | (em branco) | 185.199.111.153 |
   | AAAA | (em branco) | 2606:50c0:8000::153 |
   | AAAA | (em branco) | 2606:50c0:8001::153 |
   | AAAA | (em branco) | 2606:50c0:8002::153 |
   | AAAA | (em branco) | 2606:50c0:8003::153 |
   | CNAME | www | lucasmoller9646.github.io |

3. (Recomendado) Em **github.com › Settings (da conta) › Pages › Add a domain**, informe `joaosofia.com.br`; o GitHub mostra um registro **TXT** (`_github-pages-challenge-lucasmoller9646` + um código). Crie esse TXT no registro.br e clique em **Verify**. Isso impede que outra conta do GitHub use o domínio.
4. No repositório, **Settings › Pages › Custom domain**: `joaosofia.com.br` › **Save**. Quando o *DNS check* ficar verde, marque **Enforce HTTPS** (o certificado pode demorar um pouco para ficar disponível).
5. Abra `https://joaosofia.com.br` e `https://www.joaosofia.com.br` (o segundo redireciona para o primeiro) e só então mande o link aos convidados, porque o WhatsApp guarda a prévia em cache.

## Privacidade

A página tem `noindex` e o `robots.txt` bloqueia buscadores, então ela não aparece no Google; só entra quem tiver o link. As duas aquarelas levam o crédito de Carybé na própria página, as flores foram pintadas para o site e o monograma vem do convite impresso. Num repositório público, porém, qualquer pessoa com o endereço do repositório consegue ver os arquivos.
