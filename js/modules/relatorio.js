/* ============================================================
   ErgoGRO — Módulo: Central de Relatórios v4
   O relatório consolidado principal é gerado em ModuloProjeto.
   Esta tela oferece opções complementares de exportação e
   relatórios individuais por avaliação.
   ============================================================ */

const ModuloRelatorios = (() => {

  function renderizar() {
    const tela     = document.getElementById('tela-relatorios');
    const projetos = Storage.listarProjetos();
    const _fd = iso => { if (!iso) return ''; try { const [a,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${a}`; } catch { return iso; } };
    const TIPO_P = { aep:'AEP', psicossocial:'Psicossocial', aet:'AET', integrado:'Integrado' };

    const projetosHTML = projetos.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📊</div>
          <p>Nenhum projeto de laudo criado ainda.</p></div>`
      : projetos.map(p => {
          const emp  = Storage.buscarEmpresa(p.empresaId);
          const avs  = Storage.listarPorProjeto(p.id);
          return `
            <div class="card" style="margin-bottom:var(--s4)">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--s3);margin-bottom:var(--s3)">
                <div>
                  <div style="font-weight:700">📁 ${p.nome}</div>
                  <div style="font-size:var(--txt-xs);color:var(--texto-sec)">
                    ${emp?.nome||''} · ${_fd(p.dataInicio)} ·
                    <span class="badge-tipo badge-tipo-${p.tipo==='integrado'?'aep':p.tipo}">${TIPO_P[p.tipo]||p.tipo}</span>
                    · ${avs.length} avaliação(ões)
                  </div>
                </div>
              </div>
              <div style="display:flex;gap:var(--s2);flex-wrap:wrap">
                <button class="btn btn-primario btn-sm" onclick="App.abrirProjeto('${p.id}');setTimeout(()=>ModuloProjeto.trocarSecao('relatorio'),200)">
                  📄 Relatório Consolidado
                </button>
                <button class="btn btn-secundario btn-sm" onclick="ModuloRelatorios.exportarProjeto('${p.id}')">
                  📤 Exportar JSON
                </button>
              </div>

              <!-- Avaliações individuais -->
              ${avs.length > 0 ? `
              <div style="margin-top:var(--s3);border-top:1px solid var(--borda);padding-top:var(--s3)">
                <div style="font-size:var(--txt-xs);color:var(--texto-sec);font-weight:600;margin-bottom:var(--s2)">
                  AVALIAÇÕES INDIVIDUAIS:
                </div>
                ${avs.map(av => {
                  const f = av.funcaoId ? Storage.buscarFuncao(av.funcaoId) : null;
                  const s = av.setorId  ? Storage.buscarSetor(av.setorId)  : null;
                  const TIPO_ICON = { aep:'📋', psicossocial:'🧠', aet:'🔬' };
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--s2) 0;border-bottom:1px solid var(--borda)">
                      <div>
                        <span>${TIPO_ICON[av.tipo]||'📋'}</span>
                        <span class="badge-tipo badge-tipo-${av.tipo}" style="margin:0 var(--s1)">${av.tipo.toUpperCase()}</span>
                        <span style="font-size:var(--txt-sm)">${f?.nome||''} ${s?'· '+s.nome:''}</span>
                        <span style="font-size:var(--txt-xs);color:var(--texto-sec);margin-left:var(--s2)">${_fd(av.dataAvaliacao)}</span>
                      </div>
                      <button class="btn btn-fantasma btn-sm" onclick="App.abrirAvaliacao('${av.id}')">Abrir →</button>
                    </div>
                  `;
                }).join('')}
              </div>` : ''}
            </div>
          `;
        }).join('');

    tela.innerHTML = `
      <div class="container" style="padding-top:var(--s4)">

        <div class="aviso-tecnico info" style="margin-bottom:var(--s4)">
          <span>📊</span>
          <span>O <strong>Relatório Consolidado</strong> de cada projeto está disponível
          dentro do próprio projeto (aba Relatório). Aqui você acessa relatórios individuais
          e exportação de dados.</span>
        </div>

        <div style="font-weight:600;margin-bottom:var(--s3)">
          Projetos de Laudo (${projetos.length})
        </div>
        ${projetosHTML}

        <!-- Exportação global -->
        <div class="card">
          <div class="card-titulo" style="margin-bottom:var(--s4)">📤 Backup Completo</div>
          <div style="display:flex;gap:var(--s3);flex-wrap:wrap">
            <button class="btn btn-secundario" style="flex:1" onclick="ModuloRelatorios.exportarTudo()">
              📤 Exportar Tudo (JSON)
            </button>
            <button class="btn btn-secundario" onclick="ModuloRelatorios.importarJSON()">
              📥 Importar JSON
            </button>
          </div>
          <p style="font-size:var(--txt-xs);color:var(--texto-sec);margin-top:var(--s3)">
            Backup inclui todas as empresas, projetos e avaliações.
          </p>
        </div>

      </div>

      <input type="file" id="input-importar-json" accept=".json" class="oculto"
             onchange="ModuloRelatorios.processarImportacao(this)">
    `;
  }

  function exportarProjeto(projetoId) {
    try {
      const json = Storage.exportarProjeto(projetoId);
      const proj = Storage.buscarProjeto(projetoId);
      const blob = new Blob([json], { type:'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Projeto_${(proj?.nome||'laudo').replace(/\s+/g,'_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      App.mostrarToast('Projeto exportado','sucesso');
    } catch(e) { App.mostrarToast('Erro ao exportar: '+e.message,'erro'); }
  }

  function exportarTudo() {
    const dados = {
      exportadoEm: new Date().toISOString(),
      versao: '4',
      empresas:  Storage.listarEmpresas(),
      projetos:  Storage.listarProjetos(),
      setores:   Storage.listarSetores(),
      funcoes:   Storage.listarFuncoes(),
      avaliacoes:Storage.listar()
    };
    /* listarSetores e listarFuncoes sem filtro */
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ErgoGRO_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.mostrarToast('Backup exportado','sucesso');
  }

  function importarJSON() {
    document.getElementById('input-importar-json').click();
  }

  function processarImportacao(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const d = JSON.parse(e.target.result);
        let importadas = 0;
        const lista = d.avaliacoes || [d];
        lista.forEach(av => {
          try { Storage.importarJSON(JSON.stringify(av)); importadas++; } catch(e2) {}
        });
        App.mostrarToast(`${importadas} avaliação(ões) importada(s)`,'sucesso');
        Storage.migrar();
        renderizar();
      } catch(err) { App.mostrarToast('Erro ao importar: '+err.message,'erro'); }
    };
    reader.readAsText(file);
    input.value = '';
  }

  return { renderizar, exportarProjeto, exportarTudo, importarJSON, processarImportacao };
})();

/* Alias de compatibilidade */
const ModuloRelatorio = ModuloRelatorios;
