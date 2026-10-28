/* === SCORING · 扣分细则唯一来源 ============================================
 * 落地《材料学院实验室违规扣分细则及处理办法（试行）》(2022-09)
 * 对照 PDF 附件 1：5 类 40 条规则 + 处置阈值 + 6 月记分周期。
 *
 * 规则即数据，计算即纯函数，UI 只读。三端（admin/mp-demo/doorplate）
 * 共享此模块。所有扣分数字必须从 RULES 反算，禁止 UI 内 hardcode 数值。
 *
 *   const pts = SCORING.tally(violations);              // 累积扣分
 *   const v = SCORING.verdict(pts, 'person');           // 处置档位
 *   const pd = SCORING.currentPeriod(MOCK.today);       // 当前 6 月周期
 *
 * 新增规则只改这里。新增三端共享派生需求时，加纯函数到本文件。
 * ============================================================================ */
(function () {
  'use strict';

  /* === CATEGORIES · 5 大类元数据（label/color/order） ===================== */
  const CATEGORIES = {
    mgmt:   { label: '实验室规范管理', short: '规范', color: 'var(--brand)',  icon: '📋', order: 1 },
    elec:   { label: '实验室安全用电', short: '用电', color: 'var(--amber)',  icon: '⚡', order: 2 },
    ppe:    { label: '个人防护',       short: '防护', color: 'var(--ink-2)',  icon: '🦺', order: 3 },
    hazard: { label: '危险源管控',     short: '危源', color: 'var(--red)',    icon: '☢',  order: 4 },
    env:    { label: '环境保护',       short: '环保', color: 'var(--green)',  icon: '♻',  order: 5 },
  };
  const CATEGORY_ORDER = ['mgmt', 'elec', 'ppe', 'hazard', 'env'];

  /* === RULES · 5 类 40 条规则（PDF 附件 1） =============================
   * id 命名 <cat>-<n>，n 从 1 起，与 PDF 表格序号一一对应（便于现场查证）。
   * doubleable: PDF 第九条「相同违规出现多处的，均以基准分的 2 倍为标准」。
   * waivable:   PDF 第十四条「情节轻微，给予警告，免予记分」。
   *   本仓库收紧：30 分档（mgmt-10 重大事故隐瞒 / hazard-10 麻醉品易制毒）
   *   显式 waivable=false——PDF 原文未排除此两条的"情节轻微"通道，但业务上
   *   重大事故和管制品入境无"轻微"边界，故强收。后续若需放开改这两行即可。
   * ====================================================================== */
  const RULES = [
    // === mgmt · 实验室规范管理 (10) ===
    { id: 'mgmt-1',  cat: 'mgmt',   code: '一-1',  desc: '未接受实验室安全教育培训，未取得准入资格进入实验室开展实验活动', points: 6 },
    { id: 'mgmt-2',  cat: 'mgmt',   code: '一-2',  desc: '实验室卫生状况差，地面脏乱、台面、试剂架灰尘多等',                points: 1 },
    { id: 'mgmt-3',  cat: 'mgmt',   code: '一-3',  desc: '实验室无安全检查巡查、值日记录登记，危化品、易制毒易制爆缺台账',  points: 3 },
    { id: 'mgmt-4',  cat: 'mgmt',   code: '一-4',  desc: '未按规定储存、摆放各类物品（含危化品、高压气瓶、危废），造成安全隐患', points: 3 },
    { id: 'mgmt-5',  cat: 'mgmt',   code: '一-5',  desc: '在实验室看电影、看视频、戴耳机、玩游戏等',                          points: 3 },
    { id: 'mgmt-6',  cat: 'mgmt',   code: '一-6',  desc: '在实验室内吸烟、饮食；在实验室内（含冰箱）存放食品、饮料',          points: 12 },
    { id: 'mgmt-7',  cat: 'mgmt',   code: '一-7',  desc: '未经许可擅自启用被封实验室',                                          points: 12 },
    { id: 'mgmt-8',  cat: 'mgmt',   code: '一-8',  desc: '因玩忽职守、滥用职权等原因，致使实验室区域内出现安全问题',          points: 12 },
    { id: 'mgmt-9',  cat: 'mgmt',   code: '一-9',  desc: '不服从或不配合各级安全检查；接到整改通知拒不整改、未按期整改',     points: 12 },
    { id: 'mgmt-10', cat: 'mgmt',   code: '一-10', desc: '事故后未组织救援、未处置、隐瞒不报、未及时上报或不如实反映情况',    points: 30, waivable: false },

    // === elec · 实验室安全用电 (10) ===
    { id: 'elec-1',  cat: 'elec',   code: '二-1',  desc: '在实验室内给电瓶车电池充电及违章用电行为',                          points: 12 },
    { id: 'elec-2',  cat: 'elec',   code: '二-2',  desc: '接线板放置于地面、暖气上或烘箱上',                                  points: 3 },
    { id: 'elec-3',  cat: 'elec',   code: '二-3',  desc: '接线板破损且不符合现行国标',                                          points: 3 },
    { id: 'elec-4',  cat: 'elec',   code: '二-4',  desc: '电线横穿过道且无盖板等防护措施',                                      points: 3 },
    { id: 'elec-5',  cat: 'elec',   code: '二-5',  desc: '烘箱等大功率设备使用 10A 接线板供电',                                points: 3 },
    { id: 'elec-6',  cat: 'elec',   code: '二-6',  desc: '小型电器使用完毕未关闭开关、未拔除插头',                              points: 3 },
    { id: 'elec-7',  cat: 'elec',   code: '二-7',  desc: '配电箱周围堆放杂物',                                                  points: 3 },
    { id: 'elec-8',  cat: 'elec',   code: '二-8',  desc: '实验台防静电接地线直接与水管连接',                                    points: 3 },
    { id: 'elec-9',  cat: 'elec',   code: '二-9',  desc: '自制设备导线裸露，金属外壳未可靠接地',                                points: 3 },
    { id: 'elec-10', cat: 'elec',   code: '二-10', desc: '未充电时手机充电器插在插座上',                                        points: 3 },

    // === ppe · 个人防护 (5) ===
    { id: 'ppe-1',   cat: 'ppe',    code: '三-1',  desc: '实验人员未穿戴工作服或必要的防护用具',                                points: 3 },
    { id: 'ppe-2',   cat: 'ppe',    code: '三-2',  desc: '进入实验室披长发、穿背心、凉拖鞋做实验',                              points: 6 },
    { id: 'ppe-3',   cat: 'ppe',    code: '三-3',  desc: '戴实验手套接触实验室外物品（门把手、电梯按钮等）',                    points: 3 },
    { id: 'ppe-4',   cat: 'ppe',    code: '三-4',  desc: '使用机械类（试验机/切割机）不戴护目镜和手套，长发未盘起或身佩饰品',  points: 9 },
    { id: 'ppe-5',   cat: 'ppe',    code: '三-5',  desc: '使用高电压设备不按规定穿绝缘胶鞋和棉质保护服',                        points: 3 },

    // === hazard · 危险源管控 (10) ===
    { id: 'hazard-1',  cat: 'hazard', code: '四-1',  desc: '不按规定使用各类危险设备（吹风机/高压釜/离心机/烘箱/电炉）出现隐患', points: 6 },
    { id: 'hazard-2',  cat: 'hazard', code: '四-2',  desc: '人为因素导致跑水、漏电；电器未关闭浪费；水淹电路起火等',              points: 6 },
    { id: 'hazard-3',  cat: 'hazard', code: '四-3',  desc: '不经审批采购气瓶或其他压力装置，不经审批更换气瓶',                    points: 6 },
    { id: 'hazard-4',  cat: 'hazard', code: '四-4',  desc: '化学品标签不清/不相符，非试剂瓶盛装药品，废液桶无标签、无危废标识',  points: 6 },
    { id: 'hazard-5',  cat: 'hazard', code: '四-5',  desc: '实验操作过程无人值守，特别是危险实验（高温高压等）无人值守',          points: 6 },
    { id: 'hazard-6',  cat: 'hazard', code: '四-6',  desc: '冰箱、高温炉附近堆放泡沫、纸屑等易燃物品',                            points: 6 },
    { id: 'hazard-7',  cat: 'hazard', code: '四-7',  desc: '私自改变、改造实验室布局或对安全设施、设备拆改造成重大隐患',          points: 12 },
    { id: 'hazard-8',  cat: 'hazard', code: '四-8',  desc: '危害程度较大的特种设备装置无专人管理、无法保证安全使用',              points: 12 },
    { id: 'hazard-9',  cat: 'hazard', code: '四-9',  desc: '十万元以上大型/三高/辐射设备无安全操作规程或使用记录',                points: 12 },
    { id: 'hazard-10', cat: 'hazard', code: '四-10', desc: '私自购置/带入麻醉品、剧毒品、易制毒品、易制爆化学试剂',                points: 30, waivable: false },

    // === env · 环境保护 (5) ===
    { id: 'env-1',  cat: 'env',    code: '五-1',  desc: '实验垃圾和生活垃圾未按规定分类投放',                                  points: 3 },
    { id: 'env-2',  cat: 'env',    code: '五-2',  desc: '往下水道排放实验室废液（如氯仿、二甲苯等）',                          points: 6 },
    { id: 'env-3',  cat: 'env',    code: '五-3',  desc: '实验室危险废弃物随意丢弃',                                            points: 3 },
    { id: 'env-4',  cat: 'env',    code: '五-4',  desc: '通风设施不及时开启造成室内有害挥发物积存，危害健康',                  points: 3 },
    { id: 'env-5',  cat: 'env',    code: '五-5',  desc: '未按规定在通风橱中进行有刺激性味道的化学实验',                        points: 3 },
  ];

  /* RULES 上自动派生的字段：所有 cat 默认 doubleable=true、waivable=true，
   * 已显式声明的（如 mgmt-10/hazard-10 = false）保留显式值。 */
  RULES.forEach(r => {
    if (r.doubleable === undefined) r.doubleable = true;
    if (r.waivable === undefined)   r.waivable   = true;
  });

  // PDF 默认快照 · 用于"重置为默认"。深拷贝避免后续编辑污染。
  const DEFAULT_RULES = RULES.map(r => ({ ...r }));
  const RULE_INDEX = Object.fromEntries(RULES.map(r => [r.id, r]));

  /* === localStorage 持久化 · 管理员自定义规则 ===========================
   * 编辑后写入 localStorage（key: lab-safety-scoring-rules-v1），
   * 启动时加载，覆盖 RULES + RULE_INDEX。`resetToDefault()` 清掉 localStorage 回归 PDF 默认。
   * RULES / RULE_INDEX 引用保持稳定（原地改），跨页面读取自动拿到最新版。
   * ====================================================================== */
  const STORAGE_KEY = 'lab-safety-scoring-rules-v1';

  function applyCustomRules(newRules) {
    if (!Array.isArray(newRules)) return;
    // 原地替换 · 保持 RULES 数组引用不变
    RULES.length = 0;
    newRules.forEach(r => RULES.push({
      ...r,
      doubleable: r.doubleable !== false,
      waivable:   r.waivable   !== false,
    }));
    // 重建索引
    Object.keys(RULE_INDEX).forEach(k => delete RULE_INDEX[k]);
    RULES.forEach(r => { RULE_INDEX[r.id] = r; });
  }
  // schema 版本 · 字段演进时升 SCHEMA_VERSION，loadCustom 检测不匹配则回滚 PDF 默认
  const SCHEMA_VERSION = 1;
  function saveCustom(rules) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, rules })); }
    catch (e) { console.warn('[SCORING] saveCustom failed:', e); }
  }
  function loadCustom() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // 兼容 v1 之前直接存数组的旧数据；schema 不匹配则丢弃
      if (Array.isArray(data)) return data;
      if (data && data.version === SCHEMA_VERSION && Array.isArray(data.rules)) return data.rules;
      return null;
    } catch (e) { return null; }
  }
  function hasCustom() { return loadCustom() !== null; }
  function resetToDefault() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    applyCustomRules(DEFAULT_RULES);
  }

  // 启动时加载自定义（若有）
  const stored = loadCustom();
  if (stored) applyCustomRules(stored);

  /* === 处置阈值 ========================================================
   * PDF 第十/十一/十二条：
   *   个人 ≥6  → 提交 2 学时学习笔记后方可继续进入
   *   个人 ≥9  → 提交 4 学时学习笔记
   *   个人 ≥12 → 扣留准入证 + 48 学时学习 + 考试
   *   实验室 ≥30 → 全部准入者提交 4 学时学习笔记
   *   实验室 ≥60 → 关停实验室、整改 ≥1 周、全部准入者 8 学时学习
   * ====================================================================== */
  const PERSON_THRESHOLDS = [
    { at: 0,  tier: 'normal',     label: '正常', color: 'var(--green)', action: '记分周期内累积扣分未达提醒线，正常使用准入证。' },
    { at: 6,  tier: 'warning',    label: '注意', color: 'var(--amber)', action: '须提交 2 学时实验安全学习笔记，方可继续进入实验室。' },
    { at: 9,  tier: 'warning',    label: '警示', color: 'var(--amber)', action: '须提交 4 学时实验安全学习笔记。' },
    { at: 12, tier: 'rectifying', label: '挂牌', color: 'var(--red)',   action: '扣留实验室准入证；参加 48 学时实验安全学习并通过考试后发还。' },
  ];
  const LAB_THRESHOLDS = [
    { at: 0,  tier: 'normal',     label: '正常',     color: 'var(--green)', action: '记分周期内累积扣分未达预警线，正常运行。' },
    { at: 30, tier: 'warning',    label: '黄区',     color: 'var(--amber)', action: '全部准入者提交 4 学时实验安全学习笔记。' },
    { at: 60, tier: 'rectifying', label: '关停整改', color: 'var(--red)',   action: '关停实验室、整改 ≥ 1 周；全部准入者参加 8 学时实验安全学习。' },
  ];

  const PERIOD_LIMITS = { person: 12, lab: 60 };

  /* === 纯函数 · 计算 ===================================================== */

  /** 累积扣分。violations: [{ ruleIds: ['mgmt-3'], multiplier?: 1|2, waived?: boolean }]
   *  waived=true 跳过；multiplier 默认 1，2 表示「相同违规多处」按基准分 2 倍记。
   *  返回 number（≥0）。 */
  function tally(violations) {
    if (!Array.isArray(violations)) return 0;
    let total = 0;
    for (const v of violations) {
      if (!v || v.waived) continue;
      const mult = v.multiplier === 2 ? 2 : 1;
      const ids = Array.isArray(v.ruleIds) ? v.ruleIds : (v.ruleId ? [v.ruleId] : []);
      for (const id of ids) {
        const r = RULE_INDEX[id];
        if (r) total += r.points * mult;
      }
    }
    return total;
  }

  /** 给定累积分 → 处置档位。target='person'|'lab'。返回 { tier, label, color, action, at, next? }。
   *  next 是「下一档触发分」（已到顶档则 undefined），便于 UI 展示进度。 */
  function verdict(points, target) {
    const list = target === 'lab' ? LAB_THRESHOLDS : PERSON_THRESHOLDS;
    let cur = list[0], nextAt;
    for (let i = 0; i < list.length; i++) {
      if (points >= list[i].at) cur = list[i];
      if (points < list[i].at && nextAt === undefined) nextAt = list[i].at;
    }
    return { ...cur, next: nextAt };
  }

  /** 当前 6 个月记分周期。
   *  PDF 第三条：每年 9/1 - 次年 2/28（秋）；3/1 - 8/31（春）。 */
  function currentPeriod(today) {
    const d = today instanceof Date ? today : parseDate(today);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    if (m >= 3 && m <= 8) {
      return { season: 'spring', label: y + ' 春 · 3.1 – 8.31',
               start: y + '-03-01', end: y + '-08-31', year: y };
    }
    // 9/1 - 12/31 属当年秋；1/1 - 2/28/29 属上年秋
    const startY = (m >= 9) ? y : y - 1;
    const endY   = startY + 1;
    // 闰年覆盖 2/29：new Date(y, 2, 0) = 当年 2 月最后一天（28 或 29）
    const lastFeb = new Date(endY, 2, 0).getDate();
    return { season: 'autumn', label: startY + ' 秋 · 9.1 – 次年 2.' + lastFeb,
             start: startY + '-09-01', end: endY + '-02-' + lastFeb, year: startY };
  }

  function formatPeriod(today) { return currentPeriod(today).label; }

  function ruleById(id) { return RULE_INDEX[id]; }

  /** 仅取「在当前周期内」的违规。violation.time 形如 '2026-04-21' 或 ISO 字符串。
   *  没有 time 字段的视为当前周期（demo mock 容错）。 */
  function inPeriod(violations, today) {
    const pd = currentPeriod(today);
    const start = parseDate(pd.start).getTime();
    const end   = parseDate(pd.end).getTime() + 86400000 - 1;
    return (violations || []).filter(v => {
      if (!v || !v.time) return true;
      const t = parseDate(v.time).getTime();
      if (Number.isNaN(t)) return true;
      return t >= start && t <= end;
    });
  }

  /** 按规则类目聚合：返回 { mgmt: 12, elec: 0, ... }（含全部 5 类，缺省补 0）。 */
  function tallyByCategory(violations) {
    const out = Object.fromEntries(CATEGORY_ORDER.map(k => [k, 0]));
    for (const v of (violations || [])) {
      if (!v || v.waived) continue;
      const mult = v.multiplier === 2 ? 2 : 1;
      const ids = Array.isArray(v.ruleIds) ? v.ruleIds : (v.ruleId ? [v.ruleId] : []);
      for (const id of ids) {
        const r = RULE_INDEX[id];
        if (r) out[r.cat] = (out[r.cat] || 0) + r.points * mult;
      }
    }
    return out;
  }

  /* === 内部工具 ==========================================================
   * parseDate 仅承诺 'YYYY-MM-DD'；其他格式（如 '今日 14:32' / '04-19'）由调用方
   * 上游过滤——inPeriod 对 NaN 走"无 time 视为当前周期"的容错路径。
   * ===================================================================== */
  function parseDate(s) {
    if (s instanceof Date) return s;
    return new Date(s);
  }

  /* === 暴露到 window ===================================================== */
  window.SCORING = {
    RULES, RULE_INDEX, DEFAULT_RULES, CATEGORIES, CATEGORY_ORDER,
    PERSON_THRESHOLDS, LAB_THRESHOLDS, PERIOD_LIMITS,
    tally, verdict, currentPeriod, formatPeriod, ruleById, inPeriod, tallyByCategory,
    // 管理员编辑 API
    applyCustomRules, saveCustom, loadCustom, hasCustom, resetToDefault,
  };

  /* 自检：开发期断言，部署不影响 */
  if (RULES.length !== 40) console.warn('[SCORING] expect 40 rules, got', RULES.length);
})();
