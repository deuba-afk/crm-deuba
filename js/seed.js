/* =====================================================================
   SEED — Estado inicial do sistema
   Sistema LIMPO, pronto para receber informações reais.
   (Os dados fictícios de demonstração foram removidos.)
   ===================================================================== */
function SEED(){
  return {
    contatos:   [],   // relacionamentos / públicos de interesse
    demandas:   [],   // quadro Kanban
    projetos:   [],   // projetos estratégicos
    interacoes: [],   // histórico de relacionamento
    eventos:    [],   // agenda
    usuario: { nome:'Deuba Assunção' }
  };
}
