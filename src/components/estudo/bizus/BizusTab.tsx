"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Clock3,
  Copy,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import BizuEditor, { type EditorSaveStatus } from "./BizuEditor";
import BizuPoster from "./BizuPoster";
import styles from "./Bizus.module.css";
import {
  BIZU_POSES,
  isRascunho,
  novoBizu,
  type Bizu,
  type BizuAvatarPose,
  type BizuBlockTone,
  type BizuLayout,
  type BizuImage,
  type BizuMateriaOption,
  type BizuTextBlock,
  type BizuTheme,
  type BizusTabProps,
} from "./types";
import {
  firstWhiteboardImage,
  normalizeWhiteboard,
  syncWhiteboardTitle,
  upsertWhiteboardImage,
  whiteboardForStorage,
  whiteboardPlainText,
} from "./whiteboard-model";

interface ApiBizu {
  id: string;
  concursoId?: string | null;
  materia: string;
  topico?: string | null;
  titulo: string;
  conteudo?: string | null;
  conteudoEstruturado?: unknown;
  imagemUrl?: string | null;
  imagemOrigem?: string | null;
  tema?: string | null;
  layout?: string | null;
  poseAvatar?: string | null;
  configuracao?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

const THEMES: BizuTheme[] = ["sunset", "oceano", "arcade", "noite"];
const LAYOUTS: BizuLayout[] = ["avatar-esquerda", "avatar-direita", "avatar-base"];
const TONES: BizuBlockTone[] = ["destaque", "atencao", "negativo", "positivo"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringFrom(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function apiErrorMessage(data: unknown, fallback: string) {
  if (!isRecord(data)) return fallback;
  const headline = stringFrom(data.error, fallback);
  const detailsSource = isRecord(data.detalhes)
    ? data.detalhes
    : isRecord(data.details)
      ? data.details
      : null;
  if (!detailsSource) return headline;
  const details = Object.values(detailsSource)
    .flatMap((value) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : typeof value === "string"
          ? [value]
          : []
    )
    .filter(Boolean)
    .slice(0, 4);
  return details.length ? headline + ": " + details.join("; ") : headline;
}

function blocksFrom(value: unknown, fallbackText = ""): BizuTextBlock[] {
  const source = isRecord(value) && Array.isArray(value.blocos) ? value.blocos : [];
  const blocks = source.flatMap((raw, index) => {
    if (!isRecord(raw)) return [];
    const texto = stringFrom(raw.texto);
    if (!texto) return [];
    const toneCandidate = stringFrom(raw.tom) as BizuBlockTone;
    return [{
      id: stringFrom(raw.id, "bloco-api-" + index),
      rotulo: stringFrom(raw.rotulo, "LEMBRE"),
      texto,
      tom: TONES.includes(toneCandidate) ? toneCandidate : "destaque",
    }];
  });
  if (blocks.length) return blocks;
  return fallbackText
    ? [{ id: "bloco-legado-1", rotulo: "LEMBRE", texto: fallbackText, tom: "destaque" }]
    : [];
}

function fromApi(api: ApiBizu): Bizu {
  const structured = isRecord(api.conteudoEstruturado) ? api.conteudoEstruturado : {};
  const config = isRecord(api.configuracao) ? api.configuracao : {};
  const themeCandidate = stringFrom(api.tema) as BizuTheme;
  const layoutCandidate = stringFrom(api.layout) as BizuLayout;
  const poseCandidate = stringFrom(api.poseAvatar) as BizuAvatarPose;
  const imagemUrl = stringFrom(api.imagemUrl);
  const chamada = stringFrom(structured.chamada, stringFrom(api.conteudo));
  const blocos = blocksFrom(structured, stringFrom(api.conteudo));
  const pose = BIZU_POSES.includes(poseCandidate) ? poseCandidate : "apontando";
  const imagem: BizuImage | null = imagemUrl
    ? {
        url: imagemUrl,
        alt: stringFrom(config.imagemAlt, "Ilustração mnemônica de " + api.titulo),
        fit: config.imagemFit === "contain" ? "contain" as const : "cover" as const,
        origem:
          api.imagemOrigem === "gerada" || api.imagemOrigem === "url"
            ? api.imagemOrigem
            : "anexada" as const,
      }
    : null;
  const documento = normalizeWhiteboard(
    structured,
    {
      titulo: api.titulo,
      chamada,
      blocos,
      imagem,
      pose,
      corDestaque: stringFrom(config.corDestaque, "#ffdd57"),
    },
    imagemUrl
  );

  return {
    id: api.id,
    concursoId: api.concursoId,
    materia: api.materia,
    topico: api.topico,
    titulo: api.titulo,
    chamada,
    blocos,
    pose: documento.avatar.pose,
    tema: THEMES.includes(themeCandidate) ? themeCandidate : "sunset",
    layout: LAYOUTS.includes(layoutCandidate) ? layoutCandidate : "avatar-esquerda",
    corDestaque: stringFrom(config.corDestaque, "#ffdd57"),
    imagem,
    documento,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

function toApi(bizu: Bizu, concursoId?: string) {
  const conteudo = whiteboardPlainText(bizu.documento).slice(0, 100_000);
  const mediaNode = bizu.documento.nodes.find(
    (node) => node.kind === "image" && Boolean(node.imageUrl)
  );
  const imagemUrl = firstWhiteboardImage(bizu.documento) || bizu.imagem?.url || null;
  const imagemAlt = mediaNode?.imageAlt || bizu.imagem?.alt || "";
  const imagemFit = mediaNode?.imageFit || bizu.imagem?.fit || "cover";
  return {
    concursoId: bizu.concursoId || concursoId,
    materia: bizu.materia.trim(),
    topico: bizu.topico?.trim() || undefined,
    titulo: bizu.titulo.trim(),
    conteudo,
    conteudoEstruturado: {
      versao: 2,
      tipo: "whiteboard",
      documento: whiteboardForStorage(bizu.documento, imagemUrl),
    },
    imagemUrl,
    imagemOrigem: imagemUrl
      ? bizu.imagem?.url === imagemUrl
        ? bizu.imagem.origem || "url"
        : "anexada"
      : "nenhuma",
    tema: "whiteboard",
    layout: "canvas",
    poseAvatar: bizu.documento.avatar.pose,
    configuracao: {
      whiteboard: true,
      imagemAlt,
      imagemFit,
    },
  };
}

function bizuIsValid(bizu: Bizu) {
  return Boolean(bizu.materia.trim() && bizu.titulo.trim() && bizu.documento.nodes.length);
}

function formatUpdated(value?: string) {
  if (!value) return "Agora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recentemente";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default function BizusTab({ concursoId, materias = [], topicos = {} }: BizusTabProps) {
  const [bizus, setBizus] = useState<Bizu[]>([]);
  const [active, setActive] = useState<Bizu | null>(null);
  const activeRef = useRef<Bizu | null>(null);
  const editVersionRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saveStatus, setSaveStatus] = useState<EditorSaveStatus>("idle");
  const [autoSave, setAutoSave] = useState(true);
  const [generatingImage, setGeneratingImage] = useState(false);
  const generationTargetIdRef = useRef<string | null>(null);
  const generationRequestRef = useRef(0);
  const [search, setSearch] = useState("");
  const [materiaFilter, setMateriaFilter] = useState("");

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const loadBizus = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    if (!concursoId) {
      setBizus([]);
      setLoading(false);
      setLoadError("Selecione um concurso para carregar e salvar seus bizus.");
      return;
    }
    try {
      const response = await fetch("/api/estudo/bizus?concursoId=" + encodeURIComponent(concursoId), { signal });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = isRecord(data) ? stringFrom(data.error) : "";
        throw new Error(message || "Não foi possível carregar os bizus.");
      }
      const list = Array.isArray(data)
        ? data
        : isRecord(data) && Array.isArray(data.items)
          ? data.items
          : [];
      setBizus((list as ApiBizu[]).map(fromApi));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os bizus.");
    } finally {
      setLoading(false);
    }
  }, [concursoId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadBizus(controller.signal);
    return () => controller.abort();
  }, [loadBizus]);

  const topicosDisponiveis = useMemo(() => {
    if (!active?.materia) return [];
    const fromMateria = materias.find((materia) => materia.nome === active.materia)?.topicos ?? [];
    if (fromMateria.length) return [...fromMateria];
    const prefix = active.materia + "||";
    return Object.keys(topicos)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  }, [active?.materia, materias, topicos]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return bizus.filter((bizu) => {
      if (materiaFilter && bizu.materia !== materiaFilter) return false;
      if (!query) return true;
      return [bizu.titulo, bizu.materia, bizu.topico || "", whiteboardPlainText(bizu.documento)]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(query);
    });
  }, [bizus, materiaFilter, search]);

  function editBizu(bizu: Bizu) {
    editVersionRef.current = 0;
    setActionError("");
    setSaveStatus("idle");
    setActive(bizu);
  }

  function createBizu() {
    const firstMateria = materiaFilter || materias[0]?.nome || "";
    editBizu(novoBizu(concursoId, firstMateria));
  }

  function changeActive(next: Bizu) {
    editVersionRef.current += 1;
    activeRef.current = next;
    setActive(next);
    setSaveStatus("dirty");
    setActionError("");
  }

  const persist = useCallback(async (bizu: Bizu) => {
    if (!bizuIsValid(bizu)) {
      setActionError("Preencha matéria, título e mantenha pelo menos um cartão antes de salvar.");
      return false;
    }
    if (!(bizu.concursoId || concursoId)) {
      setActionError("Selecione um concurso antes de salvar.");
      return false;
    }
    const startVersion = editVersionRef.current;
    setSaveStatus("saving");
    setActionError("");
    try {
      const creating = isRascunho(bizu.id);
      const payload = toApi(bizu, concursoId);
      const { concursoId: _immutableConcursoId, ...updatePayload } = payload;
      const response = await fetch(
        creating ? "/api/estudo/bizus" : "/api/estudo/bizus/" + encodeURIComponent(bizu.id),
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creating ? payload : updatePayload),
        }
      );
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRecord(data)) {
        throw new Error(isRecord(data) ? stringFrom(data.error, "Não foi possível salvar.") : "Não foi possível salvar.");
      }
      const saved = fromApi(data as unknown as ApiBizu);
      if (creating && generationTargetIdRef.current === bizu.id) {
        generationTargetIdRef.current = saved.id;
      }
      const current = activeRef.current;
      const hasNewEdits = editVersionRef.current !== startVersion;
      const editorValue = current && current.id === bizu.id
        ? hasNewEdits
          ? { ...current, id: saved.id, createdAt: saved.createdAt, updatedAt: saved.updatedAt }
          : saved
        : saved;

      activeRef.current = editorValue;
      setActive(editorValue);
      setBizus((previous) => {
        const withoutOld = previous.filter((item) => item.id !== bizu.id && item.id !== saved.id);
        return [editorValue, ...withoutOld];
      });
      setSaveStatus(hasNewEdits ? "dirty" : "saved");
      return true;
    } catch (error) {
      setSaveStatus("error");
      setActionError(error instanceof Error ? error.message : "Não foi possível salvar.");
      return false;
    }
  }, [concursoId]);

  useEffect(() => {
    if (!active || !autoSave || saveStatus !== "dirty" || !bizuIsValid(active)) return;
    const timer = window.setTimeout(() => void persist(active), 1600);
    return () => window.clearTimeout(timer);
  }, [active, autoSave, persist, saveStatus]);

  async function leaveEditor() {
    if (active && saveStatus === "dirty") {
      if (autoSave && bizuIsValid(active)) {
        const saved = await persist(active);
        if (!saved) return;
      } else if (!window.confirm("Há alterações não salvas. Deseja descartá-las?")) {
        return;
      }
    }
    activeRef.current = null;
    setActive(null);
    setActionError("");
  }

  async function deleteActive() {
    if (!active) return;
    if (isRascunho(active.id)) {
      await leaveEditor();
      return;
    }
    if (!window.confirm("Excluir este bizu definitivamente?")) return;
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/estudo/bizus/" + encodeURIComponent(active.id), { method: "DELETE" });
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new Error(isRecord(data) ? stringFrom(data.error, "Não foi possível excluir.") : "Não foi possível excluir.");
      }
      setBizus((previous) => previous.filter((item) => item.id !== active.id));
      activeRef.current = null;
      setActive(null);
      setActionError("");
    } catch (error) {
      setSaveStatus("error");
      setActionError(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  }

  function duplicateBizu(bizu: Bizu) {
    const titulo = bizu.titulo + " — cópia";
    const copy = {
      ...bizu,
      id: "rascunho-" + Date.now(),
      titulo,
      createdAt: undefined,
      updatedAt: undefined,
      blocos: bizu.blocos.map((block, index) => ({ ...block, id: "bloco-copia-" + Date.now() + "-" + index })),
      documento: syncWhiteboardTitle(structuredClone(bizu.documento), titulo),
    };
    editBizu(copy);
    editVersionRef.current += 1;
    setSaveStatus("dirty");
  }

  async function generateImage(orientacao: string) {
    const current = activeRef.current;
    if (!current || generatingImage) return;
    const sourceId = current.id;
    const requestId = generationRequestRef.current + 1;
    generationRequestRef.current = requestId;
    generationTargetIdRef.current = sourceId;
    setGeneratingImage(true);
    setActionError("");
    try {
      const descricao = whiteboardPlainText(current.documento);
      const response = await fetch("/api/ai/bizu-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materia: current.materia,
          topico: current.topico || undefined,
          titulo: current.titulo.slice(0, 180),
          descricao: descricao.slice(0, 2500),
          prompt: orientacao.trim(),
          pose: current.documento.avatar.pose,
          avatarReference: `/bizus/avatar/${current.documento.avatar.pose}.png`,
          formato: "paisagem",
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRecord(data) || typeof data.imagemDataUrl !== "string") {
        throw new Error(apiErrorMessage(data, "A IA não conseguiu criar a imagem."));
      }
      const latest = activeRef.current;
      if (!latest || generationTargetIdRef.current !== latest.id) return;
      const image = {
        url: data.imagemDataUrl,
        alt: "Cena mnemônica gerada para " + latest.titulo,
        fit: "contain" as const,
        origem: "gerada" as const,
      };
      changeActive({
        ...latest,
        imagem: image,
        documento: upsertWhiteboardImage(latest.documento, image),
      });
    } catch (error) {
      const latest = activeRef.current;
      if (latest && generationTargetIdRef.current === latest.id) {
        setActionError(error instanceof Error ? error.message : "A IA não conseguiu criar a imagem.");
      }
    } finally {
      if (generationRequestRef.current === requestId) {
        generationTargetIdRef.current = null;
        setGeneratingImage(false);
      }
    }
  }

  if (active) {
    return (
      <div className={styles.bizuRoot}>
        {actionError ? (
          <div className={styles.floatingError} role="alert">
            <AlertCircle />
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError("")} aria-label="Fechar aviso">×</button>
          </div>
        ) : null}
        <BizuEditor
          bizu={active}
          materias={materias}
          topicosDisponiveis={topicosDisponiveis}
          saveStatus={saveStatus}
          autoSave={autoSave}
          generatingImage={generatingImage}
          onChange={changeActive}
          onSave={() => void persist(activeRef.current || active)}
          onDelete={isRascunho(active.id) ? undefined : () => void deleteActive()}
          onBack={() => void leaveEditor()}
          onToggleAutoSave={setAutoSave}
          onGenerateImage={generateImage}
        />
      </div>
    );
  }

  return (
    <section className={styles.bizuRoot}>
      <header className={styles.libraryHero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroKicker}><Sparkles /> LABORATÓRIO DE BIZUS</span>
          <h1>Faça a matéria grudar na memória.</h1>
          <p>
            Organize regras, exceções e pegadinhas em mapas mentais livres, conecte ideias
            e deixe seu personagem conduzir a lembrança.
          </p>
          <button type="button" className={styles.heroButton} onClick={createBizu}>
            <Plus />
            Criar novo bizu
          </button>
        </div>
        <div className={styles.heroAvatar} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bizus/avatar/apontando.png" alt="" />
          <i />
          <span>LIGOU. LEMBROU.</span>
        </div>
      </header>

      <div className={styles.libraryToolbar}>
        <div className={styles.libraryHeading}>
          <div className={styles.libraryIcon}><BookOpen /></div>
          <div>
            <h2>Minha biblioteca</h2>
            <p>{bizus.length} {bizus.length === 1 ? "bizu salvo" : "bizus salvos"}</p>
          </div>
        </div>
        <div className={styles.libraryFilters}>
          <label className={styles.searchField}>
            <Search />
            <span className={styles.srOnly}>Buscar bizus</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar regra, tópico ou palavra…"
            />
          </label>
          <label className={styles.filterField}>
            <span className={styles.srOnly}>Filtrar por matéria</span>
            <select value={materiaFilter} onChange={(event) => setMateriaFilter(event.target.value)}>
              <option value="">Todas as matérias</option>
              {materias.map((materia) => (
                <option value={materia.nome} key={materia.id || materia.nome}>{materia.nome}</option>
              ))}
            </select>
          </label>
          <button type="button" className={styles.iconButton} onClick={() => void loadBizus()} aria-label="Atualizar biblioteca">
            <RefreshCw />
          </button>
        </div>
      </div>

      {loadError ? (
        <div className={styles.libraryAlert} role="alert">
          <AlertCircle />
          <div>
            <strong>Não foi possível sincronizar a biblioteca</strong>
            <span>{loadError}</span>
          </div>
          {concursoId ? <button type="button" onClick={() => void loadBizus()}>Tentar novamente</button> : null}
        </div>
      ) : null}

      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spin} />
          <span>Buscando suas melhores lembranças…</span>
        </div>
      ) : !bizus.length ? (
        <div className={styles.emptyLibrary}>
          <div className={styles.emptyPoster} aria-hidden="true">
            <span>MAPA 01</span>
            <strong>IDEIA<br />CENTRAL</strong>
            <div className={styles.emptyMapNodes}>
              <i />
              <i />
              <i />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bizus/avatar/espantado.png" alt="" />
          </div>
          <div>
            <span>BIBLIOTECA VAZIA</span>
            <h2>A próxima regra difícil pode virar sua lembrança mais fácil.</h2>
            <p>Crie cartões, ligue conceitos, acrescente imagens e exporte somente o mapa com seu avatar.</p>
            <button type="button" className={styles.primaryButton} onClick={createBizu}><Plus /> Criar meu primeiro bizu</button>
          </div>
        </div>
      ) : !filtered.length ? (
        <div className={styles.noResults}>
          <Search />
          <h3>Nenhum bizu encontrado</h3>
          <p>Tente buscar outra palavra ou limpar o filtro de matéria.</p>
          <button type="button" onClick={() => { setSearch(""); setMateriaFilter(""); }}>Limpar filtros</button>
        </div>
      ) : (
        <div className={styles.bizuGrid}>
          {filtered.map((bizu) => (
            <article className={styles.bizuCard} key={bizu.id}>
              <button type="button" className={styles.cardPreview} onClick={() => editBizu(bizu)} aria-label={"Editar " + bizu.titulo}>
                <BizuPoster bizu={bizu} decorative />
                <span className={styles.cardEditCue}><Pencil /> Editar bizu</span>
              </button>
              <div className={styles.cardBody}>
                <div className={styles.cardTags}>
                  <span>{bizu.materia}</span>
                  {bizu.topico ? <span>{bizu.topico}</span> : null}
                </div>
                <h3>{bizu.titulo}</h3>
                <div className={styles.cardMeta}>
                  <span><Clock3 /> {formatUpdated(bizu.updatedAt)}</span>
                  <button type="button" onClick={() => duplicateBizu(bizu)} title="Duplicar bizu">
                    <Copy /> Duplicar
                  </button>
                </div>
              </div>
            </article>
          ))}
          <button type="button" className={styles.newCard} onClick={createBizu}>
            <span><Plus /></span>
            <strong>Novo bizu</strong>
            <small>Começar do zero</small>
          </button>
        </div>
      )}
    </section>
  );
}

export type { Bizu, BizuMateriaOption, BizusTabProps };
