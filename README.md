# Gestão de Relacionamento — Deuba Assunção

CRM institucional estratégico da **Gerência de Relações Institucionais do Araújo Jorge — Hospital de Câncer**.

> *"Captação não é pedido. É construção de rede."*
> *"Relacionamento é patrimônio institucional."*

---

## Como abrir

Não precisa instalar nada. **Abra o arquivo `index.html`** com duplo clique no navegador (Chrome, Edge, Firefox).

- Usuário/senha já vêm preenchidos na tela de login (demonstração).
- Os dados ficam salvos no próprio navegador (localStorage).
- Para voltar aos dados de exemplo: menu lateral → **Restaurar dados demo**.

> Dica: para usar no celular, hospede a pasta em qualquer servidor de arquivos
> (ou abra via um servidor local) e adicione à tela inicial — funciona como um app.

---

## Módulos

| Módulo | Descrição |
|--------|-----------|
| **1. Base & Design System** | Identidade institucional (verde, branco, cinza, dourado), navegação, login, persistência. |
| **2. Dashboard Executivo** | KPIs, agenda da semana, demandas prioritárias, follow-ups, aniversários, captação. |
| **3. Relacionamentos** | 17 públicos de interesse, fichas completas, linha do tempo, histórico de interações, WhatsApp/e-mail. |
| **4. Demandas (Kanban)** | 6 colunas estilo Trello, drag & drop, comentários, anexos, geração automática de textos. |
| **5. Projetos Estratégicos** | Leilão do Bem, Risoto Solidário, Radioterapia. Cronograma, parceiros, captação, prestação de contas. |
| **6. Inteligência + IA** | Alertas, oportunidades e sugestões automáticas; assistente que gera atas, e-mails, mensagens e relatórios. |
| **7. Mobile & Refinamento** | Experiência de assistente executivo de bolso, responsiva. |

---

## Estrutura de arquivos

```
crm-deuba/
├── index.html
├── css/styles.css
└── js/
    ├── store.js        (estado + localStorage)
    ├── seed.js         (dados de demonstração)
    ├── ui.js           (modal, toast, helpers)
    ├── app.js          (navegação, login, roteamento)
    └── modules/
        ├── dashboard.js
        ├── relacionamentos.js
        ├── demandas.js
        ├── projetos.js
        ├── inteligencia.js
        └── ia.js
```

Tecnologia: HTML + CSS + JavaScript puro (sem dependências, sem build, 100% offline).
