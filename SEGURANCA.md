# Segurança do cardápio Nojoud

O site é **estático**: não tem login, banco de dados, formulário nem servidor próprio. Então não existe "invadir o site" no sentido clássico. Os riscos reais são três: alguém **entrar na conta** que publica o site, alguém **trocar o QR code** na mesa, ou alguém **sequestrar o endereço** (domínio). As proteções abaixo cobrem esses três.

## O que já está no código

| Proteção | O que faz |
|---|---|
| Content-Security-Policy (`index.html`) | O navegador só carrega arquivos do próprio site. Script, fonte, imagem ou conexão de outro lugar é bloqueado, mesmo que alguém consiga injetar algo. |
| Zero dependência externa | Fontes, imagens e código ficam no próprio site. Nenhum Google Fonts, CDN ou rastreador: não tem terceiro para ser comprometido e nada vaza dos clientes. |
| Nada vira HTML | O `js/app.js` monta tudo com `textContent`. Mesmo que um texto malicioso entre no `menu.json`, ele aparece como texto e não roda como código. |
| Validação do `menu.json` | Cada campo é conferido (preço no formato `00,00`, nome de foto só com letras, números e hífen, tamanhos máximos). Um item fora do padrão é ignorado em vez de quebrar a página. |
| `referrer` desligado | Ao abrir um link externo, o site não informa de onde o cliente veio. |
| Sem formulários e sem `<base>` | `form-action 'none'` e `base-uri 'none'` impedem formulário falso e redirecionamento de links. |

## Conta do GitHub (o ponto mais importante)

Quem entra na conta consegue trocar o cardápio. Então:

1. Ative a **verificação em duas etapas** (Settings → Password and authentication). Prefira **passkey** ou um app autenticador, não SMS.
2. Guarde os **códigos de recuperação** num lugar fora do celular.
3. Use **senha única e longa**, de preferência num gerenciador de senhas.
4. No repositório, não adicione colaboradores desnecessários. Se alguém da família for editar, use a conta dele com 2FA, nunca a mesma senha.
5. Em **Settings → Branches**, proteja a branch `main` (bloqueia force-push e exclusão).
6. Em **Settings → Pages**, deixe **Enforce HTTPS** marcado.
7. Confira de vez em quando em **Settings → Sessions** e **Security log** se não tem acesso estranho.

## Se usar domínio próprio (ex.: nojoud.com.br)

1. Ative 2FA também no **registro do domínio** (Registro.br, por exemplo).
2. Em **GitHub → Settings → Pages**, faça a **verificação do domínio**. Isso impede que outra pessoa "pegue" o seu domínio no GitHub se a configuração ficar quebrada.
3. Nunca deixe o DNS apontando para o GitHub Pages sem o repositório publicado (é assim que acontece o sequestro de subdomínio).
4. Mantenha a renovação automática do domínio ligada. Domínio vencido pode ser comprado por outra pessoa, e todo QR impresso passa a apontar para ela.

## O QR code na mesa

O golpe mais comum em restaurante é **colar um QR falso por cima do verdadeiro**, levando para um site de pagamento ou de roubo de dados.

1. Imprima o **endereço escrito por extenso** embaixo do QR, para o cliente conferir.
2. Use **display de acrílico** ou plastifique e fixe o QR dentro, não um adesivo solto.
3. Passe nas mesas de vez em quando e escaneie um QR para conferir.
4. O cardápio **nunca pede pagamento nem dados**. Se um dia alguém relatar isso, o QR foi trocado.

## Para atualizar sem risco

- Mude os preços só no `menu.json`. Não precisa mexer no código.
- Não coloque `<script>`, links ou HTML nos textos: o site mostra como texto mesmo, mas é bom manter limpo.
- Depois de publicar, abra o site no celular e confira.

## Vigia (alertas automáticos)

O repositório tem um robô no GitHub Actions (`.github/workflows/vigia.yml`) que:

- **avisa a cada mudança** na branch `main`: quem enviou, o que mudou e o link. Um *force push* chega como alerta vermelho;
- **confere o site a cada 30 minutos**: se está no ar, se o HTTPS é válido e se o que está publicado é igual ao repositório;
- **lembra** quando o repositório está perto de 60 dias sem commits, porque nesse ponto o GitHub pausa verificações agendadas.

Quando a checagem falha, o GitHub também manda e-mail para o dono da conta.

### Ligar os alertas no Discord

1. No Discord, crie um canal (ex.: `#vigia-cardapio`) num servidor seu.
2. Configurações do canal → **Integrações** → **Webhooks** → **Novo webhook** → **Copiar URL do webhook**.
3. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `DISCORD_WEBHOOK`
   - Secret: a URL copiada.
4. Em **Actions → Vigia do cardápio → Run workflow**, rode um teste. Deve chegar "✅ Vigia funcionando" no canal.

A URL do webhook é um segredo: quem tiver ela consegue mandar mensagens no canal. Nunca coloque no código.

## Limites conhecidos

O GitHub Pages não deixa configurar cabeçalhos HTTP. Por isso a proteção contra o site ser exibido dentro de outro (`frame-ancestors`) não pode ser ativada. Como o site não tem login nem botão de ação, o risco é praticamente nenhum. Se um dia quiser, dá para colocar o Cloudflare (grátis) na frente para adicionar esses cabeçalhos.
