import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Product {
  code: string;
  desc: string;
}

interface Mapping {
  fromCode: string;
  fromDesc: string;
  toCode: string;
}

interface AISuggestion {
  fromCode: string;
  fromDesc: string;
  suggestedToCode: string;
  suggestedToDesc: string;
  confidence: number;
  reason: string;
}

interface MatchResult {
  product: Product;
  score: number;
  reason: string;
}

// Função para limpar texto (remover acentos, caracteres especiais)
function cleanText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Função para extrair código base de strings complexas
function extractBaseCode(code: string): string | null {
  if (!code) return null;
  
  let cleaned = code.replace(/^GET/i, '');
  cleaned = cleaned.split(/[_-]/)[0];
  
  const numbers = cleaned.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    let baseCode = numbers[0].replace(/^0+/, '');
    if (baseCode && baseCode.length > 0) {
      return baseCode;
    }
  }
  
  return null;
}

// Função para verificar se um código é um código base (limpo)
function isBaseCode(code: string): boolean {
  return /^\d+$/.test(code) && !code.toLowerCase().includes('get') && code.length < 15;
}

// Função para calcular similaridade entre textos
function calculateSimilarity(text1: string, text2: string): number {
  const clean1 = cleanText(text1);
  const clean2 = cleanText(text2);
  
  if (clean1 === clean2) return 1.0;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.9;
  
  const words1 = new Set(clean1.split(/\s+/));
  const words2 = new Set(clean2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Função para encontrar melhor match por extração de código base
function findMatchByExtraction(product: Product, baseCodesMap: Map<string, Product>): MatchResult | null {
  const extractedBaseCode = extractBaseCode(product.code);
  if (extractedBaseCode && baseCodesMap.has(extractedBaseCode)) {
    const targetProduct = baseCodesMap.get(extractedBaseCode)!;
    if (targetProduct.code !== product.code) {
      return {
        product: targetProduct,
        score: 0.95,
        reason: `Código contém o número base "${extractedBaseCode}" após remover prefixos e sufixos.`
      };
    }
  }
  return null;
}

// Função para encontrar melhor match por similaridade de descrição
function findMatchByDescription(product: Product, products: Product[], mappedCodes: Set<string>): MatchResult | null {
  if (!product.desc) return null;
  
  let bestMatch: MatchResult | null = null;
  
  for (const targetProduct of products) {
    if (targetProduct.code === product.code) continue;
    if (mappedCodes.has(targetProduct.code)) continue;
    if (!targetProduct.desc) continue;
    
    const descSimilarity = calculateSimilarity(product.desc, targetProduct.desc);
    
    if (descSimilarity > 0.7) {
      let score = descSimilarity;
      let reason = `Similaridade de ${Math.round(descSimilarity * 100)}% entre as descrições dos produtos.`;
      
      const codeSimilarity = calculateSimilarity(product.code, targetProduct.code);
      if (codeSimilarity > 0.5) {
        score = Math.min(0.98, score + 0.1);
        reason += ` Os códigos também são similares.`;
      }
      
      if (bestMatch === null || score > bestMatch.score) {
        bestMatch = {
          product: targetProduct,
          score: score,
          reason: reason
        };
      }
    }
  }
  
  return bestMatch;
}

// Função para encontrar melhor match por números no código
function findMatchByNumbers(product: Product, baseCodesMap: Map<string, Product>): MatchResult | null {
  const numbersInCode = product.code.match(/\d+/g);
  if (!numbersInCode) return null;
  
  for (const num of numbersInCode) {
    const cleanNum = num.replace(/^0+/, '');
    if (cleanNum.length > 2 && baseCodesMap.has(cleanNum)) {
      const targetProduct = baseCodesMap.get(cleanNum)!;
      if (targetProduct.code !== product.code) {
        return {
          product: targetProduct,
          score: 0.85,
          reason: `O código contém o número "${cleanNum}" que corresponde a um produto cadastrado.`
        };
      }
    }
  }
  
  return null;
}

// Função principal de análise combinada (código + descrição)
function analyzePatterns(products: Product[], currentMappings: Mapping[]): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const mappedCodes = new Set(currentMappings.map(m => m.fromCode));
  
  // Cria um mapa de códigos base (limpos)
  const baseCodesMap = new Map<string, Product>();
  for (const product of products) {
    if (isBaseCode(product.code)) {
      baseCodesMap.set(product.code, product);
    }
  }
  
  // Analisa cada produto não mapeado
  for (const product of products) {
    if (mappedCodes.has(product.code)) continue;
    
    // Tenta encontrar match por diferentes estratégias em ordem de prioridade
    let bestMatch: MatchResult | null = null;
    
    // Estratégia 1: Extração de código base
    bestMatch = findMatchByExtraction(product, baseCodesMap);
    
    // Estratégia 2: Similaridade de descrição
    if (bestMatch === null) {
      bestMatch = findMatchByDescription(product, products, mappedCodes);
    }
    
    // Estratégia 3: Números no código
    if (bestMatch === null) {
      bestMatch = findMatchByNumbers(product, baseCodesMap);
    }
    
    if (bestMatch !== null && bestMatch.score >= 0.75) {
      suggestions.push({
        fromCode: product.code,
        fromDesc: product.desc || "Sem descrição",
        suggestedToCode: bestMatch.product.code,
        suggestedToDesc: bestMatch.product.desc || "Sem descrição",
        confidence: bestMatch.score,
        reason: bestMatch.reason
      });
    }
  }
  
  // Remove duplicatas (mesmo código de origem)
  const uniqueSuggestions = new Map<string, AISuggestion>();
  for (const suggestion of suggestions) {
    const existing = uniqueSuggestions.get(suggestion.fromCode);
    if (!existing || suggestion.confidence > existing.confidence) {
      uniqueSuggestions.set(suggestion.fromCode, suggestion);
    }
  }
  
  return Array.from(uniqueSuggestions.values());
}

export async function POST(request: NextRequest) {
  try {
    const { products, customRules, currentMappings } = await request.json();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto fornecido" },
        { status: 400 }
      );
    }

    const localSuggestions = analyzePatterns(products, currentMappings);
    
    console.log(`Análise local encontrou ${localSuggestions.length} sugestões`);
    
    if (localSuggestions.length > 0) {
      return NextResponse.json({ 
        suggestions: localSuggestions,
        usingFallback: false,
        message: `${localSuggestions.length} padrões identificados`
      });
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const unmappedProducts = products.filter((p: Product) => !currentMappings.some((m: Mapping) => m.fromCode === p.code));
        
        const prompt = `
Analise estes produtos e identifique quais devem ser mapeados para o mesmo código base.

Considere TANTO o código QUANTO a descrição para identificar produtos iguais.

Produtos:
${unmappedProducts.slice(0, 30).map((p: Product) => `Código: ${p.code} | Descrição: ${p.desc || "Sem descrição"}`).join('\n')}

Regras:
1. Códigos com GET + números + sufixo devem ser mapeados para apenas os números
2. Produtos com descrições iguais ou muito similares devem ter o mesmo código
3. Remova zeros à esquerda dos códigos
4. Priorize códigos numéricos curtos como base

Retorne JSON: {"suggestions":[{"fromCode":"codigo_original","fromDesc":"desc_original","suggestedToCode":"codigo_base","confidence":0.95,"reason":"motivo"}]}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        });

        const result = JSON.parse(completion.choices[0].message.content || '{"suggestions":[]}');
        
        return NextResponse.json({ 
          suggestions: result.suggestions || [],
          usingFallback: false
        });
      } catch (error) {
        console.error("Erro na IA:", error);
      }
    }

    return NextResponse.json({ 
      suggestions: [],
      usingFallback: true,
      message: "Nenhum padrão identificado"
    });
    
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}