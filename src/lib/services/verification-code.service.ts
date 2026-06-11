// lib/services/verification-code.service.ts
import { redisGet, redisSet, redisDel } from "@/lib/redis";

export interface VerificationCodeData {
  code: string;
  telefone: string;
  email: string;
  createdAt: number;
  attempts: number;
}

type CodeSource = "redis" | "memory" | "none";

interface MemoryCodeEntry {
  data: VerificationCodeData;
  expiresAt: number;
}

export class VerificationCodeService {
  private static readonly PREFIX = "verification:";
  private static readonly TTL = 600; // 10 minutes in seconds
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly memoryStore = new Map<string, MemoryCodeEntry>();

  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private static setMemoryEntry(key: string, data: VerificationCodeData): void {
    this.memoryStore.set(key, {
      data,
      expiresAt: Date.now() + this.TTL * 1000,
    });
  }

  private static getMemoryEntry(key: string): MemoryCodeEntry | null {
    const entry = this.memoryStore.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry;
  }

  private static async readCodeData(
    key: string,
  ): Promise<{ data: VerificationCodeData | null; source: CodeSource }> {
    const redisData = await redisGet(key);
    if (redisData) {
      return { data: redisData as VerificationCodeData, source: "redis" };
    }

    const memoryEntry = this.getMemoryEntry(key);
    if (memoryEntry) {
      return { data: memoryEntry.data, source: "memory" };
    }

    return { data: null, source: "none" };
  }

  static async createVerificationCode(telefone: string, email: string): Promise<string> {
    const key = `${this.PREFIX}${telefone}`;
    const code = this.generateCode();

    const data: VerificationCodeData = {
      code,
      telefone,
      email,
      createdAt: Date.now(),
      attempts: 0,
    };

    try {
      await redisSet(key, data, this.TTL);
      const persisted = await redisGet(key);

      if (persisted) {
        console.log(`Code created in Redis for ${telefone}: ${code}`);
        return code;
      }
    } catch (error) {
      console.error(`Redis unavailable while creating code for ${telefone}:`, error);
    }

    // Fallback to memory when Redis is unavailable
    this.setMemoryEntry(key, data);
    console.warn(`Code created in memory fallback for ${telefone}: ${code}`);
    return code;
  }

  static async verifyCode(
    telefone: string,
    codeToVerify: string,
  ): Promise<{
    valid: boolean;
    message: string;
    attemptsLeft?: number;
  }> {
    const key = `${this.PREFIX}${telefone}`;

    try {
      const { data, source } = await this.readCodeData(key);

      if (!data) {
        return {
          valid: false,
          message: "Codigo expirado ou nao encontrado. Solicite um novo codigo.",
        };
      }

      if (Date.now() - data.createdAt > this.TTL * 1000) {
        await this.deleteCode(telefone);
        return {
          valid: false,
          message: "Codigo expirado. Solicite um novo codigo.",
        };
      }

      if (data.attempts >= this.MAX_ATTEMPTS) {
        await this.deleteCode(telefone);
        return {
          valid: false,
          message: "Numero maximo de tentativas excedido. Solicite um novo codigo.",
        };
      }

      if (data.code === codeToVerify) {
        await this.deleteCode(telefone);
        console.log(`Code verified successfully for ${telefone}`);
        return {
          valid: true,
          message: "Codigo verificado com sucesso!",
        };
      }

      data.attempts++;

      if (source === "redis") {
        await redisSet(key, data, this.TTL);

        // If Redis write fails silently, keep fallback copy in memory
        const persisted = await redisGet(key);
        if (!persisted) {
          this.setMemoryEntry(key, data);
        }
      } else {
        this.setMemoryEntry(key, data);
      }

      const attemptsLeft = this.MAX_ATTEMPTS - data.attempts;

      console.log(`Invalid code for ${telefone}. Attempts left: ${attemptsLeft}`);

      return {
        valid: false,
        message: `Codigo incorreto. Voce tem ${attemptsLeft} tentativa(s) restante(s).`,
        attemptsLeft,
      };
    } catch (error) {
      console.error(`Error while verifying code for ${telefone}:`, error);
      return {
        valid: false,
        message: "Erro ao verificar codigo. Tente novamente.",
      };
    }
  }

  static async deleteCode(telefone: string): Promise<void> {
    const key = `${this.PREFIX}${telefone}`;
    await redisDel(key);
    this.memoryStore.delete(key);
    console.log(`Code removed for ${telefone}`);
  }

  static async hasActiveCode(telefone: string): Promise<boolean> {
    const key = `${this.PREFIX}${telefone}`;
    const { data } = await this.readCodeData(key);
    return !!data;
  }

  static async getTimeLeft(telefone: string): Promise<number | null> {
    const key = `${this.PREFIX}${telefone}`;
    const { data } = await this.readCodeData(key);

    if (!data) return null;

    const elapsed = Date.now() - data.createdAt;
    const timeLeft = this.TTL * 1000 - elapsed;

    return timeLeft > 0 ? Math.ceil(timeLeft / 1000) : 0;
  }
}
