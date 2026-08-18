# Documentação da API de Templates do WhatsApp

Esta documentação descreve como utilizar a API para gerir e usar os templates de mensagens do WhatsApp.

## Fluxo de Trabalho Recomendado

1.  **Listar os Templates Disponíveis**: O frontend deve primeiro fazer uma chamada `GET` para `/api/whatsapp/templates` para obter a lista de todos os templates.
2.  **Selecionar um Template e um Orçamento**: O utilizador, na interface, seleciona o template que deseja usar e o orçamento (ou outro dado relevante) ao qual o template se aplica.
3.  **Renderizar a Mensagem**: Com o ID do template e o ID do orçamento, o frontend faz uma chamada `GET` para `/api/whatsapp/templates/render/:templateId/:orcamentoId`.
4.  **Construir o Link do WhatsApp**: A API responderá com a mensagem final e o número de telefone do cliente. O frontend deve então construir o link da seguinte forma: `https://wa.me/{numeroDoCliente}?text={mensagemRenderizada}`.
5.  **Redirecionar o Utilizador**: Ao clicar no botão, o utilizador é redirecionado para o WhatsApp com a mensagem pronta a ser enviada.

---

## Endpoints da API

### 1. Listar Todos os Templates

-   **Endpoint**: `GET /api/whatsapp/templates`
-   **Acesso**: Todos os planos ('Essencial', 'Profissional', 'Premium', 'Admin')
-   **Descrição**: Retorna uma lista com todos os templates de mensagem disponíveis.
-   **Resposta de Sucesso (200 OK)**:
    ```json
    [
        {
            "_id": "60d...1",
            "titulo": "Confirmação de Orçamento",
            "mensagem": "Olá {{cliente.nome}}, o seu orçamento de R$ {{orcamento.valorProposto}} para o serviço '{{orcamento.descricao}}' foi confirmado.",
            "categoria": "Orçamento"
        },
        {
            "_id": "60d...2",
            "titulo": "Lembrete de Agendamento",
            "mensagem": "Olá {{cliente.nome}}, passando para lembrar do seu agendamento para '{{orcamento.descricao}}' no dia {{orcamento.dataAgendamento}}.",
            "categoria": "Agendamento"
        }
    ]
    ```

### 2. Renderizar um Template Específico

-   **Endpoint**: `GET /api/whatsapp/templates/render/:templateId/:orcamentoId`
-   **Acesso**: Todos os planos.
-   **Descrição**: Pega num template e num orçamento, substitui os placeholders pelos dados reais e retorna a mensagem pronta e o número de telefone do cliente associado ao orçamento.
-   **Parâmetros de URL**:
    -   `templateId`: O ID do template a ser usado.
    -   `orcamentoId`: O ID do orçamento que contém os dados.
-   **Resposta de Sucesso (200 OK)**:
    ```json
    {
        "numeroDoCliente": "5511999998888",
        "mensagemFinal": "Olá João Silva, o seu orçamento de R$ 1250.50 para o serviço 'Reparação de ar condicionado' foi confirmado."
    }
    ```
-   **Resposta de Erro (404 Not Found)**:
    -   Se o template ou o orçamento não forem encontrados.

### 3. Criar, Atualizar e Deletar Templates (Apenas Admin)

Estas rotas são protegidas e só podem ser acedidas por utilizadores com o plano 'Admin'.

-   **Criar Template**: `POST /api/whatsapp/templates`
    -   **Corpo da Requisição**:
        ```json
        {
            "titulo": "Novo Template",
            "mensagem": "Mensagem com placeholders {{cliente.nome}}.",
            "categoria": "Outros"
        }
        ```
-   **Atualizar Template**: `PUT /api/whatsapp/templates/:id`
    -   **Corpo da Requisição**:
        ```json
        {
            "titulo": "Template Atualizado",
            "mensagem": "Nova mensagem com placeholders {{cliente.nome}}."
        }
        ```
-   **Deletar Template**: `DELETE /api/whatsapp/templates/:id`

---

## Placeholders Disponíveis

Os seguintes placeholders podem ser usados dentro da `mensagem` de um template. Eles serão substituídos pelos dados correspondentes do orçamento quando a rota de renderização for chamada.

-   `{{cliente.nome}}`: Nome do cliente.
-   `{{cliente.telefone}}`: Telefone do cliente.
-   `{{orcamento.descricao}}`: Descrição do serviço/orçamento.
-   `{{orcamento.valorProposto}}`: O valor final proposto no orçamento.
-   `{{orcamento.dataAgendamento}}`: A data agendada para o serviço (se aplicável).
-   `{{orcamento.shortId}}`: O ID curto do orçamento.
