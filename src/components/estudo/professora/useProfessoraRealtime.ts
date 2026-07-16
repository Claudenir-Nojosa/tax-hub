"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DURACAO_MAX_SESSAO_MIN } from "@/lib/professora-data";

// Ciclo de vida da conversa por voz com a Professora (OpenAI Realtime API via WebRTC).
// Fluxo: getUserMedia → POST /api/estudo/professora/token (token efêmero ek_) → RTCPeerConnection
// com o mic como track + dataChannel "oai-events" → offer SDP pra OpenAI → answer → áudio
// bidirecional direto navegador↔OpenAI (nada passa pelo Vercel).
//
// pc/dc/stream/timers vivem em useRef — NUNCA em state: um re-render não pode recriar a conexão.
// encerrar() é idempotente e SEMPRE para os tracks do mic (senão o indicador vermelho do browser
// fica aceso pra sempre). Eventos de transcript têm nome diferente entre a API beta e a GA
// (response.audio_transcript.* vs response.output_audio_transcript.*) — tratamos os dois.

export type ProfessoraStatus = "ociosa" | "pedindo_mic" | "conectando" | "ativa" | "encerrada" | "erro";

export interface MensagemSabatina {
  id: string;
  autor: "usuario" | "professora";
  texto: string;
  parcial: boolean;
}

export interface IniciarParams {
  materiaNome: string;
  topicos: string[];
  concursoNome?: string;
  topicosEstudados?: string[];
}

export function useProfessoraRealtime() {
  const [status, setStatus] = useState<ProfessoraStatus>("ociosa");
  const [falando, setFalando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [mutado, setMutado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemSabatina[]>([]);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const proximoIdRef = useRef(0);

  const encerrar = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop()); // apaga o indicador de mic do browser
    micStreamRef.current = null;
    try { dcRef.current?.close(); } catch { /* já fechado */ }
    dcRef.current = null;
    try { pcRef.current?.close(); } catch { /* já fechada */ }
    pcRef.current = null;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setSegundosRestantes(null);
    setFalando(false);
    setOuvindo(false);
    setMutado(false);
    setStatus((s) => (s === "ociosa" || s === "erro" ? s : "encerrada"));
  }, []);

  // cleanup no unmount (trocar de aba desmonta o componente — a sessão morre e o mic é liberado)
  useEffect(() => encerrar, [encerrar]);

  const alternarMute = useCallback(() => {
    const track = micStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMutado(!track.enabled);
  }, []);

  // acumula deltas no balão parcial da professora (cria um novo se o último já fechou)
  const acumularProfessora = useCallback((delta: string) => {
    setMensagens((prev) => {
      const ultima = prev[prev.length - 1];
      if (ultima && ultima.autor === "professora" && ultima.parcial) {
        return [...prev.slice(0, -1), { ...ultima, texto: ultima.texto + delta }];
      }
      return [...prev, { id: `m${proximoIdRef.current++}`, autor: "professora", texto: delta, parcial: true }];
    });
  }, []);

  const fecharBalaoProfessora = useCallback((textoFinal?: string) => {
    setMensagens((prev) => {
      const ultima = prev[prev.length - 1];
      if (ultima && ultima.autor === "professora" && ultima.parcial) {
        return [...prev.slice(0, -1), { ...ultima, texto: textoFinal || ultima.texto, parcial: false }];
      }
      if (textoFinal) {
        return [...prev, { id: `m${proximoIdRef.current++}`, autor: "professora", texto: textoFinal, parcial: false }];
      }
      return prev;
    });
  }, []);

  const iniciar = useCallback(async (params: IniciarParams) => {
    if (pcRef.current) return; // sessão já ativa
    setErro(null);
    setMensagens([]);
    setStatus("pedindo_mic");

    // 1) microfone (dentro do clique do usuário — satisfaz a autoplay policy)
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const nome = e instanceof DOMException ? e.name : "";
      setErro(
        nome === "NotFoundError"
          ? "Nenhum microfone encontrado neste dispositivo."
          : "Permita o acesso ao microfone pra conversar com a professora (ícone de cadeado na barra de endereço)."
      );
      setStatus("erro");
      return;
    }
    micStreamRef.current = stream;

    try {
      // 2) token efêmero (a persona é montada no servidor)
      const resToken = await fetch("/api/estudo/professora/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!resToken.ok) {
        const data = (await resToken.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error?.includes("OPENAI_API_KEY")
            ? "IA não configurada no servidor (OPENAI_API_KEY ausente)."
            : data.error || `Erro ${resToken.status} ao criar a sessão.`
        );
      }
      const { token, modelo } = (await resToken.json()) as { token: string; modelo: string };

      // 3) WebRTC: mic → OpenAI, áudio dela → <audio>, eventos JSON → dataChannel
      setStatus("conectando");
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.addTrack(stream.getAudioTracks()[0], stream);
      pc.ontrack = (e) => {
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
          audioRef.current.play().catch(() => { /* autoplay bloqueado — o gesto do clique costuma bastar */ });
        }
      };
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        // sem esse empurrão a professora fica muda esperando o VAD detectar fala primeiro
        dc.send(JSON.stringify({ type: "response.create" }));
      };

      dc.onmessage = (ev) => {
        let evento: { type?: string; transcript?: string; delta?: string; error?: { message?: string } };
        try { evento = JSON.parse(ev.data); } catch { return; }
        switch (evento.type) {
          case "session.created":
            setStatus("ativa");
            break;
          case "input_audio_buffer.speech_started":
            setOuvindo(true);
            break;
          case "input_audio_buffer.speech_stopped":
            setOuvindo(false);
            break;
          case "conversation.item.input_audio_transcription.completed":
            if (evento.transcript?.trim()) {
              setMensagens((prev) => [
                ...prev,
                { id: `m${proximoIdRef.current++}`, autor: "usuario", texto: evento.transcript!.trim(), parcial: false },
              ]);
            }
            break;
          case "response.output_audio_transcript.delta": // GA
          case "response.audio_transcript.delta": // beta
            if (evento.delta) acumularProfessora(evento.delta);
            break;
          case "response.output_audio_transcript.done": // GA
          case "response.audio_transcript.done": // beta
            fecharBalaoProfessora(evento.transcript);
            break;
          case "output_audio_buffer.started": // WebRTC-only: áudio dela começou a tocar
            setFalando(true);
            break;
          case "output_audio_buffer.stopped":
          case "output_audio_buffer.cleared":
            setFalando(false);
            break;
          case "error":
            console.error("professora realtime:", evento.error);
            break;
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const resSdp = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(modelo)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      if (!resSdp.ok) {
        throw new Error(
          resSdp.status === 401
            ? "A sessão expirou antes de conectar. Tente de novo."
            : `Falha na conexão de voz (${resSdp.status}).`
        );
      }
      const answerSdp = await resSdp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      // 4) limite de custo: encerra sozinha + countdown pra UI
      const totalSegundos = DURACAO_MAX_SESSAO_MIN * 60;
      setSegundosRestantes(totalSegundos);
      timeoutRef.current = setTimeout(encerrar, totalSegundos * 1000);
      intervalRef.current = setInterval(() => {
        setSegundosRestantes((s) => (s === null || s <= 1 ? 0 : s - 1));
      }, 1000);
    } catch (e) {
      encerrar();
      setErro(e instanceof Error ? e.message : "Erro inesperado ao iniciar a sessão.");
      setStatus("erro");
    }
  }, [encerrar, acumularProfessora, fecharBalaoProfessora]);

  return { status, falando, ouvindo, mutado, erro, mensagens, segundosRestantes, audioRef, iniciar, encerrar, alternarMute };
}
