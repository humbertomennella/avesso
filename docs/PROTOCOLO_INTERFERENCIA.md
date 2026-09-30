# PROTOCOLO DE INTERFERÊNCIA — AVESSO

> **Objetivo:** permitir que personagens do Mundo do AVESSO interfiram na experiência de forma divertida, reversível, transparente e segura.
> **Nome interno:** AVESSO Interference Protocol — AIP.

---

## 1. Princípio

Personagens podem bagunçar a apresentação.

Não podem falsificar autoria, destruir conteúdo, expor dados ou enganar o usuário sobre ações reais.

A intervenção é uma camada narrativa separada do conteúdo.

**Conteúdo humano continua humano. Bagunça de personagem continua atribuída ao personagem.**

---

## 2. Estados de participação

Cada conta terá uma preferência global.

### observer

O usuário vê acontecimentos globais e personagens, mas não recebe sabotagens pessoais.

### world

O usuário participa de eventos e interações narrativas, mas interferências pessoais ficam limitadas a bilhetes, aparições e comentários.

### chaos

O usuário permite intervenções visuais temporárias em Canto, posts elegíveis e interface não essencial.

Padrão inicial recomendado: world.

Nunca ativar chaos sem escolha explícita.

---

## 3. Preferência por publicação

Cada post pode possuir:

- inherit — segue preferência da conta;
- allow — permite intervenção;
- deny — bloqueia intervenção.

Posts privados devem usar deny por padrão.

---

## 4. Categorias de intervenção

### stamp

Carimbo sobre o card.

Exemplo:

> 404 ESTEVE AQUI

### annotation

Comentário de personagem exibido separadamente.

### skin

Mudança cosmética temporária do card.

### prop

Objeto visual adicionado ao Canto.

### dialog

Caixa de diálogo narrativa.

### glitch

Efeito visual breve.

### rename_visual

Troca somente o título visual de uma área, sem mudar dados reais.

Exemplo: Seu Canto vira temporariamente “Imóvel ocupado por pixels”.

### world_notice

Aviso global de evento.

### character_visit

Personagem aparece no Canto ou numa região.

### quest

Pequena ação narrativa voluntária.

---

## 5. Ações proibidas

Personagens nunca podem:

- modificar o texto original de um post;
- modificar mensagens privadas;
- alterar senha, e-mail ou autenticação;
- publicar como o usuário;
- apagar post;
- bloquear ou desbloquear pessoas;
- alterar configurações de privacidade;
- alterar denúncia;
- expor destinatário privado;
- acessar conteúdo ao qual o usuário não teria acesso;
- simular ação jurídica ou de segurança real;
- fingir que uma conta foi banida quando não foi;
- criar alerta médico, financeiro ou de emergência falso;
- alterar dados de auditoria.

---

## 6. Áreas protegidas

Interferência automática fica desativada em:

- conteúdo marcado como sensível;
- denúncias;
- bloqueios;
- mensagens privadas;
- recuperação de conta;
- autenticação;
- configuração de segurança;
- exclusão de conta;
- suporte;
- páginas legais;
- conteúdo com sinais de crise grave até classificação segura.

A camada narrativa nunca compete com segurança real.

---

## 7. Transparência

Toda intervenção deve registrar:

- personagem responsável;
- tipo;
- horário;
- duração;
- motivo narrativo;
- origem do evento;
- opção de dispensar quando pessoal;
- registro técnico.

Exemplo:

> Interferência de 404
>
> “Seu post estava muito alinhado. Resolvi.”
>
> [restaurar visual]

---

## 8. Reversibilidade

Toda interferência cosmética deve expirar.

Campos sugeridos:

- starts_at
- ends_at
- dismissed_at
- status

Estados:

- scheduled
- active
- dismissed
- expired
- revoked

---

## 9. Modelo de dados proposto

### characters

- id uuid
- slug text unique
- name text
- role text
- avatar_url text
- accent_color text
- is_active boolean
- created_at timestamptz

### world_events

- id uuid
- slug text unique
- title text
- description text
- event_type text
- status text
- starts_at timestamptz
- ends_at timestamptz
- config jsonb
- created_at timestamptz

### user_world_preferences

- user_id uuid primary key
- participation_mode text
- allow_post_interference boolean
- allow_profile_interference boolean
- allow_character_visits boolean
- reduce_motion boolean
- updated_at timestamptz

### interventions

- id uuid
- event_id uuid nullable
- character_id uuid
- target_type text
- target_id uuid nullable
- target_user_id uuid nullable
- intervention_type text
- payload jsonb
- status text
- starts_at timestamptz
- ends_at timestamptz
- dismissed_at timestamptz nullable
- created_at timestamptz

### world_logs

Registro administrativo e de auditoria.

- id bigint
- event_id uuid nullable
- intervention_id uuid nullable
- actor text
- action text
- metadata jsonb
- created_at timestamptz

### character_dialogues

- id uuid
- character_id uuid
- key text
- context text
- body text
- weight int
- enabled boolean

---

## 10. RLS

### Usuário

Pode:

- ler personagens públicos;
- ler eventos ativos;
- ler suas preferências;
- atualizar suas preferências;
- ler intervenções públicas;
- ler intervenções destinadas a ele;
- dispensar suas próprias intervenções elegíveis.

Não pode:

- criar intervenção;
- escolher outro usuário como alvo;
- alterar personagem;
- ativar evento;
- mudar payload de uma intervenção;
- escrever logs administrativos.

### Sistema

Intervenções devem ser criadas por Edge Function ou backend confiável usando credencial de serviço fora do cliente.

Nunca expor service_role no navegador.

---

## 11. Motor de eventos

Fluxo:

1. evento fica ativo;
2. scheduler chama Edge Function;
3. função carrega regras;
4. seleciona alvos elegíveis;
5. aplica filtros de segurança;
6. aplica cooldown;
7. cria intervenções;
8. Realtime notifica clientes;
9. UI renderiza a camada narrativa;
10. evento expira;
11. camada desaparece;
12. log permanece.

---

## 12. Seleção de alvo

Pode usar:

- participação opt-in;
- atividade recente;
- post elegível;
- aleatoriedade;
- região visitada;
- participação no evento;
- cooldown.

Não usar:

- saúde;
- renda;
- religião;
- raça;
- orientação sexual;
- conteúdo privado;
- denúncias;
- inferência emocional sensível.

O sistema não escolhe alvo porque alguém parece vulnerável.

---

## 13. Cooldown

Sugestão inicial:

- no máximo 1 intervenção pessoal do 404 a cada 24 horas;
- no máximo 3 microinterações de personagens por sessão;
- eventos globais independem desse limite, mas devem ser discretos;
- usuário pode dispensar.

A piada morre quando vira popup corporativo.

---

## 14. Severidade

### Nível 0 — ambientação

Sem interferência pessoal.

### Nível 1 — comentário

Bilhete, fala ou etiqueta.

### Nível 2 — cosmético

Skin ou objeto visual.

### Nível 3 — interação

Pequena missão ou ação voluntária.

### Nível 4 — evento global

Mudança temática temporária do mundo.

Nenhum nível toca dado autoral do usuário.

---

## 15. Renderização

A UI deve receber o conteúdo original e uma lista separada de intervenções ativas.

Conceito:

    renderPost(post)
    renderInterventions(post.id)

Nunca:

    post.body = characterRewrite(post.body)

---

## 16. Exemplo de payload

    {
      "type": "stamp",
      "text": "404 ESTEVE AQUI",
      "subtext": "Seu post estava muito alinhado.",
      "rotation": -2,
      "accent": "#d8ff3e",
      "dismissible": true
    }

---

## 17. Evento piloto — A Grande Pane

Configuração inicial:

- personagem principal: 404;
- suporte: ALGO, NPC, Pessoa que Lê Tudo;
- antagonista oportunista: Rei do Engajamento;
- duração piloto: 48 horas;
- participação pessoal: world e chaos;
- sabotagem visual: somente chaos;
- conteúdo protegido: excluído.

Intervenções piloto:

1. carimbo em post elegível;
2. bilhete no Canto;
3. caixa de erro falsa de vaidade.dll;
4. fala de ALGO no feed;
5. NPC pedindo ajuda na Praça;
6. outdoor do Rei do Engajamento;
7. comentário da Pessoa que Lê Tudo no CTA.

---

## 18. Moderação e controle

Intervenções são conteúdo editorial da plataforma.

Precisam de:

- catálogo revisado;
- logs;
- revogação;
- blacklist;
- kill switch global;
- versão de conteúdo;
- testes antes da ativação.

### Kill switch

Configuração administrativa:

world_interventions_enabled = false

Sem deploy.

Porque eventualmente 404 vai fazer algo que nem 404 deveria ter feito.

---

## 19. IA

Fase inicial: não usar IA generativa para improvisar sabotagens em produção.

Usar biblioteca curada de:

- falas;
- eventos;
- respostas;
- combinações.

No futuro, IA pode variar texto dentro de regras, desde que:

- a saída seja moderada;
- não tenha acesso irrestrito a dados privados;
- não imite usuário;
- não infira atributo sensível;
- não decida punição;
- seja sempre atribuída ao personagem.

---

## 20. Métricas saudáveis

Medir:

- intervenções dispensadas;
- participação voluntária;
- retorno a conversas;
- respostas;
- denúncias;
- bloqueios;
- eventos concluídos;
- preferência observer/world/chaos.

Não otimizar para:

- tempo infinito;
- compulsão;
- cliques por ansiedade;
- FOMO;
- volume de notificações.

---

## 21. Critério de sucesso

O protocolo funciona quando o usuário pensa:

> “O 404 mexeu no meu post.”

e não:

> “O site quebrou.”

Essa diferença é o produto inteiro.
