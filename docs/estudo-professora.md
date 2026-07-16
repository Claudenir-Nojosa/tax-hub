# Professora IA por voz — Cérebro do Módulo

Aba "Professora" em `/dashboard/estudo`: sabatina ORAL com uma professora IA por matéria (voz
feminina, conversa em tempo real — ela ouve, pergunta, corrige quando o aluno erra e elogia
quando acerta). Sessão puramente de treino: **nada é salvo no progresso**. Atualize este arquivo
se mudar o fluxo de conexão, a persona ou os limites de custo.

## 1. Arquitetura — por que WebRTC direto

```
ProfessoraTab (browser)                        Vercel                          OpenAI
  1. POST /api/estudo/professora/token ─────► route.ts ──POST client_secrets──► ek_... (token efêmero)
  2. getUserMedia + RTCPeerConnection
  3. POST /v1/realtime/calls (SDP + Bearer ek_) ─────────────────────────────► answer SDP
  4. áudio bidirecional + dataChannel "oai-events"  (browser ↔ OpenAI DIRETO)
```

O servidor só minta o token (<1s, sem `maxDuration`): **o áudio nunca passa pelo Vercel** — zero
risco de timeout de função e zero custo de banda. A persona (instruções da sabatina) é montada
**no servidor** a partir de `{materiaNome, topicos, concursoNome?, topicosEstudados?}` — o client
nunca envia instruções prontas (evita prompt injection via payload).

"1 IA por matéria" = 1 persona por matéria: nome feminino fixo por matéria SEFAZ-CE
(`PROFESSORAS` em `src/lib/professora-data.ts` — ex.: Direito Tributário → Helena, Contabilidade
Geral → Marina), com fallback determinístico por hash pra matérias de concursos customizados.
O modelo e a voz são os mesmos; mudam nome, especialidade e tópicos do edital.

## 2. Onde trocar voz / modelo / duração

`src/app/api/estudo/professora/token/route.ts` (consts no topo):
- `MODELO = "gpt-realtime-mini"` — ~4-5x mais barato que `gpt-realtime`; subir pro cheio se a
  sabatina ficar fraca (perguntas rasas / correções erradas).
- `VOZ = "marin"` — feminina; alternativas femininas: `shimmer`, `coral`, `sage`.
- `TOKEN_TTL_SEGUNDOS = 600` — só pro handshake; **não** limita a duração da conversa.

`src/lib/professora-data.ts`:
- `DURACAO_MAX_SESSAO_MIN = 15` — limite de custo; timer no client encerra a sessão sozinho
  (countdown mm:ss no header, âmbar sob 60s).

Transcrição da fala do aluno: `gpt-4o-mini-transcribe` com `language: "pt"` (config do token).

## 3. Hook `useProfessoraRealtime` (src/components/estudo/professora/)

Ciclo de vida inteiro do WebRTC. Regras importantes:
- pc/dc/stream/timers vivem em `useRef` — NUNCA em state (re-render não pode recriar a conexão).
- `encerrar()` é idempotente, roda também no unmount (trocar de aba desmonta o componente) e
  SEMPRE faz `micStream.getTracks().forEach(t => t.stop())` — sem isso o indicador vermelho de
  microfone do browser fica aceso pra sempre.
- `alternarMute()` usa `track.enabled = !enabled` (não para o track — retomável).
- No `dc.onopen` é enviado `{type:"response.create"}` — sem esse empurrão a professora fica muda
  esperando o VAD detectar fala primeiro.
- Autoplay: `audioRef.play().catch()` no `ontrack` — o gesto do clique em "Iniciar" costuma
  satisfazer a policy; se algum browser bloquear, o catch evita crash.

### Eventos do data channel (nomes GA, com fallback beta)

| Evento | Uso |
|---|---|
| `session.created` | status → "ativa" |
| `input_audio_buffer.speech_started/stopped` | indicador "ouvindo você" |
| `conversation.item.input_audio_transcription.completed` | balão do aluno (`transcript`) |
| `response.output_audio_transcript.delta`/`.done` (GA) ou `response.audio_transcript.*` (beta) | balão da professora (delta acumula no balão `parcial`) |
| `output_audio_buffer.started/stopped/cleared` (WebRTC-only) | indicador "falando" |
| `error` | console.error |

## 4. Arquivos

```
src/lib/professora-data.ts                                nomes das professoras + DURACAO_MAX_SESSAO_MIN
src/app/api/estudo/professora/token/route.ts               minta o client_secret (persona montada aqui)
src/components/estudo/professora/useProfessoraRealtime.ts  hook do ciclo de vida WebRTC
src/components/estudo/ProfessoraTab.tsx                    UI: seleção de matéria + sessão com transcrição
src/app/dashboard/estudo/page.tsx                          aba "professora" (dynamic import ssr:false — WebRTC é browser-only)
```

## 5. Verificação

- `npx tsc --noEmit`.
- Payload do token validado direto contra a OpenAI (curl no `client_secrets` → 200 com `ek_...`;
  atenção no Windows: mandar o JSON com acentos via `--data-binary @arquivo` UTF-8, senão a API
  devolve `invalid_json` por encoding).
- Rota: sem sessão → 401 (guard de auth vem antes da validação de body).
- UI sem microfone (ambiente de teste): erro claro "Permita o acesso ao microfone..." + botão
  "Nova sessão". O teste de conversa REAL (voz de fato) só é possível num navegador com mic:
  aba Professora → card → Iniciar → ela se apresenta e pergunta em pt-BR; conferir correção ao
  errar, elogio ao acertar, Mute, Encerrar apagando o indicador de mic e o countdown.
- Use fones de ouvido: sem eles o VAD pode captar a própria voz da professora (eco).

## 6. Evoluções anotadas (fora do escopo v1)

- `session.update` pelo data channel pra trocar de tópico no meio da conversa sem reconectar.
- Botão "Estudar com a professora" dentro da meta da Trilha (sessão focada no tópico da meta).
- Registrar acertos/erros da sabatina no caderno do tópico (Edital) ao fim da sessão.
