// ============================================================================
// SEED — Protocolos Clínicos Nativos para Fonoaudiologia
// Escalas validadas: MBGR, DOSS, GRBAS, CAPE-V, SSI-3, VHI-10, FOIS,
//                   ABFW (Vocabulário), PROC, ELM-2, Rankin, OMES
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

function sel(options: { value: number; label: string; score?: number }[]) {
  return options.map((o) => ({ ...o, type: 'select' as const }));
}

// ── Protocol Templates ────────────────────────────────────────────────────────

const PROTOCOLS = [
  // ══════════════════════════════════════════════════════════════════════════
  // DISFAGIA
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'DOSS — Dysphagia Outcome and Severity Scale',
    area: 'fonoaudiologia',
    description: 'Escala de 7 níveis para classificar a severidade da disfagia e orientar a dieta.',
    version: '1.0',
    fields: [
      {
        key: 'nivel',
        label: 'Nível de disfagia',
        type: 'select',
        required: true,
        description: 'Selecione o nível que melhor descreve o funcionamento atual do paciente',
        options: [
          { value: 1, label: '1 — Disfagia severa (dependente, não-oral)', score: 1 },
          { value: 2, label: '2 — Disfagia severa (máxima assistência, oral mínima)', score: 2 },
          { value: 3, label: '3 — Disfagia moderada (total dependência de suporte)', score: 3 },
          { value: 4, label: '4 — Disfagia moderada-leve (assistência mínima)', score: 4 },
          { value: 5, label: '5 — Disfagia leve (supervisão distante)', score: 5 },
          { value: 6, label: '6 — Disfagia funcional (modificação de dieta)', score: 6 },
          { value: 7, label: '7 — Deglutição normal para todas as consistências', score: 7 },
        ],
      },
      {
        key: 'consistencia_liquidos',
        label: 'Consistência de líquidos tolerada',
        type: 'select',
        options: [
          { value: 'nenhum', label: 'Nenhuma (NPO)' },
          { value: 'extraespesso', label: 'Extraespesso (pudim)' },
          { value: 'espesso', label: 'Espesso (néctar)' },
          { value: 'levemente_espesso', label: 'Levemente espesso (mel)' },
          { value: 'fino', label: 'Fino (água, suco)' },
        ],
      },
      {
        key: 'via_alimentacao',
        label: 'Via de alimentação',
        type: 'select',
        options: [
          { value: 'npo', label: 'Via oral zero (NPO)' },
          { value: 'sng', label: 'Sonda nasogástrica (SNG)' },
          { value: 'gtm', label: 'Gastrostomia (GTM)' },
          { value: 'oral_parcial', label: 'Via oral parcial + complementação' },
          { value: 'oral_total', label: 'Via oral total' },
        ],
      },
      {
        key: 'observacoes',
        label: 'Observações clínicas',
        type: 'text',
      },
    ],
  },

  {
    name: 'FOIS — Functional Oral Intake Scale',
    area: 'fonoaudiologia',
    description: 'Escala de 7 pontos para ingestão oral funcional em adultos com disfagia.',
    version: '1.0',
    fields: [
      {
        key: 'nivel',
        label: 'Nível FOIS',
        type: 'select',
        required: true,
        options: [
          { value: 1, label: '1 — Nada por via oral', score: 1 },
          { value: 2, label: '2 — Dependente de alimentação alternativa com mínima ingesta VO', score: 2 },
          { value: 3, label: '3 — Alimentação alternativa com ingestão consistente VO', score: 3 },
          { value: 4, label: '4 — Via oral total com apenas uma consistência', score: 4 },
          { value: 5, label: '5 — Via oral total com múltiplas consistências (requer preparo especial)', score: 5 },
          { value: 6, label: '6 — Via oral total sem restrições, mas com modificações de tempo', score: 6 },
          { value: 7, label: '7 — Via oral total, sem restrições', score: 7 },
        ],
      },
      {
        key: 'observacoes',
        label: 'Observações',
        type: 'text',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VOZ
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'GRBAS — Grading of Dysphonia',
    area: 'fonoaudiologia',
    description: 'Escala perceptivo-auditiva para avaliação da qualidade vocal. Cada parâmetro de 0 a 3.',
    version: '1.0',
    fields: [
      {
        key: 'G',
        label: 'G — Grau geral de disfonia',
        type: 'scale',
        min: 0,
        max: 3,
        required: true,
        description: '0=normal, 1=leve, 2=moderado, 3=severo',
      },
      {
        key: 'R',
        label: 'R — Rugosidade (Roughness)',
        type: 'scale',
        min: 0,
        max: 3,
        description: 'Irregularidade vibratória das pregas vocais',
      },
      {
        key: 'B',
        label: 'B — Soprosidade (Breathiness)',
        type: 'scale',
        min: 0,
        max: 3,
        description: 'Escape de ar audível durante a fonação',
      },
      {
        key: 'A',
        label: 'A — Astenia',
        type: 'scale',
        min: 0,
        max: 3,
        description: 'Fraqueza, hipofunção laríngea',
      },
      {
        key: 'S',
        label: 'S — Tensão (Strain)',
        type: 'scale',
        min: 0,
        max: 3,
        description: 'Hiperfunção laríngea, esforço vocal',
      },
      {
        key: 'observacoes',
        label: 'Observações / Diagnóstico vocal',
        type: 'text',
      },
    ],
  },

  {
    name: 'VHI-10 — Voice Handicap Index (versão reduzida)',
    area: 'fonoaudiologia',
    description: 'Questionário de autopercepção do handicap vocal. Aplicado ao próprio paciente. Escore máximo: 40.',
    version: '1.0',
    fields: [
      ...[
        { key: 'q1', label: 'Minha voz dificulta as pessoas de me ouvirem' },
        { key: 'q2', label: 'As pessoas têm dificuldade de me entender em locais barulhentos' },
        { key: 'q3', label: 'Minha família tem dificuldade de me ouvir quando os chamo de outra sala' },
        { key: 'q4', label: 'Uso o telefone com menos frequência do que gostaria' },
        { key: 'q5', label: 'Tendo a evitar grupos de pessoas por causa da minha voz' },
        { key: 'q6', label: 'Falo menos com amigos, vizinhos e parentes por causa da minha voz' },
        { key: 'q7', label: 'As pessoas me pedem para repetir o que eu digo' },
        { key: 'q8', label: 'Meu problema de voz me aborrece' },
        { key: 'q9', label: 'Meu problema de voz me deixa em desvantagem' },
        { key: 'q10', label: 'As pessoas me perguntam: "O que há de errado com sua voz?"' },
      ].map((q) => ({
        ...q,
        type: 'select' as const,
        required: true,
        options: [
          { value: 0, label: '0 — Nunca', score: 0 },
          { value: 1, label: '1 — Quase nunca', score: 1 },
          { value: 2, label: '2 — Às vezes', score: 2 },
          { value: 3, label: '3 — Quase sempre', score: 3 },
          { value: 4, label: '4 — Sempre', score: 4 },
        ],
      })),
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FLUÊNCIA
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'SSI-3 — Stuttering Severity Instrument',
    area: 'fonoaudiologia',
    description: 'Avaliação da severidade da gagueira em crianças e adultos. Frequência, duração e comportamentos físicos.',
    version: '3.0',
    fields: [
      {
        key: 'frequencia_percentil',
        label: 'Frequência de disfluências (percentil)',
        type: 'select',
        required: true,
        description: 'Percentual de sílabas gaguejadas na amostra de fala',
        options: [
          { value: 1, label: '≤ 2%  (percentil 1-4)', score: 2 },
          { value: 3, label: '3%   (percentil 5-11)', score: 4 },
          { value: 5, label: '5%   (percentil 12-23)', score: 6 },
          { value: 8, label: '8%   (percentil 24-40)', score: 8 },
          { value: 12, label: '12%  (percentil 41-60)', score: 10 },
          { value: 17, label: '17%  (percentil 61-77)', score: 12 },
          { value: 23, label: '23%  (percentil 78-88)', score: 14 },
          { value: 31, label: '31%  (percentil 89-95)', score: 16 },
          { value: 49, label: '49%+ (percentil 96-99)', score: 18 },
        ],
      },
      {
        key: 'duracao_media',
        label: 'Duração média das 3 maiores disfluências (s)',
        type: 'select',
        required: true,
        options: [
          { value: '< 0.5s', label: '< 0,5s', score: 2 },
          { value: '0.5-0.9s', label: '0,5 – 0,9s', score: 4 },
          { value: '1-1.9s', label: '1 – 1,9s', score: 6 },
          { value: '2-4.9s', label: '2 – 4,9s', score: 8 },
          { value: '5-9.9s', label: '5 – 9,9s', score: 10 },
          { value: '10-29.9s', label: '10 – 29,9s', score: 12 },
          { value: '30-59.9s', label: '30 – 59,9s', score: 14 },
          { value: '≥ 60s', label: '≥ 60s', score: 16 },
        ],
      },
      {
        key: 'comportamentos_fisicos',
        label: 'Escore total de comportamentos físicos associados',
        type: 'scale',
        min: 0,
        max: 20,
        required: true,
        description: 'Some os escores de distração de sons, movimentos faciais, movimentos de cabeça/pescoço e movimentos de extremidades (0-20)',
      },
      {
        key: 'classificacao',
        label: 'Classificação SSI-3',
        type: 'select',
        options: [
          { value: 'muito_leve', label: 'Muito leve (10-17)' },
          { value: 'leve', label: 'Leve (18-25)' },
          { value: 'moderado', label: 'Moderado (26-36)' },
          { value: 'severo', label: 'Severo (37-46)' },
          { value: 'muito_severo', label: 'Muito severo (47+)' },
        ],
      },
      {
        key: 'observacoes',
        label: 'Observações / comportamentos específicos',
        type: 'text',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MOTRICIDADE OROFACIAL
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'MBGR — Protocolo Miofuncional Orofacial',
    area: 'fonoaudiologia',
    description: 'Protocolo de avaliação miofuncional orofacial com escores (Marchesan, Berretin-Felix, Genaro, Rehder).',
    version: '2.0',
    fields: [
      // FACE
      {
        key: 'face_simetria',
        label: 'Face — Simetria',
        type: 'select',
        options: [
          { value: 0, label: '0 — Simétrica', score: 0 },
          { value: 1, label: '1 — Assimetria leve', score: 1 },
          { value: 2, label: '2 — Assimetria moderada', score: 2 },
          { value: 3, label: '3 — Assimetria severa', score: 3 },
        ],
      },
      // LÁBIOS
      {
        key: 'labios_postura',
        label: 'Lábios — Postura habitual',
        type: 'select',
        options: [
          { value: 0, label: '0 — Fechados', score: 0 },
          { value: 1, label: '1 — Entreabertos', score: 1 },
          { value: 2, label: '2 — Abertos', score: 2 },
        ],
      },
      {
        key: 'labios_tonus',
        label: 'Lábios — Tonus',
        type: 'select',
        options: [
          { value: 0, label: '0 — Normal', score: 0 },
          { value: 1, label: '1 — Diminuído (hipotônico)', score: 1 },
          { value: 2, label: '2 — Aumentado (hipertônico)', score: 2 },
        ],
      },
      // LÍNGUA
      {
        key: 'lingua_postura',
        label: 'Língua — Postura habitual',
        type: 'select',
        options: [
          { value: 0, label: '0 — No assoalho bucal', score: 0 },
          { value: 1, label: '1 — Anteriorizada entre os dentes', score: 1 },
          { value: 2, label: '2 — Posteriorizada', score: 2 },
          { value: 3, label: '3 — Elevada no palato', score: 0 },
        ],
      },
      {
        key: 'lingua_mobilidade',
        label: 'Língua — Mobilidade',
        type: 'select',
        options: [
          { value: 0, label: '0 — Normal', score: 0 },
          { value: 1, label: '1 — Levemente reduzida', score: 1 },
          { value: 2, label: '2 — Moderadamente reduzida', score: 2 },
          { value: 3, label: '3 — Severamente reduzida', score: 3 },
        ],
      },
      // MASTIGAÇÃO
      {
        key: 'mastigacao_padrao',
        label: 'Mastigação — Padrão',
        type: 'select',
        options: [
          { value: 0, label: '0 — Bilateral alternado', score: 0 },
          { value: 1, label: '1 — Bilateral simultâneo', score: 1 },
          { value: 2, label: '2 — Unilateral preferencial', score: 2 },
          { value: 3, label: '3 — Unilateral crônico', score: 3 },
          { value: 4, label: '4 — Frontal', score: 2 },
        ],
      },
      // DEGLUTIÇÃO
      {
        key: 'deglutição_postura_lingua',
        label: 'Deglutição — Postura da língua',
        type: 'select',
        options: [
          { value: 0, label: '0 — Normal (no palato duro)', score: 0 },
          { value: 1, label: '1 — Interposição lingual anterior', score: 2 },
          { value: 2, label: '2 — Interposição lingual lateral', score: 2 },
          { value: 3, label: '3 — Participação labial compensatória', score: 1 },
        ],
      },
      // RESPIRAÇÃO
      {
        key: 'respiracao_modo',
        label: 'Respiração — Modo',
        type: 'select',
        options: [
          { value: 0, label: '0 — Nasal', score: 0 },
          { value: 1, label: '1 — Oronasal', score: 1 },
          { value: 2, label: '2 — Oral', score: 2 },
        ],
      },
      {
        key: 'observacoes',
        label: 'Observações e condutas',
        type: 'text',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LINGUAGEM INFANTIL
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'ABFW — Vocabulário (Nomeação)',
    area: 'fonoaudiologia',
    description: 'Teste de vocabulário por nomeação do ABFW. Registra designações por categoria semântica.',
    version: '2.0',
    fields: [
      {
        key: 'idade',
        label: 'Idade cronológica (anos;meses)',
        type: 'text',
        required: true,
      },
      ...[
        { key: 'vestuario', label: 'Vestuário' },
        { key: 'alimentos', label: 'Alimentos' },
        { key: 'transporte', label: 'Transporte' },
        { key: 'moveis', label: 'Móveis/Utensílios' },
        { key: 'animais', label: 'Animais' },
        { key: 'profissoes', label: 'Profissões' },
        { key: 'locais', label: 'Locais' },
        { key: 'formas_cores', label: 'Formas e cores' },
        { key: 'brinquedos', label: 'Brinquedos' },
        { key: 'instrumentos', label: 'Instrumentos musicais' },
      ].map((cat) => ({
        key: `${cat.key}_d`,
        label: `${cat.label} — Nº de acertos (D)`,
        type: 'number' as const,
        min: 0,
        max: 12,
        description: 'Designação convencional correta',
      })),
      {
        key: 'total_d',
        label: 'Total D (designações convencionais)',
        type: 'number',
        min: 0,
        max: 120,
      },
      {
        key: 'percentil',
        label: 'Percentil (conforme tabela normativa ABFW)',
        type: 'select',
        options: [
          { value: 'abaixo_p10', label: 'Abaixo do percentil 10 (alterado)' },
          { value: 'p10_p25', label: 'P10 – P25 (limítrofe)' },
          { value: 'p25_p75', label: 'P25 – P75 (normal)' },
          { value: 'acima_p75', label: 'Acima do P75 (acima da média)' },
        ],
      },
      {
        key: 'observacoes',
        label: 'Tipos de desacertos / observações',
        type: 'text',
      },
    ],
  },

  {
    name: 'PROC — Protocolo de Observação Comportamental',
    area: 'fonoaudiologia',
    description: 'Avaliação de habilidades comunicativas em crianças pré-verbais e com TEA (0 a 2 anos ou desenvolvimento atípico).',
    version: '1.0',
    fields: [
      {
        key: 'faixa_etaria',
        label: 'Faixa etária ou equivalente desenvolvimental',
        type: 'select',
        required: true,
        options: [
          { value: '0-6m', label: '0 – 6 meses' },
          { value: '6-12m', label: '6 – 12 meses' },
          { value: '12-18m', label: '12 – 18 meses' },
          { value: '18-24m', label: '18 – 24 meses' },
          { value: '24m+', label: '24+ meses' },
        ],
      },
      {
        key: 'atencao_conjunta',
        label: 'Atenção conjunta',
        type: 'select',
        options: [
          { value: 0, label: '0 — Ausente' },
          { value: 1, label: '1 — Emergente' },
          { value: 2, label: '2 — Presente consistente' },
        ],
      },
      {
        key: 'contato_ocular',
        label: 'Contato ocular para comunicação',
        type: 'select',
        options: [
          { value: 0, label: '0 — Ausente/inconsistente' },
          { value: 1, label: '1 — Presente mas limitado' },
          { value: 2, label: '2 — Funcional e frequente' },
        ],
      },
      {
        key: 'apontar',
        label: 'Gesto de apontar (proto-imperativo/declarativo)',
        type: 'select',
        options: [
          { value: 0, label: '0 — Ausente' },
          { value: 1, label: '1 — Proto-imperativo apenas' },
          { value: 2, label: '2 — Proto-imperativo e declarativo' },
        ],
      },
      {
        key: 'imitacao',
        label: 'Imitação de sons e gestos',
        type: 'select',
        options: [
          { value: 0, label: '0 — Ausente' },
          { value: 1, label: '1 — Imitação gestual presente' },
          { value: 2, label: '2 — Imitação verbal e gestual' },
        ],
      },
      {
        key: 'uso_verbal',
        label: 'Uso verbal/vocalização funcional',
        type: 'select',
        options: [
          { value: 0, label: '0 — Sem vocalizações comunicativas' },
          { value: 1, label: '1 — Jargão / palavras isoladas' },
          { value: 2, label: '2 — Combinação de 2+ palavras' },
        ],
      },
      {
        key: 'sinais_alerta',
        label: 'Sinais de alerta observados',
        type: 'text',
        description: 'Ecolalia, inversão pronominal, ausência de pointing, etc.',
      },
      {
        key: 'observacoes',
        label: 'Observações gerais e conduta',
        type: 'text',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LINGUAGEM ADULTO / NEUROLOGIA
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'Rankin Modificada — Afasia e Funcionalidade',
    area: 'fonoaudiologia',
    description: 'Escala de Rankin Modificada adaptada para fonoaudiologia — avalia independência comunicativa pós-AVC.',
    version: '1.0',
    fields: [
      {
        key: 'nivel_rankin',
        label: 'Nível na Escala de Rankin Modificada',
        type: 'select',
        required: true,
        options: [
          { value: 0, label: '0 — Sem sintomas comunicativos', score: 0 },
          { value: 1, label: '1 — Sem incapacidade significativa', score: 1 },
          { value: 2, label: '2 — Incapacidade leve (comunicação prejudicada, mas independente)', score: 2 },
          { value: 3, label: '3 — Incapacidade moderada (necessita alguma ajuda)', score: 3 },
          { value: 4, label: '4 — Incapacidade moderada-severa (dependente para comunicação)', score: 4 },
          { value: 5, label: '5 — Incapacidade severa (dependência total)', score: 5 },
        ],
      },
      {
        key: 'compreensao',
        label: 'Compreensão oral',
        type: 'select',
        options: [
          { value: 'preservada', label: 'Preservada' },
          { value: 'levemente_comprometida', label: 'Levemente comprometida' },
          { value: 'moderadamente', label: 'Moderadamente comprometida' },
          { value: 'severamente', label: 'Severamente comprometida' },
        ],
      },
      {
        key: 'expressao',
        label: 'Expressão verbal',
        type: 'select',
        options: [
          { value: 'fluente', label: 'Fluente' },
          { value: 'nao_fluente', label: 'Não fluente' },
          { value: 'anomica', label: 'Anômica' },
          { value: 'ausente', label: 'Ausente (mutismo)' },
        ],
      },
      {
        key: 'tipo_afasia',
        label: 'Classificação de afasia (se aplicável)',
        type: 'select',
        options: [
          { value: 'na', label: 'Não aplicável' },
          { value: 'broca', label: "Afasia de Broca" },
          { value: 'wernicke', label: 'Afasia de Wernicke' },
          { value: 'conducao', label: 'Afasia de condução' },
          { value: 'global', label: 'Afasia global' },
          { value: 'transcortical_motora', label: 'Afasia transcortical motora' },
          { value: 'transcortical_sensorial', label: 'Afasia transcortical sensorial' },
          { value: 'anonima', label: 'Afasia anômica' },
        ],
      },
      {
        key: 'observacoes',
        label: 'Observações / Conduta fonoaudiológica',
        type: 'text',
      },
    ],
  },
];

// ── Exercise Templates ────────────────────────────────────────────────────────

const EXERCISES = [
  // ══════════════════════════════════════════════════════════════════════════
  // VOZ
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'Higiene vocal — hidratação',
    area: 'voz',
    subarea: 'higiene_vocal',
    description: 'Hábito fundamental para saúde das pregas vocais.',
    instructions: `1. Beba pelo menos 8 copos de água ao longo do dia (não de uma vez).
2. Prefira água em temperatura ambiente — evite gelada.
3. Umidifique o ambiente quando possível.
4. Evite bebidas com cafeína e álcool, pois desidratam as pregas vocais.
5. Se possível, use um umidificador no quarto durante a noite.`,
    frequency: 'Diariamente',
    repetitions: null,
    duration: null,
    difficulty: 'easy',
    ageGroup: 'all',
    tags: ['voz', 'higiene', 'prevenção'],
  },
  {
    name: 'Sopro sustentado com canudo (TVSO)',
    area: 'voz',
    subarea: 'terapia_voz',
    description: 'Técnica de voz semi-ocluída. Melhora a eficiência fonatória e reduz tensão laríngea.',
    instructions: `1. Pegue um canudo fino (de suco ou coquetel).
2. Coloque o canudo entre os lábios — não segure com os dentes.
3. Inspire normalmente pelo nariz.
4. Ao expirar, produza um som suave ("mmm" ou vogal) pelo canudo.
5. Sinta a vibração dos lábios — isso é sinal de que está correto.
6. Mantenha o som por 5 segundos, relaxado, sem forçar.
7. Descanse 5 segundos e repita.`,
    frequency: '3x ao dia',
    repetitions: '10 repetições de 5s',
    duration: 5,
    difficulty: 'easy',
    ageGroup: 'all',
    tags: ['voz', 'TVSO', 'canudo', 'ressonância'],
  },
  {
    name: 'Vibração de lábios (lip trill)',
    area: 'voz',
    subarea: 'terapia_voz',
    description: 'Voz semi-ocluída com vibração labial. Aquece a voz e equilibra pressão subglótica.',
    instructions: `1. Relaxe completamente o rosto e os lábios.
2. Inspire pelo nariz.
3. Ao expirar, faça os lábios vibrarem como um "brrr" de frio.
4. Mantenha a vibração por 5 a 7 segundos.
5. Pode variar o tom (grave para agudo e voltando) durante a vibração.
6. Se os lábios não vibrarem, apoie suavemente as bochechas com os dedos.`,
    frequency: '2x ao dia',
    repetitions: '8 repetições',
    duration: 5,
    difficulty: 'easy',
    ageGroup: 'all',
    tags: ['voz', 'aquecimento', 'lip trill'],
  },
  {
    name: 'Vibração de língua (tongue trill)',
    area: 'voz',
    subarea: 'terapia_voz',
    description: 'Técnica de voz semi-ocluída com vibração de língua. Indicada para hipertensão laríngea.',
    instructions: `1. Posicione a ponta da língua atrás dos dentes superiores.
2. Inspire pelo nariz.
3. Ao expirar com voz, faça a língua vibrar ("rrrr" vibrante).
4. Mantenha por 5 segundos.
5. Varie o tom ao longo da vibração (glissando).`,
    frequency: '2x ao dia',
    repetitions: '6 repetições',
    duration: 5,
    difficulty: 'medium',
    ageGroup: 'adult',
    tags: ['voz', 'tongue trill', 'ressonância'],
  },
  {
    name: 'Técnica de Masagem Laringo-Digital (Aronson)',
    area: 'voz',
    subarea: 'terapia_voz',
    description: 'Massagem para reduzir hipertensão laríngea e musculatura cervical.',
    instructions: `⚠️ Esta técnica deve ser ensinada pelo fonoaudiólogo na sessão antes de realizar em casa.
1. Sente-se com o pescoço relaxado, levemente inclinado para frente.
2. Coloque os dedos indicadores e médios de ambas as mãos nos espaços entre a laringe e o músculo esternocleidomastoideo.
3. Aplique pressão suave e circular, movendo para baixo.
4. Ao sentir alívio da tensão, emita um som de vogal.
5. Repita o movimento por 3 a 5 minutos.`,
    frequency: '1x ao dia',
    repetitions: '1 sessão de 3-5 min',
    duration: 5,
    difficulty: 'medium',
    ageGroup: 'adult',
    tags: ['voz', 'massagem', 'hipertensão', 'tensão'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DISFAGIA
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'Exercício de Shaker (fortalecimento suprahióideo)',
    area: 'disfagia',
    subarea: 'fortalecimento_deglutição',
    description: 'Fortalece a musculatura suprahióidea para melhorar a abertura do esfíncter esofagiano superior.',
    instructions: `⚠️ Só realize este exercício após orientação direta do fonoaudiólogo.
1. Deite-se de costas em uma superfície plana, sem travesseiro.
2. Levante apenas a cabeça (não os ombros), olhando para os próprios pés.
3. Mantenha por 1 minuto (sustentado) — se não conseguir, faça 30s no início.
4. Descanse 1 minuto.
5. Repita 3 vezes.
6. Em seguida, faça 30 elevações rápidas da cabeça (1 segundo para cima, 1 segundo para baixo).`,
    frequency: '3x ao dia',
    repetitions: '3 séries sustentadas + 30 elevações rápidas',
    duration: 10,
    difficulty: 'hard',
    ageGroup: 'adult',
    tags: ['disfagia', 'shaker', 'suprahióideo', 'deglutição'],
  },
  {
    name: 'Manobra de Mendelsohn',
    area: 'disfagia',
    subarea: 'manobras_deglutição',
    description: 'Manobra compensatória para melhorar a elevação laríngea e abertura do esfíncter esofagiano superior.',
    instructions: `⚠️ Aprender esta manobra na sessão com o fonoaudiólogo antes de praticar sozinho.
1. Coloque seu dedo no pescoço para sentir a laringe (pomo de adão).
2. Inicie a deglutição com saliva (ou a consistência indicada pelo fono).
3. Quando sentir a laringe subir ao máximo, SEGURE essa posição por 3 a 5 segundos.
4. Depois solte e conclua a deglutição.
5. Você deve sentir a garganta "travada" brevemente no ponto mais alto.`,
    frequency: 'Nas refeições (conforme orientação)',
    repetitions: '5-10 deglutições por refeição',
    duration: null,
    difficulty: 'hard',
    ageGroup: 'adult',
    tags: ['disfagia', 'mendelsohn', 'laringe', 'manobra'],
  },
  {
    name: 'Exercícios de mobilidade de língua',
    area: 'disfagia',
    subarea: 'mobilidade_oral',
    description: 'Aumenta o alcance e a força da língua para preparação e propulsão do bolo alimentar.',
    instructions: `1. Com a boca fechada, gire a língua dentro da boca: 5x para a direita, 5x para a esquerda.
2. Toque a ponta da língua no canto direito da boca — 5 segundos. Repita no esquerdo.
3. Empurre a língua contra a bochecha direita (por fora dos dentes) — 5 segundos. Repita no esquerdo.
4. Levante a ponta da língua até tocar o palato logo atrás dos dentes superiores — 5 segundos.
5. Faça o movimento completo de propulsão: língua atrás dos dentes → deslizando até o palato mole.`,
    frequency: '3x ao dia',
    repetitions: '5 repetições cada movimento',
    duration: 5,
    difficulty: 'easy',
    ageGroup: 'all',
    tags: ['disfagia', 'língua', 'mobilidade', 'oral'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FLUÊNCIA
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'Fala prolongada (stretched speech)',
    area: 'fluencia',
    subarea: 'tecnicas_fluencia',
    description: 'Técnica para reduzir a gagueira aumentando a duração das vogais e suavizando inícios.',
    instructions: `1. Escolha uma frase curta para praticar (ex: "Eu gosto de café").
2. Fale cada palavra muito devagar — aproximadamente 2 segundos por sílaba.
3. Alongue especialmente as vogais: "Euuuu gossssto de caffféé".
4. O objetivo não é falar sempre assim — é calibrar o sistema fonatório.
5. Gradualmente aumente a velocidade até chegar à fala natural fluente.
6. Use a técnica quando sentir que vai gaguejar — diminua a velocidade preventivamente.`,
    frequency: '2x ao dia',
    repetitions: '10 frases práticas',
    duration: 10,
    difficulty: 'medium',
    ageGroup: 'all',
    tags: ['gagueira', 'fluência', 'prolongamento', 'velocidade'],
  },
  {
    name: 'Respiração costodiafragmática para fluência',
    area: 'fluencia',
    subarea: 'tecnicas_fluencia',
    description: 'Padrão respiratório adequado reduz tensão laríngea e favorece fluência.',
    instructions: `1. Sente-se confortavelmente com a coluna ereta.
2. Coloque uma mão no peito e outra na barriga (abaixo do umbigo).
3. Inspire pelo nariz — apenas a barriga deve subir (não o peito).
4. Expire lentamente pela boca com os lábios entreabertos — barriga desce.
5. Inspire contando até 4 → segure 2 → expire contando até 6.
6. Após dominar o padrão respiratório, pratique falar ao expirar (não ao inspirar).`,
    frequency: '2x ao dia',
    repetitions: '10 ciclos respiratórios',
    duration: 5,
    difficulty: 'easy',
    ageGroup: 'all',
    tags: ['gagueira', 'fluência', 'respiração', 'diafragma'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LINGUAGEM INFANTIL
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'Estimulação de vocabulário — nomeação',
    area: 'linguagem',
    subarea: 'estimulacao_vocabulario',
    description: 'Atividade domiciliar para estimular vocabulário em crianças com atraso de linguagem.',
    instructions: `Para os pais/responsáveis:
1. Escolha 5 palavras novas por semana (objetos do cotidiano, animais, ações).
2. Mostre o objeto real ou a imagem e nomeie claramente: "Isso é uma MAÇÃ".
3. Repita a palavra várias vezes em contextos diferentes ao longo do dia.
4. Espere a criança tentar dizer a palavra — não corrija o erro imediatamente.
5. Comemore qualquer tentativa aproximada: "Isso mesmo! Maçã!"
6. Use a palavra em frases curtas: "Quero a maçã. A maçã é vermelha."
7. Faça durante atividades naturais: banho, refeição, brincadeira.`,
    frequency: 'Diariamente',
    repetitions: '5-10 min por sessão',
    duration: 10,
    difficulty: 'easy',
    ageGroup: 'child',
    tags: ['linguagem', 'vocabulário', 'estimulação', 'crianças'],
  },
  {
    name: 'Estimulação de intencionalidade comunicativa',
    area: 'linguagem',
    subarea: 'comunicacao_pre_verbal',
    description: 'Exercício para estimular comunicação pré-verbal e intencionalidade em crianças com TEA ou atraso.',
    instructions: `Para os pais/responsáveis:
1. Coloque um objeto desejado fora do alcance da criança (mas visível).
2. Espere — dê tempo para a criança olhar para você e para o objeto.
3. Quando ela olhar para você (atenção conjunta), entregue o objeto imediatamente com entusiasmo.
4. Não dê o objeto sem que ela sinalize de alguma forma (olhar, apontar, vocalizar).
5. Repita com objetos diferentes ao longo do dia.
6. Registre: a criança apontou? Olhou? Vocalizou? Compartilhe na próxima sessão.`,
    frequency: '3-4x ao dia (momentos naturais)',
    repetitions: '5 tentativas por sessão',
    duration: 5,
    difficulty: 'easy',
    ageGroup: 'child',
    tags: ['linguagem', 'TEA', 'intencionalidade', 'atenção conjunta', 'pré-verbal'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MOTRICIDADE OROFACIAL
  // ══════════════════════════════════════════════════════════════════════════
  {
    name: 'Exercícios de musculatura labial',
    area: 'motricidade_orofacial',
    subarea: 'fortalecimento_labial',
    description: 'Fortalecimento dos orbiculares dos lábios para oclusão labial e padrão de deglutição.',
    instructions: `1. Botão labial: coloque um botão grande (ou rolha) entre os lábios (não os dentes). Mantenha por 30 segundos. Repita 5x.
2. Sucção dos lábios: enrole os lábios para dentro dos dentes e sorria devagar. Repita 10x.
3. Beijo: projete os lábios como se fosse dar um beijo. Mantenha 5 segundos. Repita 10x.
4. Vibração labial (brrr): faça os lábios vibrarem sem voz. Repita 5x.
5. Pressão labial: pressione os lábios um contra o outro fortemente. Mantenha 10 segundos. Repita 10x.`,
    frequency: '2x ao dia',
    repetitions: 'Conforme indicado em cada exercício',
    duration: 10,
    difficulty: 'easy',
    ageGroup: 'all',
    tags: ['motricidade', 'lábios', 'fortalecimento', 'deglutição'],
  },
  {
    name: 'Treino de respiração nasal',
    area: 'motricidade_orofacial',
    subarea: 'respiracao',
    description: 'Reeducação do padrão respiratório nasal em respiradores orais.',
    instructions: `1. Sente-se com a coluna ereta e os lábios fechados.
2. Inspire pelo nariz (boca fechada) por 4 segundos.
3. Segure o ar por 2 segundos.
4. Expire pelo nariz por 6 segundos.
5. Repita o ciclo.
⚠️ Se não conseguir respirar pelo nariz, informe ao fonoaudiólogo — pode haver obstrução que precisa de avaliação médica.
6. Pratique também durante atividades (assistindo TV, descansando).`,
    frequency: '3x ao dia',
    repetitions: '10 ciclos por sessão',
    duration: 5,
    difficulty: 'easy',
    ageGroup: 'all',
    tags: ['motricidade', 'respiração', 'nasal', 'respirador oral'],
  },
];

// ── Main seed ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de protocolos clínicos fonoaudiológicos...');

  // ── Protocolos ──────────────────────────────────────────────────────────
  let protocolCount = 0;
  for (const protocol of PROTOCOLS) {
    await (prisma as any).clinicalProtocolTemplate.upsert({
      where: { id: `00000000-0000-0000-0000-${String(protocolCount + 1).padStart(12, '0')}` } as any,
      create: {
        id: `00000000-0000-0000-0000-${String(protocolCount + 1).padStart(12, '0')}`,
        name: protocol.name,
        area: protocol.area,
        description: protocol.description,
        version: protocol.version,
        fields: protocol.fields,
        isSystem: true,
      } as any,
      update: {
        name: protocol.name,
        description: protocol.description,
        fields: protocol.fields,
        version: protocol.version,
      } as any,
    });
    protocolCount++;
    console.log(`  ✅ Protocolo: ${protocol.name}`);
  }

  // ── Exercícios ──────────────────────────────────────────────────────────
  let exerciseCount = 0;
  for (const exercise of EXERCISES) {
    await (prisma as any).exerciseTemplate.upsert({
      where: { id: `11111111-0000-0000-0000-${String(exerciseCount + 1).padStart(12, '0')}` } as any,
      create: {
        id: `11111111-0000-0000-0000-${String(exerciseCount + 1).padStart(12, '0')}`,
        name: exercise.name,
        area: exercise.area,
        subarea: exercise.subarea,
        description: exercise.description,
        instructions: exercise.instructions,
        frequency: exercise.frequency,
        repetitions: exercise.repetitions ?? null,
        duration: exercise.duration ?? null,
        difficulty: exercise.difficulty,
        ageGroup: exercise.ageGroup,
        tags: exercise.tags,
        isSystem: true,
        clinicId: null,
      } as any,
      update: {
        name: exercise.name,
        description: exercise.description,
        instructions: exercise.instructions,
        frequency: exercise.frequency,
        repetitions: exercise.repetitions ?? null,
        duration: exercise.duration ?? null,
        tags: exercise.tags,
      } as any,
    });
    exerciseCount++;
    console.log(`  💪 Exercício: ${exercise.name}`);
  }

  console.log(`\n✅ Seed concluído!`);
  console.log(`   ${protocolCount} protocolos clínicos criados`);
  console.log(`   ${exerciseCount} exercícios terapêuticos criados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
