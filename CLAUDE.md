# Projeto de App — ErgoGRO

## Objetivo do projeto

Desenvolver um aplicativo técnico para Avaliação Ergonômica Preliminar — AEP, conforme NR 17, integrado à gestão de riscos ocupacionais do GRO/PGR.

O app deve permitir:
- avaliação ergonômica em campo
- registro fotográfico
- classificação de risco
- aplicação do COPSOQ reduzido
- avaliação psicossocial
- plano de ação
- geração de relatório técnico

---

## Padrões de desenvolvimento

- Código comentado em português do Brasil
- Priorize simplicidade. Se funciona sem framework, não use framework
- Mobile-first
- Dark mode por padrão
- HTML/CSS/JS vanilla no MVP
- Interface limpa, técnica e profissional
- Componentes reutilizáveis
- Dados salvos inicialmente em LocalStorage
- Estruturar o código para futura migração para backend

---

## Comportamento esperado

- Entregue código completo, funcional e testável
- Não deixe TODOs ou placeholders sem avisar
- Se precisar de decisão de arquitetura, apresente 2 opções com prós e contras
- Informe se uma funcionalidade vai aumentar a complexidade
- Preserve funcionalidades existentes antes de refatorar
- Sempre considerar uso em campo pelo celular

---

## Regras técnicas do app

- Não tratar COPSOQ como diagnóstico médico
- Não individualizar resultados psicossociais
- Consolidar resultados por grupo/setor
- Permitir indicação técnica de necessidade de AET
- O sistema apoia a decisão técnica, não substitui profissional habilitado

---

## Módulos obrigatórios do MVP

1. Cadastro da avaliação
2. Cadastro de empresa
3. Cadastro de setores e funções
4. Checklist AEP NR 17
5. Matriz de risco ergonômico
6. COPSOQ reduzido
7. Formulário psicossocial AEP
8. Plano de ação
9. Relatório técnico
10. Exportação JSON
11. Impressão em PDF
