import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}
function outputText(data:any){
  if(typeof data?.output_text==="string")return data.output_text.trim();
  for(const item of data?.output||[])for(const part of item?.content||[])if(part?.type==="output_text"&&typeof part.text==="string")return part.text.trim();
  return "";
}
function safeJson(raw:string){
  try{return JSON.parse(raw);}catch{}
  const match=raw.match(/\{[\s\S]*\}/);
  if(!match)return null;
  try{return JSON.parse(match[0]);}catch{return null;}
}
function fallback(){
  const items=[
    {kind:"campanha",title:"PROGRAMA FIQUE 3 MINUTOS SEM OTIMIZAR NADA",description:"O Rei promete zero produtividade, nenhuma conversão e um retorno humano alarmantemente aceitável.",cta:"participar sem preencher formulário"},
    {kind:"evento",title:"HAPPY HOUR SEM KPI",description:"Durante uma hora, qualquer tentativa de medir felicidade será encaminhada ao setor responsável por planilhas imaginárias.",cta:"entrar antes que monetizem"},
    {kind:"publicidade",title:"PLANO PREMIUM DE SILÊNCIO",description:"Agora com 100% menos notificações que você não pediu. O preço continua sendo não prestar atenção.",cta:"ignorar anúncio conscientemente"}
  ];
  return items[Math.floor(Math.random()*items.length)];
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);

  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth=req.headers.get("Authorization")||"";
  const user=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:auth}}});
  const {data:authData,error:authError}=await user.auth.getUser();
  if(authError||!authData.user)return json({error:"unauthorized"},401);

  const admin=createClient(supabaseUrl,serviceKey);
  const cutoff=new Date(Date.now()-45*60*1000).toISOString();
  const {data:recent}=await admin.from("world_events")
    .select("*")
    .eq("status","active")
    .gte("created_at",cutoff)
    .contains("config",{creator:"rei_engajamento"})
    .order("created_at",{ascending:false})
    .limit(1)
    .maybeSingle();

  if(recent)return json({event:recent,created:false});

  const {data:king}=await admin.from("characters").select("id,name,system_prompt,ai_enabled").eq("slug","rei_engajamento").maybeSingle();
  const {data:brain}=king?.id?await admin.from("character_ai_profiles").select("model,system_prompt,ai_enabled").eq("character_id",king.id).maybeSingle():{data:null};

  const {data:old}=await admin.from("world_events")
    .select("title,description,config,created_at")
    .contains("config",{creator:"rei_engajamento"})
    .order("created_at",{ascending:false})
    .limit(8);

  let generated:any=null;
  const apiKey=Deno.env.get("OPENAI_API_KEY");
  if(apiKey&&king?.ai_enabled&&brain?.ai_enabled!==false){
    const recentText=(old||[]).map((x:any)=>`${x.title}: ${x.description}`).join(" | ");
    const prompt=`${brain?.system_prompt||king.system_prompt||""}
Crie UMA nova intervenção pública persistente da Torre do Engajamento para todos os usuários do AVESSO.
Ela deve ser uma campanha, evento ou publicidade interna fictícia do universo AVESSO.
Não anuncie marcas reais, não peça dinheiro, não imite aviso de segurança e não crie urgência enganosa.
O humor é ácido, corporativo e absurdo, mas deve continuar legível e convidativo.
Evite repetir estas recentes: ${recentText||"nenhuma"}.
Responda SOMENTE JSON no formato:
{"kind":"campanha|evento|publicidade","title":"até 90 caracteres","description":"até 260 caracteres","cta":"até 60 caracteres","importance":"normal|important"}
Use "important" apenas se a própria atividade exigir atenção imediata dentro do universo; na dúvida use "normal".`;
    try{
      const response=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",
        headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
        body:JSON.stringify({
          model:brain?.model||Deno.env.get("OPENAI_MODEL")||"gpt-5.6-luna",
          store:false,
          reasoning:{effort:"none"},
          max_output_tokens:180,
          input:prompt
        })
      });
      if(response.ok)generated=safeJson(outputText(await response.json()));
    }catch{}
  }

  const fb=fallback();
  const kind=["campanha","evento","publicidade"].includes(String(generated?.kind))?String(generated.kind):fb.kind;
  const title=String(generated?.title||fb.title).trim().slice(0,90);
  const description=String(generated?.description||fb.description).trim().slice(0,260);
  const cta=String(generated?.cta||fb.cta).trim().slice(0,60);
  const importance=generated?.importance==="important"?"important":"normal";
  const now=Date.now();
  const slug=`rei_${kind}_${now.toString(36)}`;
  const startsAt=new Date(now).toISOString();
  const endsAt=new Date(now+90*60*1000).toISOString();

  const {data:event,error:eventError}=await admin.from("world_events").insert({
    slug,title,description,event_type:"micro",status:"active",starts_at:startsAt,ends_at:endsAt,
    config:{creator:"rei_engajamento",kind,cta,importance,source:generated?"ai":"curated"}
  }).select("*").single();
  if(eventError)return json({error:"event_insert_failed"},500);

  if(king?.id){
    await admin.from("character_interactions").insert({
      character_id:king.id,user_id:null,post_id:null,trigger_type:"king_broadcast",
      body:`${title} // ${description}`.slice(0,520),
      source:generated?"ai":"curated",visibility:"world",
      expires_at:endsAt,
      metadata:{world_event_id:event.id,kind,cta,importance}
    });
    await admin.from("characters").update({last_action_at:new Date().toISOString()}).eq("id",king.id);
  }

  return json({event,created:true});
});
