// lib/claude-api.ts
export async function callClaudeApi(prompt: string, model: string = "claude-3-sonnet-20240229") {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("Anthropic API key não configurada");
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      } as Record<string, string>,
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API Claude:", response.status, errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error("Erro ao chamar API Claude:", error);
    throw error;
  }
}

// Versão alternativa se precisar de mais controle
export async function callClaudeApiWithRetry(
  prompt: string, 
  model: string = "claude-3-sonnet-20240229",
  maxRetries: number = 3
) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callClaudeApi(prompt, model);
    } catch (error) {
      lastError = error;
      console.warn(`Tentativa ${attempt} falhou, tentando novamente...`);
      
      // Espera exponencial antes de tentar novamente
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}