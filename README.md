# Cardápio digital — Nojoud Restaurante Árabe

Cardápio para celular, acessado pelo QR code das mesas. Site estático, sem dependências externas.

## Como mudar preços e pratos

Tudo fica no `menu.json`. Cada prato tem este formato:

```json
{
  "nome": "Humus",
  "foto": "humus",
  "desc": "Pasta de grão-de-bico. Acompanha pão.",
  "precos": [["", "34,90"]],
  "veg": "sim"
}
```

- `foto`: nome do arquivo em `img/`, sem o `.jpg` (só letras minúsculas, números e hífen).
- `precos`: lista de `["rótulo", "preço"]`. Com um preço só, deixe o rótulo vazio. Use sempre o formato `00,00`.
- `veg`: `vegano`, `sim` (vegetariano), `opcao` (tem opção vegetariana) ou `troca` (dá para trocar). Opcional.
- `encomenda`: `true` para pratos sob encomenda. Opcional.
- Na seção de bebidas (`"lista": true`) não precisa de foto.

Depois de mudar, atualize também o campo `atualizado` no topo do arquivo.

## Horário e dias fechados

Em `info.horarios` fica o horário normal de cada dia da semana (`"12:00 – 16:00"` ou `"Fechado"`).

Para fechar num dia específico (feriado, limpeza, férias), adicione em `info.excecoes`:

```json
"excecoes": [
  { "data": "2026-11-23", "texto": "Fechado para limpeza" }
]
```

A data é no formato `AAAA-MM-DD`. O aviso aparece só na semana daquela data e some sozinho depois que ela passa.

## Idiomas (português, inglês e árabe)

O botão com o globo, na barra de busca, troca o idioma. A escolha fica salva no celular da pessoa, e também dá para abrir direto num idioma com `?lang=en` ou `?lang=ar` no fim do link.

- O português vem do `menu.json`. Preços, fotos e horários vêm sempre de lá.
- As traduções ficam no `i18n.json`, em `en` e `ar`:
  - `ui`: textos da página (botões, horário, contato…);
  - `secoes`: nome de cada seção, pelo `id`;
  - `itens`: cada prato pelo nome da `foto` (bebidas, pelo `nome` em português), com `nome`, `desc`, `rotulos` (os rótulos dos preços, na mesma ordem) e `obs`.
- **Prato novo sem tradução aparece em português** nos outros idiomas. Nada quebra.
- Em árabe a página inteira espelha (lê da direita para a esquerda). Pratos com nome de pessoa (Kamel, Deyala…) ficam com o nome em letras latinas.

## Publicar no GitHub Pages

1. Crie um repositório (ex.: `cardapio-nojoud`) e envie estes arquivos.
2. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O site fica em `https://SEU-USUARIO.github.io/cardapio-nojoud/`.
4. Marque **Enforce HTTPS**.

## Estrutura

```
index.html     página
css/style.css  visual
js/app.js      monta o cardápio a partir do menu.json
menu.json      pratos e preços
img/           fotos, logo e arabesco
fonts/         fontes (SIL Open Font License)
```

Segurança: ver [SEGURANCA.md](SEGURANCA.md).
