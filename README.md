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
  "viagem": "1,50",
  "veg": "sim"
}
```

- `foto`: nome do arquivo em `img/`, sem o `.jpg` (só letras minúsculas, números e hífen).
- `precos`: lista de `["rótulo", "preço"]`. Com um preço só, deixe o rótulo vazio. Use sempre o formato `00,00`.
- `viagem`: acréscimo para viagem (opcional).
- `veg`: `vegano`, `sim` (vegetariano), `opcao` (tem opção vegetariana) ou `troca` (dá para trocar). Opcional.
- `encomenda`: `true` para pratos sob encomenda. Opcional.
- Na seção de bebidas (`"lista": true`) não precisa de foto.

Depois de mudar, atualize também o campo `atualizado` no topo do arquivo.

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
