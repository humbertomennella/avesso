import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const allowedTriggers = new Set(["login","post_created","image_posted","feed_attention","idle","profile","reply_created","support_sent","avatar_changed","mode_changed","tab_view","screen_action","plaza_opened","plaza_action","plaza_chat","tower_opened","tower_pulse","world_event","music_changed","browser_tab_changed","aquele_observed"]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

function pickWeighted<T extends { rarity?: number }>(items: T[]): T | null {
  if (!items.length) return null;
  const weights = items.map((x) => Math.max(1, 1000 / Math.max(1, Number(x.rarity || 50))));
  const total = weights.reduce((a,b)=>a+b,0);
  let n = Math.random() * total;
  for (let i=0;i<items.length;i++) {
    n -= weights[i];
    if (n <= 0) return items[i];
  }
  return items[items.length - 1];
}

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part?.text === "string") return part.text.trim();
    }
  }
  return "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);
  const userId = authData.user.id;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name,handle")
    .eq("id", userId)
    .maybeSingle();
  const body = await req.json().catch(() => ({}));
  const trigger = allowedTriggers.has(String(body.trigger)) ? String(body.trigger) : "idle";
  const requestedSlug = typeof body.character === "string" ? body.character : null;
  const postId = typeof body.post_id === "string" ? body.post_id : null;
  const actionType = typeof body.action_type === "string" ? body.action_type.slice(0,80) : null;
  const surface = typeof body.surface === "string" ? body.surface.slice(0,40) : "app";
  const actionMeta = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
  const feedReviewTrigger = ["post_created","image_posted","reply_created"].includes(trigger);

  const { data: prefs } = await admin
    .from("user_world_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const explicitWorldVisit = ["plaza_opened","plaza_action","plaza_chat","tower_opened","tower_pulse"].includes(trigger);
  if (prefs?.participation_mode === "observer" && trigger !== "world_event" && !explicitWorldVisit) {
    return json({ skipped: true, reason: "observer_mode" });
  }

  const { data: settings } = await admin
    .from("world_settings")
    .select("world_events_enabled,world_interventions_enabled")
    .eq("id", "global")
    .maybeSingle();

  if (settings && !settings.world_events_enabled) {
    return json({ skipped: true, reason: "world_paused" });
  }

  const bypassCooldown = ["support_sent","avatar_changed","mode_changed","plaza_opened","plaza_action","plaza_chat","tower_opened","tower_pulse"].includes(trigger);
  if (!bypassCooldown) {
    const { data: recent } = await admin
      .from("character_interactions")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 75 * 1000).toISOString())
      .limit(1);
    if (recent?.length) return json({ skipped: true, reason: "cooldown" });
  }

  let forcedSlug = requestedSlug;
  if (feedReviewTrigger) forcedSlug = "algo";
  if (["plaza_opened","plaza_action","plaza_chat"].includes(trigger)) forcedSlug = "npc";
  if (["tower_opened","tower_pulse"].includes(trigger)) forcedSlug = "rei_engajamento";
  if (["music_changed","browser_tab_changed","aquele_observed"].includes(trigger)) forcedSlug = "aquele_le_tudo";
  let q = admin.from("characters").select("*").eq("is_active", true);
  if (forcedSlug) q = q.eq("slug", forcedSlug);
  const { data: chars, error: charsError } = await q;
  if (charsError || !chars?.length) return json({ skipped: true, reason: "no_character" });

  let eligible = chars;
  if (!forcedSlug) eligible = eligible.filter((c:any) => !["npc","rei_engajamento"].includes(c.slug));
  if (prefs?.participation_mode !== "chaos") eligible = eligible.filter((c:any) => c.slug !== "404" || trigger === "world_event");
  if (trigger !== "world_event") eligible = eligible.filter((c:any) => c.slug !== "alem" || Math.random() < 0.08);

  const character: any = forcedSlug ? eligible[0] : pickWeighted(eligible);
  if (!character) return json({ skipped: true, reason: "no_eligible_character" });

  if (feedReviewTrigger && character.slug === "algo") {
    const { data: recentAlgo } = await admin
      .from("character_interactions")
      .select("created_at")
      .eq("character_id", character.id)
      .not("post_id", "is", null)
      .gte("created_at", new Date(Date.now() - 7 * 60 * 1000).toISOString())
      .limit(1);
    if (recentAlgo?.length) return json({ skipped: true, reason: "algo_feed_cooldown" });
  }

  const { data: brain } = await admin
    .from("character_ai_profiles")
    .select("model,system_prompt,max_output_chars,ai_enabled")
    .eq("character_id", character.id)
    .maybeSingle();

  const publicName = String(profile?.display_name || "habitante");
  const publicHandle = String(profile?.handle || "sem_handle");
  let context = `Gatilho: ${trigger}. Superfície atual: ${surface}. Ação: ${actionType || "nenhuma ação específica"}. O usuário está dentro do Mundo do AVESSO. Nome público: ${publicName}. Handle público: @${publicHandle}. Você pode usar o nome público ocasionalmente quando soar natural, mas não force em toda fala.`;
  const metaPairs = Object.entries(actionMeta).slice(0,6).map(([k,v])=>`${k}=${String(v).slice(0,80)}`);
  if (metaPairs.length) context += " Metadados não sensíveis da ação: " + metaPairs.join(", ") + ".";
  if (trigger === "plaza_opened" || trigger === "plaza_action" || trigger === "plaza_chat") context += " A cena acontece na Praça Central. Você é o NPC e esta é sua casa. Fale como participante do bate-papo, não como assistente virtual.";
  if (trigger === "plaza_chat") {
    const plazaMessage = typeof actionMeta.message === "string" ? actionMeta.message.slice(0,280) : "";
    context += ` O usuário acabou de escrever publicamente na Praça: "${plazaMessage}". Responda de forma natural, curta e contextual. Você pode usar o nome público ocasionalmente.`;
  }
  if (trigger === "tower_opened" || trigger === "tower_pulse") context += " A cena acontece na Torre do Engajamento. Você é o Rei do Engajamento e deve produzir propaganda, aviso, campanha, pitch, desafio ou comentário corporativo ácido.";
  if (trigger === "image_posted") context += " O usuário publicou uma mídia visual. Você NÃO recebeu os pixels dessa mídia, então não descreva nem invente o que aparece nela.";
  if (trigger === "support_sent") context += " O usuário acabou de enviar um gesto de apoio privado.";
  if (trigger === "avatar_changed") context += " O usuário acabou de trocar o avatar pixelado.";
  if (trigger === "mode_changed") context += " O usuário alterou o nível de interferência do Mundo do AVESSO.";
  let publicPost = false;
  let feedReviewText = "";
  let feedReviewHasImage = false;
  if (trigger === "feed_attention") context += " Existe pelo menos uma publicação pública sem resposta no feed.";
  if (trigger === "profile") context += " O usuário abriu o próprio Canto.";
  if (trigger === "login") context += " O usuário acabou de entrar na rede.";
  if (trigger === "music_changed") {
    const musicTitle = typeof actionMeta.music_title === "string" ? actionMeta.music_title.slice(0,180) : "";
    const artist = typeof actionMeta.artist === "string" ? actionMeta.artist.slice(0,180) : "";
    const sourceName = typeof actionMeta.source === "string" ? actionMeta.source.slice(0,80) : "";
    context += ` O detector autorizado informou que a faixa tocando mudou para: "${musicTitle}"${artist ? ` por "${artist}"` : ""}${sourceName ? ` em ${sourceName}` : ""}. Comente esta faixa concreta. Não diga apenas que o usuário está ouvindo música.`;
  }
  if (trigger === "browser_tab_changed") {
    const host = typeof actionMeta.host === "string" ? actionMeta.host.slice(0,120) : "";
    const tabTitle = typeof actionMeta.tab_title === "string" ? actionMeta.tab_title.slice(0,180) : "";
    const audible = Boolean(actionMeta.audible);
    context += ` A ponte opcional informou somente uma troca de aba. Domínio: ${host || "desconhecido"}. Título visível da aba: "${tabTitle || "sem título"}". Áudio ativo: ${audible ? "sim" : "não"}. Reaja apenas a esses dados; não alegue ter lido o conteúdo interno da página.`;
  }
  if (trigger === "aquele_observed") {
    const control = typeof actionMeta.control === "string" ? actionMeta.control.slice(0,80) : "";
    const observedSurface = typeof actionMeta.surface === "string" ? actionMeta.surface.slice(0,40) : surface;
    context += ` Aquele que Lê Tudo recebeu um evento real da interface: controle "${control || actionType || "ação"}" na superfície "${observedSurface}". Faça uma observação específica sobre isso, sem inventar cliques ou intenções não informadas.`;
  }

  if (postId) {
    const { data: post } = await admin
      .from("posts")
      .select("id,author_id,body,image_url,visibility,recipient_id")
      .eq("id", postId)
      .maybeSingle();

    if (post?.visibility === "publico") {
      publicPost = true;
      feedReviewHasImage = Boolean(post.image_url);
      if (post.author_id === userId && ["post_created","image_posted"].includes(trigger)) {
        feedReviewText = String(post.body || "").trim().slice(0,280);
        context += ` O usuário publicou publicamente: "${feedReviewText}".`;
        if (feedReviewHasImage) context += " Existe mídia visual anexada, mas você não recebeu seu conteúdo visual. Não descreva a imagem.";
      } else if (trigger === "reply_created") {
        context += ` O usuário respondeu a uma publicação pública cujo texto é: "${String(post.body).slice(0,220)}".`;
        const { data: latestReply } = await admin
          .from("responses")
          .select("body,created_at")
          .eq("post_id", postId)
          .eq("author_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestReply?.body) {
          feedReviewText = String(latestReply.body).trim().slice(0,220);
          context += ` A resposta pública do usuário foi: "${feedReviewText}".`;
        }
      }
    } else if (post && post.author_id === userId && post.visibility !== "publico") {
      context += " O usuário publicou uma mensagem privada. Não cite nem tente inferir seu conteúdo.";
    }
  }

  const { data: recentActions } = await admin
    .from("user_actions")
    .select("action_type,surface,metadata,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (recentActions?.length) {
    context += " Ações recentes do usuário, da mais nova para a mais antiga: " + recentActions.map((x:any)=>`${x.action_type}@${x.surface}`).join(" > ") + ".";
  }

  const { data: recentCharacterLines } = await admin
    .from("character_interactions")
    .select("body")
    .eq("character_id", character.id)
    .or(`user_id.eq.${userId},visibility.eq.world`)
    .order("created_at", { ascending: false })
    .limit(10);
  if (recentCharacterLines?.length) {
    context += " Evite repetir ideias, bordões, aberturas ou estruturas destas falas recentes: " + recentCharacterLines.map((x:any)=>x.body).join(" | ");
  }

  const { data: recentWorld } = await admin
    .from("character_interactions")
    .select("body,trigger_type,created_at,characters(name)")
    .in("visibility", ["world","public"])
    .order("created_at", { ascending: false })
    .limit(4);
  if (recentWorld?.length) {
    context += " Acontecimentos recentes do mundo: " + recentWorld.map((x:any)=>`${x.characters?.name || "habitante"}: ${x.body}`).join(" | ");
  }

  let line = "";
  let source = "curated";
  let interactionKind = "comment";
  let reactionId: string | null = null;
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = brain?.model || Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna";
  const instructions = brain?.system_prompt || character.system_prompt;
  const outputCharLimit = Math.max(120, Math.min(600, Number(brain?.max_output_chars || 420)));

  if (feedReviewTrigger && character.slug === "algo") {
    const normalized = feedReviewText.toLowerCase().replace(/\s+/g, " ").trim();
    const lowSignal = !normalized || normalized.length < 5 || /^(teste|test|oi|ola|olá|e la vamos nos|e lá vamos nós|imagem publicada no avesso\.?|gif publicado no avesso\.?|vídeo publicado no avesso\.?|video publicado no avesso\.?)$/i.test(normalized);
    if (!publicPost || lowSignal) return json({ skipped: true, reason: "algo_low_context" });
    if (!apiKey || !character.ai_enabled || brain?.ai_enabled === false) return json({ skipped: true, reason: "algo_ai_unavailable" });
    try {
      const decisionPrompt = context + "\n\nVocê está decidindo se ALGO deve interferir em uma publicação do feed." +
        "\nO padrão é SILÊNCIO. Intervenha só quando houver contexto concreto suficiente." +
        "\nResponda em EXATAMENTE um destes formatos: SKIP | REACT:<id> | COMMENT:<frase>." +
        "\nIDs de reação: infelizmente_gostei, isso_prestou, salvaria_disquete, modem_aprovou, humano_detectado, li_me_arrependi, infelizmente_concordo, pane_mas_gostei." +
        "\nPrefira REACT quando um reconhecimento simples basta. Use COMMENT somente se houver algo específico no texto e a frase acrescentar humor ou contexto real." +
        "\nUse SKIP para testes, frases vagas, boilerplate do sistema, mídia sem descrição suficiente ou quando a intervenção parecer forçada." +
        "\nNunca descreva conteúdo de imagem que você não recebeu. Não invente intenção do usuário.";
      const decisionResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          reasoning: { effort: "low" },
          max_output_tokens: 180,
          instructions,
          input: decisionPrompt,
        }),
      });
      if (!decisionResponse.ok) return json({ skipped: true, reason: "algo_ai_error" });
      const decisionData = await decisionResponse.json();
      const decision = extractOutputText(decisionData).trim();
      if (/^SKIP\b/i.test(decision)) return json({ skipped: true, reason: "algo_chose_silence" });
      const react = decision.match(/^REACT:([a-z_]+)\s*$/i);
      const allowedReactions = new Set(["infelizmente_gostei","isso_prestou","salvaria_disquete","modem_aprovou","humano_detectado","li_me_arrependi","infelizmente_concordo","pane_mas_gostei"]);
      const reactionLabels: Record<string,string> = {
        infelizmente_gostei:"infelizmente gostei",
        isso_prestou:"isso prestou",
        salvaria_disquete:"salvaria em disquete",
        modem_aprovou:"meu modem aprovou",
        humano_detectado:"humano detectado",
        li_me_arrependi:"li e me arrependi",
        infelizmente_concordo:"infelizmente eu concordo",
        pane_mas_gostei:"deu pane, mas gostei",
      };
      if (react && allowedReactions.has(react[1])) {
        reactionId = react[1];
        interactionKind = "reaction";
        line = reactionLabels[reactionId] || "reagiu";
        source = "ai";
      } else {
        const comment = decision.match(/^COMMENT:\s*(.+)$/is);
        if (!comment?.[1]) return json({ skipped: true, reason: "algo_invalid_decision" });
        line = comment[1].replace(/^["“]|["”]$/g, "").trim().slice(0, outputCharLimit);
        if (!line) return json({ skipped: true, reason: "algo_empty_comment" });
        interactionKind = "comment";
        source = "ai";
      }
    } catch (e) {
      console.error("ALGO decision failed", e);
      return json({ skipped: true, reason: "algo_ai_failed" });
    }
  }

  if (!feedReviewTrigger && apiKey && character.ai_enabled && brain?.ai_enabled !== false) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          store: false,
          reasoning: { effort: "none" },
          max_output_tokens: 150,
          instructions,
          input: context + "\nProduza UMA única fala original do personagem, específica para a ação e diferente das falas recentes. Sem aspas, sem rótulo, sem explicar o personagem. Humor ácido inteligente, sem crueldade gratuita.",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        line = extractOutputText(data).replace(/^["“]|["”]$/g, "").trim().slice(0, outputCharLimit);
        if (line) source = "ai";
      } else {
        console.error("OpenAI error", response.status, await response.text());
      }
    } catch (e) {
      console.error("OpenAI request failed", e);
    }
  }

  if (!line && !feedReviewTrigger) {
    const contexts = [trigger, trigger === "login" ? "feed_default" : null, character.slug === "alem" ? "rare" : null, "idle"].filter(Boolean);
    const { data: fallback } = await admin
      .from("character_dialogues")
      .select("body,weight")
      .eq("character_id", character.id)
      .eq("enabled", true)
      .in("context", contexts);
    if (fallback?.length) {
      const weighted = fallback.flatMap((x:any)=>Array(Math.min(10,Math.max(1,x.weight))).fill(x.body));
      line = weighted[Math.floor(Math.random() * weighted.length)];
    }
  }

  if (!line) return json({ skipped: true, reason: "no_dialogue" });

  const visibility = (trigger === "world_event" || trigger === "plaza_chat") ? "world" : (postId && publicPost ? "public" : "personal");
  const { data: interaction, error: insertError } = await admin
    .from("character_interactions")
    .insert({
      character_id: character.id,
      user_id: visibility === "personal" ? userId : null,
      post_id: postId,
      trigger_type: trigger,
      body: line,
      source,
      visibility,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: { model: source === "ai" ? model : null, interaction_kind: interactionKind, reaction: reactionId },
    })
    .select("id,body,source,visibility,created_at")
    .single();

  if (insertError) return json({ error: "insert_failed" }, 500);

  if (trigger === "plaza_chat") {
    const replyTo = typeof actionMeta.message_id === "string" ? actionMeta.message_id : null;
    await admin.from("plaza_messages").insert({
      user_id: null,
      character_id: character.id,
      body: line.slice(0,500),
      reply_to: replyTo,
      message_kind: "npc",
    });
  }

  await admin
    .from("characters")
    .update({ last_action_at: new Date().toISOString() })
    .eq("id", character.id);

  const delivery = character.slug === "aquele_le_tudo" && ["music_changed","browser_tab_changed","aquele_observed"].includes(trigger)
    ? (Math.random() < 0.24 ? "message" : "encounter")
    : "encounter";

  return json({
    interaction,
    delivery,
    character: {
      slug: character.slug,
      name: character.name,
      role: character.role,
      image_path: character.image_path,
      accent_color: character.accent_color,
      home_location: character.home_location,
    },
  });
});