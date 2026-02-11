import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  sources: SearchResult[];
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private readonly hfApiKey: string;

  constructor(private config: ConfigService) {
    this.hfApiKey = this.config.get<string>('HUGGINGFACE_API_KEY', '');
  }

  async chat(
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<ChatResponse> {
    // 1. Search for relevant sources
    const sources = await this.searchWeb(question);

    // 2. Build context from sources
    const sourceContext = sources
      .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\nFonte: ${s.url}`)
      .join('\n\n');

    // 3. Generate answer using HuggingFace
    const answer = await this.generateAnswer(question, sourceContext, history);

    return { answer, sources };
  }

  private async searchWeb(query: string): Promise<SearchResult[]> {
    try {
      // Use DuckDuckGo instant answer API (no key needed)
      const searchQuery = encodeURIComponent(
        `${query} fonoaudiologia artigo científico site:pubmed.ncbi.nlm.nih.gov OR site:scielo.br OR site:scholar.google.com`,
      );
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${searchQuery}&format=json&no_html=1&skip_disambig=1`,
        { signal: AbortSignal.timeout(5000) },
      );
      const data = await res.json();

      const results: SearchResult[] = [];

      // Abstract
      if (data.Abstract) {
        results.push({
          title: data.Heading || 'Resultado',
          url: data.AbstractURL || '',
          snippet: data.Abstract,
        });
      }

      // Related topics
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 4)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.slice(0, 80),
              url: topic.FirstURL,
              snippet: topic.Text,
            });
          }
        }
      }

      // If no results from DDG, use curated knowledge base
      if (results.length === 0) {
        return this.getFallbackSources(query);
      }

      return results.slice(0, 5);
    } catch (error) {
      this.logger.warn('Web search failed, using fallback sources', error);
      return this.getFallbackSources(query);
    }
  }

  private getFallbackSources(query: string): SearchResult[] {
    const q = query.toLowerCase();
    const sources: SearchResult[] = [];

    if (q.includes('disfagia') || q.includes('deglut')) {
      sources.push({
        title: 'Disfagia Orofaríngea - Diretrizes CFFa',
        url: 'https://www.fonoaudiologia.org.br',
        snippet:
          'A disfagia orofaríngea requer avaliação clínica e instrumental. O manejo inclui adaptação de consistências alimentares, manobras de proteção de vias aéreas e exercícios miofuncionais.',
      });
    }
    if (q.includes('linguagem') || q.includes('atraso') || q.includes('fala')) {
      sources.push({
        title: 'Desenvolvimento da Linguagem Infantil - SBFa',
        url: 'https://www.sbfa.org.br',
        snippet:
          'O desenvolvimento típico da linguagem segue marcos previsíveis. Atrasos devem ser investigados precocemente. A intervenção fonoaudiológica precoce apresenta melhores prognósticos.',
      });
    }
    if (q.includes('voz') || q.includes('disfonia') || q.includes('rouquidão')) {
      sources.push({
        title: 'Distúrbios da Voz - Consenso Nacional',
        url: 'https://www.scielo.br',
        snippet:
          'Disfonias funcionais e orgânicas requerem avaliação perceptivo-auditiva e acústica. O tratamento fonoaudiológico inclui higiene vocal, técnicas de ressonância e exercícios de função vocal.',
      });
    }
    if (q.includes('audiologia') || q.includes('audição') || q.includes('perda auditiva')) {
      sources.push({
        title: 'Audiologia Clínica - Diretrizes',
        url: 'https://www.audiologiabrasil.org.br',
        snippet:
          'A avaliação audiológica completa inclui audiometria tonal, vocal e imitanciometria. A reabilitação auditiva pode envolver próteses auditivas e terapia auditiva.',
      });
    }
    if (q.includes('motricidade') || q.includes('orofacial') || q.includes('respiração')) {
      sources.push({
        title: 'Motricidade Orofacial - Abordagens Terapêuticas',
        url: 'https://www.sbfa.org.br',
        snippet:
          'A terapia miofuncional orofacial aborda alterações de respiração, mastigação, deglutição e fala. Exercícios isotônicos e isométricos são fundamentais no tratamento.',
      });
    }

    // Always add a general source
    sources.push({
      title: 'Conselho Federal de Fonoaudiologia',
      url: 'https://www.fonoaudiologia.org.br',
      snippet:
        'O CFFa disponibiliza diretrizes, protocolos e materiais de referência para a prática fonoaudiológica baseada em evidências.',
    });

    return sources.slice(0, 3);
  }

  private async generateAnswer(
    question: string,
    sourceContext: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    const systemPrompt = `Você é a Evolua IA, assistente inteligente especializada em fonoaudiologia. Você ajuda profissionais de fonoaudiologia com dúvidas clínicas, protocolos, técnicas terapêuticas e evidências científicas.

Regras:
- Responda SEMPRE em português brasileiro
- Seja precisa, objetiva e baseada em evidências
- Cite as fontes quando disponíveis usando [1], [2], etc.
- Se não tiver certeza, diga que recomenda consultar a literatura específica
- Formate a resposta de forma clara com parágrafos curtos
- Não invente informações - use apenas o contexto fornecido e seu conhecimento
- Seja empática e profissional`;

    const contextMessage = sourceContext
      ? `\n\nFontes encontradas:\n${sourceContext}`
      : '';

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: `${question}${contextMessage}` },
    ];

    try {
      // Try HuggingFace Inference API
      if (this.hfApiKey) {
        const res = await fetch(
          'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.hfApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: this.formatPromptForMixtral(messages),
              parameters: {
                max_new_tokens: 1024,
                temperature: 0.3,
                return_full_text: false,
              },
            }),
            signal: AbortSignal.timeout(30000),
          },
        );

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data[0]?.generated_text) {
            return this.cleanResponse(data[0].generated_text);
          }
        }
      }

      // Fallback: generate a helpful response from sources
      return this.generateFallbackAnswer(question, sourceContext);
    } catch (error) {
      this.logger.warn('AI generation failed, using fallback', error);
      return this.generateFallbackAnswer(question, sourceContext);
    }
  }

  private formatPromptForMixtral(
    messages: { role: string; content: string }[],
  ): string {
    let prompt = '<s>';
    for (const msg of messages) {
      if (msg.role === 'system' || msg.role === 'user') {
        prompt += `[INST] ${msg.content} [/INST]`;
      } else {
        prompt += ` ${msg.content}</s><s>`;
      }
    }
    return prompt;
  }

  private cleanResponse(text: string): string {
    return text
      .replace(/<\/?s>/g, '')
      .replace(/\[INST\].*?\[\/INST\]/gs, '')
      .trim();
  }

  private generateFallbackAnswer(
    question: string,
    sourceContext: string,
  ): string {
    if (sourceContext) {
      return `Com base nas fontes disponíveis sobre sua pergunta:\n\n${sourceContext
        .split('\n\n')
        .map((s) => {
          const lines = s.split('\n');
          return `• ${lines[1] || lines[0]}`;
        })
        .join('\n\n')}\n\nRecomendo consultar as fontes citadas para informações mais detalhadas. Caso precise de orientações específicas sobre protocolos clínicos, posso ajudar a direcionar sua pesquisa.`;
    }

    return `Essa é uma ótima pergunta sobre "${question}". Recomendo consultar as seguintes fontes para uma resposta baseada em evidências:\n\n• PubMed (pubmed.ncbi.nlm.nih.gov) - para artigos científicos\n• SciELO (scielo.br) - para publicações em português\n• CFFa (fonoaudiologia.org.br) - para diretrizes profissionais\n• SBFa (sbfa.org.br) - para materiais da sociedade brasileira\n\nPosso ajudar a refinar sua busca se me der mais detalhes sobre o caso clínico.`;
  }
}
