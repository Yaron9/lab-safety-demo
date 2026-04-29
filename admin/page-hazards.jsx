/* ============================================================
   危险源台账 · 接 8 大类 48 条政策（v3 · 删除无依据的 Ⅰ/Ⅱ/Ⅲ 分级换皮）
   ------------------------------------------------------------
   - 8 大类：教育部 docx 框架，filter / 列 / 政策依据三处呈现
   - severity（critical/warning/info）：demo 工程语言，"严重/关注/一般"
   - 不做分级换皮：教育部文件没给 Ⅰ/Ⅱ/Ⅲ 判定标准，xlsx 模板里那栏是
     填报员手填字段，不是从 critical 自动推；要做就在生产版本由 HSE 评估
   ============================================================ */

const TODAY_HAZARD = new Date(MOCK.today || '2026-04-21');
const FLAT_HAZARDS = MOCK.labs.flatMap(l =>
  (l.hazardSources || []).map(h => ({
    ...h,
    labId: l.id, labName: l.name, labDept: l.dept, labLead: l.lead, labStatus: l.status,
    _cls8: class8Of(h),
  }))
);

function HazardKindChip({ k }) {
  const m = HAZARD_KIND_META[k] || { label: k, icon: '·', color: 'var(--ink-2)' };
  return (
    <span className="chip" style={{ background: 'var(--bg)', color: m.color, borderColor: 'var(--line)' }}>
      {m.icon} {m.label}
    </span>
  );
}

function HazardSeverityChip({ s }) {
  if (s === 'critical') return <span className="chip chip-red">严重</span>;
  if (s === 'warning')  return <span className="chip chip-amber">关注</span>;
  return <span className="chip chip-gray">一般</span>;
}

function Class8Chip({ k }) {
  const m = RISK_TAXONOMY_8CLASS[k];
  if (!m) return null;
  return (
    <span className="chip chip-gray" style={{ paddingLeft: 6, paddingRight: 8 }}>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginRight: 6, letterSpacing: 0.5 }}>
        CLASS-{String(m.no).padStart(2, '0')}
      </span>
      <span style={{ color: 'var(--ink)' }}>{m.short}</span>
    </span>
  );
}

function HazardsKpi() {
  const total = FLAT_HAZARDS.length;
  const critical = FLAT_HAZARDS.filter(h => h.severity === 'critical').length;
  const summary = summarize8Class(MOCK.labs);
  const coverK = TAXONOMY_ORDER_8.filter(k => summary[k] > 0).length;
  const avgDays = Math.round(
    FLAT_HAZARDS.reduce((s, h) => s + (TODAY_HAZARD - new Date(h.lastCheck)) / 86400000, 0) / Math.max(total, 1)
  );
  return (
    <div className="kpi-row">
      <div className="kpi">
        <div className="kpi-label">在册危险源</div>
        <div className="kpi-value">{total}</div>
        <div className="kpi-meta">覆盖 {MOCK.labs.filter(l => (l.hazardSources || []).length).length} 间实验室</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">严重等级</div>
        <div className="kpi-value" style={{ color: 'var(--red)' }}>{critical}</div>
        <div className="kpi-meta">需双锁 / 双人 / 应急预案</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">8 大类覆盖</div>
        <div className="kpi-value">
          {coverK}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)' }}> / 8</span>
        </div>
        <div className="kpi-meta">教育部试行清单基线</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">平均距上次检查</div>
        <div className="kpi-value">{avgDays} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)' }}>天</span></div>
        <div className="kpi-meta">≤ 30 天为正常巡检节奏</div>
      </div>
    </div>
  );
}

function PolicyItemList({ items }) {
  return (
    <div className="stack-l" style={{ gap: 14 }}>
      {items.map(it => (
        <div key={it.no} style={{ paddingBottom: 12, borderBottom: '1px solid var(--line-2)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{String(it.no).padStart(2, '0')}</span>
            <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{it.title}</strong>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 6 }}>
            {it.desc}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            {it.actions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function HazardPanel({ hz, onClose }) {
  if (!hz) return null;
  const cls8 = hz._cls8;
  const cls8Meta = RISK_TAXONOMY_8CLASS[cls8];
  const days = Math.round((TODAY_HAZARD - new Date(hz.lastCheck)) / 86400000);
  return (
    <>
      <div className="panel-ov" onClick={onClose}></div>
      <div className="panel">
        <div className="panel-h">
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }} className="mono">
              {hz.id}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{hz.name}</div>
            <div className="row" style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
              <HazardSeverityChip s={hz.severity} />
              <Class8Chip k={cls8} />
              <HazardKindChip k={hz.kind} />
              <span className="chip chip-brand">{hz.labId}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: '18px 24px' }} className="stack-l">
          <div className="grid-2" style={{ gap: 12 }}>
            <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 6 }}>
              <div className="meta" style={{ fontSize: 11 }}>存放位置</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{hz.location}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 6 }}>
              <div className="meta" style={{ fontSize: 11 }}>上次检查</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{hz.lastCheck}</div>
              <div className="meta" style={{ fontSize: 11, marginTop: 4 }}>{days} 天前</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              所需个人防护（PPE）
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {(hz.ppe || []).map(p => <span key={p} className="chip chip-gray">{p}</span>)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              应急处置
            </div>
            <div style={{ padding: 12, background: 'var(--red-soft, #fee2e2)', border: '1px solid #fdba74', borderRadius: 6, fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>
              ⚠ {hz.emergency}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              所属实验室
            </div>
            <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                <span className="mono">{hz.labId}</span> · {hz.labName}
              </div>
              <div className="meta" style={{ marginTop: 4 }}>{hz.labDept} · 负责人 {hz.labLead}</div>
            </div>
          </div>

          {cls8Meta && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                政策依据 · {cls8Meta.label}（{cls8Meta.items.length} 条）
              </div>
              <div className="meta mono" style={{ fontSize: 11, marginBottom: 12 }}>
                CLASS-{String(cls8Meta.no).padStart(2, '0')} · 教育部《高校实验室重要危险源主要风险清单（试行）》
              </div>
              <PolicyItemList items={cls8Meta.items} />
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
            <button className="btn">导出条目</button>
            <button className="btn">登记复检</button>
            <button className="btn btn-primary">编辑 PPE / 应急</button>
          </div>
        </div>
      </div>
    </>
  );
}

function HazardsPage() {
  const [cls, setCls] = React.useState('all');
  const [sev, setSev] = React.useState('all');
  const [open, setOpen] = React.useState(null);

  const list = FLAT_HAZARDS.filter(h => {
    if (cls !== 'all' && h._cls8 !== cls) return false;
    if (sev !== 'all' && h.severity !== sev) return false;
    return true;
  });

  const summary = summarize8Class(MOCK.labs);
  const countBySev = s => FLAT_HAZARDS.filter(h => h.severity === s).length;

  return (
    <div>
      <div className="page-h">
        <div>
          <div className="page-title">危险源台账</div>
          <div className="page-sub">
            按教育部 8 大类 48 条对每间实验室危险源结构化登记 · 含 PPE、应急、上次检查 — 三端共用此数据
          </div>
        </div>
        <div className="row">
          <button className="btn">导出 Excel</button>
          <button className="btn btn-primary">+ 新增危险源</button>
        </div>
      </div>

      <HazardsKpi />

      <div className="filters">
        <span className="muted mono" style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>8-CLASS</span>
        <button className={'pill ' + (cls === 'all' ? 'active' : '')} onClick={() => setCls('all')}>
          全部 · {FLAT_HAZARDS.length}
        </button>
        {TAXONOMY_ORDER_8.map(k => {
          const m = RISK_TAXONOMY_8CLASS[k];
          const n = summary[k] || 0;
          return (
            <button key={k}
              className={'pill ' + (cls === k ? 'active' : '')}
              onClick={() => setCls(k)}
              style={n === 0 ? { opacity: 0.45 } : null}>
              <span className="mono" style={{ marginRight: 4, fontSize: 11, color: cls === k ? '#fff' : 'var(--ink-3)' }}>0{m.no}</span>
              {m.short} · {n}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-2)' }}>共 {list.length} 项</span>
      </div>

      <div className="filters">
        <span className="muted mono" style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>严重度</span>
        {[
          { k: 'all',     l: '全部' },
          { k: 'critical', l: '严重 · ' + countBySev('critical') + ' 项' },
          { k: 'warning',  l: '关注 · ' + countBySev('warning') + ' 项' },
          { k: 'info',     l: '一般 · ' + countBySev('info') + ' 项' },
        ].map(f => (
          <button key={f.k} className={'pill ' + (sev === f.k ? 'active' : '')} onClick={() => setSev(f.k)}>{f.l}</button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>名称 / 编号</th>
              <th style={{ width: 100 }}>类型</th>
              <th style={{ width: 150 }}>8 大类</th>
              <th>所属实验室</th>
              <th>位置</th>
              <th style={{ width: 80 }}>严重度</th>
              <th>PPE</th>
              <th style={{ width: 100 }}>上次检查</th>
            </tr>
          </thead>
          <tbody>
            {list.map(h => (
              <tr key={h.id} onClick={() => setOpen(h)}>
                <td>
                  <strong>{h.name}</strong>
                  <div className="meta mono" style={{ fontSize: 11 }}>{h.id}</div>
                </td>
                <td><HazardKindChip k={h.kind} /></td>
                <td><Class8Chip k={h._cls8} /></td>
                <td>
                  <span className="chip chip-brand">{h.labId}</span>
                  <div className="meta" style={{ fontSize: 11, marginTop: 2 }}>{h.labName}</div>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>{h.location}</td>
                <td><HazardSeverityChip s={h.severity} /></td>
                <td>
                  <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                    {(h.ppe || []).slice(0, 2).map(p => <span key={p} className="chip chip-gray" style={{ fontSize: 10 }}>{p}</span>)}
                    {h.ppe && h.ppe.length > 2 && <span className="meta" style={{ fontSize: 10 }}>+{h.ppe.length - 2}</span>}
                  </div>
                </td>
                <td className="meta mono" style={{ fontSize: 11 }}>{h.lastCheck}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>暂无匹配的危险源</div>
        )}
      </div>

      {open && <HazardPanel hz={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

window.HazardsPage = HazardsPage;
window.HazardKindChip = HazardKindChip;
window.HazardSeverityChip = HazardSeverityChip;
window.Class8Chip = Class8Chip;
