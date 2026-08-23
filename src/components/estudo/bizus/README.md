# Área de Bizus

Frontend isolado para criação de bizus como mapas mentais em um quadro amplo. O
componente de entrada é `BizusTab`, que recebe `concursoId`, `materias` e
`topicos`. O editor permite criar, arrastar, redimensionar, conectar, formatar e
excluir cartões, além de anexar ou gerar uma imagem mnemônica.

O avatar é o único personagem fixo do quadro e usa um dos PNGs transparentes:

- `/bizus/avatar/apontando.png`
- `/bizus/avatar/explicando.png`
- `/bizus/avatar/espantado.png`
- `/bizus/avatar/comemorando.png`
- `/bizus/avatar/pensando.png`
- `/bizus/avatar/alerta.png`

## Documento whiteboard

`conteudoEstruturado.documento` guarda um documento `version: 2` com dimensões,
fundo, grade, configuração do avatar, `nodes` e `connections`. Cada nó possui
posição e tamanho absolutos, tipo `text` ou `image` e estilo próprio. Conexões
referenciam IDs de nós existentes. A interface respeita os limites do backend de
500 nós e 1.500 conexões e corrige IDs duplicados ao importar documentos.

Bizus antigos são convertidos na leitura: título, chamada, blocos e imagem são
distribuídos como cartões no quadro inicial. O HTML dos cartões passa por uma
whitelist de tags e propriedades antes de ser renderizado ou persistido.

Para evitar repetir uma data URL grande dentro do JSON, o primeiro nó de imagem
é persistido com `imageUrl: "__BIZU_MEDIA__"`; a mídia real continua no campo
raiz `imagemUrl`. Na leitura, o token é hidratado novamente.

## Contratos consumidos

- `GET /api/estudo/bizus?concursoId=...` retorna `Bizu[]`.
- `POST /api/estudo/bizus` cria e retorna um `Bizu`.
- `PATCH /api/estudo/bizus/:id` atualiza e retorna um `Bizu`.
- `DELETE /api/estudo/bizus/:id` retorna `{ ok: true }`.
- `POST /api/ai/bizu-imagem` recebe
  `{ materia, topico?, titulo, descricao, prompt, pose, avatarReference, formato }`
  e retorna `{ imagemDataUrl, mimeType, formato, tamanho }`.

O prompt livre aceita até 1.500 caracteres. A imagem anexada ou gerada é
inserida ou atualizada como nó no canvas e também abastece o campo raiz de mídia.
A geração usa o PNG da pose escolhida como referência de identidade, mantém o
avatar como único personagem da cena e limita cada usuário a cinco pedidos em
uma janela de dez minutos por instância da aplicação.

## Exportação

O PNG é criado no navegador com `html-to-image`, em 1600 × 1000 px por padrão.
A captura usa somente o elemento do quadro, incluindo avatar, cartões e conexões.
Toolbar, inspetor, seleção, alças de arraste/redimensionamento e dica do modo de
conexão são removidos durante a exportação.
