#!/usr/bin/env python3
"""Vigia do cardápio Nojoud.

Modos:
  python vigia.py check   -> confere se o site está no ar, com HTTPS válido e
                             com o mesmo conteúdo do repositório. Sai com erro
                             (e avisa no Discord) se algo estiver errado.
  python vigia.py push    -> avisa no Discord que o cardápio foi alterado.

O endereço do webhook vem da variável DISCORD_WEBHOOK (segredo do GitHub).
Sem ela, os avisos só aparecem no log e no e-mail do GitHub.
Usa só a biblioteca padrão do Python.
"""
import datetime as dt
import hashlib
import json
import os
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request

SITE = os.environ.get("SITE_URL", "https://harlezinhuu.github.io/cardapio-nojoud/").rstrip("/") + "/"
ARQUIVOS = ["index.html", "menu.json", "js/app.js", "css/style.css"]
WEBHOOK = os.environ.get("DISCORD_WEBHOOK", "").strip()
REPO_URL = f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{os.environ.get('GITHUB_REPOSITORY', 'Harlezinhuu/cardapio-nojoud')}"
RUN_URL = f"{REPO_URL}/actions/runs/{os.environ.get('GITHUB_RUN_ID', '')}"
UA = {"User-Agent": "vigia-cardapio-nojoud/1.0"}

VERDE, AMARELO, VERMELHO, AZUL = 0x2F7A3D, 0xFFB400, 0xE6261F, 0x0A116F


def discord(titulo, texto, cor, campos=None):
    print(f"[{titulo}] {texto}")
    for c in campos or []:
        print(f"  - {c['name']}: {c['value']}")
    if not WEBHOOK:
        print("(DISCORD_WEBHOOK não configurado: aviso só no log)")
        return
    if not WEBHOOK.startswith("https://discord.com/api/webhooks/") and not WEBHOOK.startswith("https://discordapp.com/api/webhooks/"):
        print("DISCORD_WEBHOOK não parece um webhook do Discord; aviso não enviado.")
        return
    corpo = {
        "username": "Vigia do Cardápio",
        "embeds": [{
            "title": titulo[:256],
            "description": texto[:4000],
            "color": cor,
            "fields": [{"name": c["name"][:256], "value": c["value"][:1024], "inline": False} for c in (campos or [])][:10],
            "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
            "footer": {"text": "cardapio-nojoud"},
        }],
        "allowed_mentions": {"parse": []},
    }
    req = urllib.request.Request(WEBHOOK, data=json.dumps(corpo).encode(), method="POST",
                                 headers={**UA, "Content-Type": "application/json"})
    for tentativa in range(3):
        try:
            urllib.request.urlopen(req, timeout=15).read()
            return
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2 + tentativa * 2)
                continue
            print(f"Falha ao enviar para o Discord: HTTP {e.code}")
            return
        except Exception as e:  # rede instável: tenta de novo
            print(f"Falha ao enviar para o Discord: {e}")
            time.sleep(2)


def baixar(caminho):
    url = SITE + caminho + ("&" if "?" in caminho else "?") + f"vigia={int(time.time())}"
    req = urllib.request.Request(url, headers={**UA, "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status, r.read(), r.geturl()


def sha(b):
    return hashlib.sha256(b).hexdigest()


def dias_certificado(host):
    ctx = ssl.create_default_context()
    with socket.create_connection((host, 443), timeout=15) as s:
        with ctx.wrap_socket(s, server_hostname=host) as t:
            fim = dt.datetime.strptime(t.getpeercert()["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt.timezone.utc)
    return (fim - dt.datetime.now(dt.timezone.utc)).days


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout.strip()


def check():
    problemas, avisos = [], []

    # 1. Site no ar e com HTTPS
    try:
        status, html, final = baixar("")
        if status != 200:
            problemas.append(f"O site respondeu HTTP {status}.")
        if not final.startswith("https://"):
            problemas.append(f"O site não está abrindo em HTTPS ({final}).")
    except urllib.error.HTTPError as e:
        problemas.append(f"O site respondeu HTTP {e.code}.")
    except Exception as e:
        problemas.append(f"Não consegui abrir o site: {e}")

    # 2. Certificado
    host = SITE.split("/")[2]
    try:
        dias = dias_certificado(host)
        if dias < 14:
            avisos.append(f"O certificado HTTPS vence em {dias} dias.")
    except ssl.SSLError as e:
        problemas.append(f"Certificado HTTPS inválido: {e}")
    except Exception as e:
        avisos.append(f"Não consegui checar o certificado: {e}")

    # 3. Conteúdo publicado igual ao do repositório
    #    (pula se houve commit há menos de 15 min, para não alarmar durante a publicação)
    ultimo = int(git("log", "-1", "--format=%ct") or 0)
    recente = ultimo and (time.time() - ultimo) < 15 * 60
    if not problemas and not recente:
        diferentes = []
        for arq in ARQUIVOS:
            try:
                with open(arq, "rb") as f:
                    local = f.read()
                _, remoto, _ = baixar(arq)
                if sha(local) != sha(remoto):
                    diferentes.append(arq)
            except Exception as e:
                diferentes.append(f"{arq} ({e})")
        if diferentes:
            problemas.append("O que está no ar é diferente do repositório: " + ", ".join(diferentes)
                             + ". Pode ser publicação atrasada ou alteração indevida.")

    # 4. Lembrete: o GitHub pausa verificações agendadas após 60 dias sem commits
    if ultimo:
        parado = int((time.time() - ultimo) // 86400)
        if parado >= 50:
            avisos.append(f"O repositório está há {parado} dias sem mudanças. Aos 60 dias o GitHub pausa "
                          "o vigia: faça qualquer commit (ex.: atualizar a data em menu.json) para mantê-lo ativo.")

    if problemas:
        discord("🚨 Problema no cardápio", "\n".join(f"• {p}" for p in problemas + avisos), VERMELHO,
                [{"name": "Site", "value": SITE}, {"name": "Detalhes", "value": RUN_URL}])
        sys.exit(1)
    if avisos:
        discord("⚠️ Atenção no cardápio", "\n".join(f"• {a}" for a in avisos), AMARELO,
                [{"name": "Site", "value": SITE}])
    else:
        print("Tudo certo: site no ar, HTTPS válido e conteúdo igual ao repositório.")
    if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch":
        discord("✅ Vigia funcionando", "Teste manual: site no ar, HTTPS válido e conteúdo igual ao repositório.", VERDE,
                [{"name": "Site", "value": SITE}])


def push():
    evento = {}
    caminho = os.environ.get("GITHUB_EVENT_PATH")
    if caminho and os.path.exists(caminho):
        try:
            with open(caminho, encoding="utf-8") as f:
                evento = json.load(f) or {}
        except (OSError, ValueError):
            evento = {}
    commits = evento.get("commits") or []
    quem = (evento.get("pusher") or {}).get("name") or os.environ.get("GITHUB_ACTOR", "?")
    forcado = evento.get("forced", False)
    linhas, arquivos = [], set()
    for c in commits[-10:]:
        msg = (c.get("message") or "").splitlines()[0][:120]
        autor = (c.get("author") or {}).get("name", "?")
        linhas.append(f"• `{c.get('id', '')[:7]}` {msg} — {autor}")
        for k in ("added", "modified", "removed"):
            arquivos.update(c.get(k) or [])
    if not linhas:
        linhas.append(f"• {git('log', '-1', '--format=%h %s — %an')}")
    arqs = ", ".join(sorted(arquivos)[:25]) or "—"
    titulo = "⚠️ Force push na main!" if forcado else "📝 Cardápio alterado"
    cor = VERMELHO if forcado else AZUL
    texto = "\n".join(linhas) + "\n\nSe não foi você, troque a senha do GitHub agora e confira o Security log."
    discord(titulo, texto, cor, [
        {"name": "Enviado por", "value": quem},
        {"name": "Arquivos", "value": arqs},
        {"name": "Ver mudanças", "value": evento.get("compare") or REPO_URL + "/commits/main"},
    ])


if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else "check"
    {"check": check, "push": push}.get(modo, check)()
