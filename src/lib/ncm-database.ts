// lib/ncm-database.ts
import ncmData from './ncm.json';

export interface NCM {
  codigo: string;
  descricao: string;
  nivel: number; // 2, 4, 6, 8 dígitos
  palavrasChave: string[];
}

class NCMDatabase {
  private data: NCM[];
  private index: Map<string, NCM>;

  constructor() {
    // Processar os dados do seu JSON
    this.data = ncmData.Nomenclaturas.map(item => {
      const codigoLimpo = item.Codigo.replace(/\./g, '').padEnd(8, '0');
      const nivel = codigoLimpo.length;
      
      return {
        codigo: codigoLimpo,
        descricao: item.Descricao,
        nivel,
        palavrasChave: this.extrairPalavrasChave(item.Descricao)
      };
    });

    this.index = new Map();
    this.data.forEach(ncm => this.index.set(ncm.codigo, ncm));
  }

  private extrairPalavrasChave(descricao: string): string[] {
    // Remove caracteres especiais e palavras comuns
    const palavras = descricao
      .toLowerCase()
      .replace(/[.,;:–—\-]/g, ' ')
      .split(/\s+/)
      .filter(palavra => 
        palavra.length > 2 && 
        !['de', 'da', 'do', 'das', 'dos', 'em', 'por', 'para', 'com'].includes(palavra)
      );
    
    return [...new Set(palavras)]; // Remove duplicatas
  }

  // Busca exata por código
  buscarPorCodigo(codigo: string): NCM | undefined {
    const codigoLimpo = codigo.replace(/\D/g, '').padStart(8, '0');
    return this.index.get(codigoLimpo);
  }

  // Busca por similaridade de descrição
  buscarPorSimilaridade(descricao: string, limit: number = 5): NCM[] {
    const descricaoLower = descricao.toLowerCase();
    const palavrasUsuario = this.extrairPalavrasChave(descricaoLower);
    
    return this.data
      .map(ncm => {
        const pontuacao = this.calcularSimilaridade(palavrasUsuario, ncm.palavrasChave);
        return { ncm, pontuacao };
      })
      .filter(item => item.pontuacao > 0.3) // Mínimo 30% de similaridade
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, limit)
      .map(item => item.ncm);
  }

  private calcularSimilaridade(palavrasUsuario: string[], palavrasNCM: string[]): number {
    const palavrasComuns = palavrasUsuario.filter(palavra =>
      palavrasNCM.some(palavraNCM => this.saoSimilares(palavra, palavraNCM))
    );
    
    return palavrasComuns.length / Math.max(palavrasUsuario.length, 1);
  }

  private saoSimilares(palavra1: string, palavra2: string): boolean {
    // Verifica se são exatamente iguais ou uma contém a outra
    if (palavra1 === palavra2) return true;
    if (palavra1.includes(palavra2) || palavra2.includes(palavra1)) return true;
    
    // Verifica similaridade por stem (raiz das palavras)
    const stem1 = this.getStem(palavra1);
    const stem2 = this.getStem(palavra2);
    
    return stem1 === stem2;
  }

  private getStem(palavra: string): string {
    // Algoritmo simples de stemming para português
    return palavra
      .replace(/(ões|ãos|ães)$/, 'ão')
      .replace(/(as|os)$/, '')
      .replace(/(mente)$/, '')
      .replace(/(mente)$/, '');
  }
}

export const ncmDatabase = new NCMDatabase();