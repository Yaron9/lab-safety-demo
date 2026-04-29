/* Mock data — kept minimal & realistic, inline so prototype is self-contained */

/* === Schema 同构 · admin / mp-demo / doorplate 三端共享语义 ==================
 * labs[i]:   { id, name, dept, lead, status, level, nextInspection,
 *              temp, humidity, score, inRoom, today, hazards, note?, deadline?,
 *              hazardSources[], vacationAuth?[] }
 *   status:  'normal' | 'warning' | 'rectifying'   （三档，仅此三档）
 *   level:   1 | 2                                  （一级周检 / 二级月检）
 *   vacationAuth[i]: { studentId, studentName, fromDate, toDate, dayOnly,
 *                      grantedBy, grantedAt }
 *     寒暑假白名单（反馈 11）· 仅日间 dayOnly=true 表示禁止夜间进入
 * events[i]: { id, kind, severity, lab, time, title, detail, status,
 *              actors?, counter?, progress? }
 *   kind:    见下方 EVENT_KIND_META（单一真相源）
 *   severity:'critical' | 'warning' | 'info'
 *   status:  'active' | 'pending' | 'rectifying' | 'handled' | 'done'
 * hazardSources[i]: { id, kind, name, location, severity, ppe[], emergency, lastCheck }
 *   kind:    见下方 HAZARD_KIND_META
 *   severity:'critical' | 'warning' | 'info'
 * projects[i]: { id, title, lab, applicant, advisor, riskLevel, status,
 *                currentStep, hazardSources[], sop, estimatedEnd, timeline[] }
 *   riskLevel: 见下方 PROJECT_RISK_META
 *   status:    见下方 PROJECT_STATUS_META
 *   timeline[]: { time, title, desc, done?, current? } — 与 violation.timeline 同 schema
 * ============================================================================ */

/* === EVENT_KIND_META · UI 展示元数据的唯一来源 ============================
 * 任何页面（inbox / events / bigscreen）都从此读 label/color/scoring，
 * 禁止在页面内重新写字典。新增 kind 时只改这一处。
 * scoring=true 表示该类事件触发扣分；false 仅留痕或告警。
 * ========================================================================== */
const EVENT_KIND_META = {
  alert:      { label: '🚨 实时告警', color: 'var(--red)',   scoring: false },
  violation:  { label: '⚖ 重大违规', color: 'var(--amber)', scoring: true  },
  rectify:    { label: '🔧 整改跟进', color: 'var(--brand)', scoring: false },
  inspection: { label: '📋 检查扣分', color: 'var(--amber)', scoring: true  },
  patrol:     { label: '🔍 巡查记录', color: 'var(--ink-2)', scoring: false },
  unattended: { label: '👤 无人值守', color: 'var(--red)',   scoring: false },
};
const EVENT_KINDS_ORDER = ['alert', 'violation', 'inspection', 'unattended', 'rectify', 'patrol'];

/* === HAZARD_KIND_META · 危险源类型字典（page-hazards 唯一来源） ============ */
const HAZARD_KIND_META = {
  chemical:   { label: '化学品', icon: '🧪', color: 'var(--red)' },
  physical:   { label: '物理',   icon: '🔥', color: 'var(--amber)' },
  biological: { label: '生物',   icon: '🧫', color: 'var(--green)' },
  radiation:  { label: '辐射',   icon: '☢',  color: 'var(--purple, #8b5cf6)' },
  mechanical: { label: '机械',   icon: '⚙',  color: 'var(--brand)' },
  electrical: { label: '电气',   icon: '⚡', color: 'var(--amber)' },
  gas:        { label: '气体',   icon: '💨', color: 'var(--ink-2)' },
};
const HAZARD_KINDS_ORDER = ['chemical', 'physical', 'biological', 'radiation', 'mechanical', 'electrical', 'gas'];

/* === RISK_TAXONOMY_8CLASS · 教育部《高校实验室重要危险源主要风险清单（试行）》8 大类 48 条 =====
 * 政策字典（只读，UI 引用条款用）。来源：附件-高校实验室重要危险源主要风险清单（试行）.docx
 * 与 HAZARD_KIND_META 共存：前者是政策分类轴（合规视角），后者是工程类型轴（PPE/应急视角）。
 * ============================================================================ */
const RISK_TAXONOMY_8CLASS = {
  chem: { no: 1, key: 'chem', label: '危险化学品', short: '危化品', items: [
    { no: 1, title: '爆炸风险', desc: '受热、摩擦、撞击、震动等外界作用下可能发生剧烈化学反应，瞬间产生大量气体和热量导致爆炸。', actions: [
      '有防爆需求的实验室选用防爆型电气设备，达到整体防爆要求',
      '采取有效措施避免或减少危险爆炸性环境，避免任何潜在有效点燃源',
      '危化品专用仓库须有通风、隔热、避光、防盗、防爆、防静电、泄漏报警等措施',
      '危化品应储存在专用储存室或储存专柜内，由专人负责管理',
      '同一防火单元内须控制易燃易爆化学品的存放总量在合理范围',
      '涉及危险工艺、重点监管危化品的反应装置应设置自动化控制系统',
    ]},
    { no: 2, title: '自燃易燃风险', desc: '常温下易燃烧、遇空气自燃或遇水剧烈反应产生易燃气体，引发火灾，遇明火/高热/静电火花即可能引发燃烧或爆炸。', actions: [
      '有机溶剂储存区应远离热源和火源',
      '同一防火单元内控制易燃易爆化学品存放总量在合理范围',
      '常年大量使用易燃易爆溶剂须加装泄漏报警器，储存部位加装常时排风或与监测报警联动排风装置',
    ]},
    { no: 3, title: '剧烈反应风险', desc: '发生反应后剧烈放热，或生成易燃、易爆物质。', actions: [
      '涉及危险工艺在调整工艺路线后须重新进行安全风险分析，制定相应防护措施及现场处置方案',
      '危险工艺指导书和应急预案上墙或便于取阅，实验人员熟悉所涉及的危险性及应急处理措施',
    ]},
    { no: 4, title: '中毒风险', desc: '可通过吸入、食入或皮肤接触导致急性或慢性中毒，严重时危及生命。', actions: [
      '实验室排出的有害物质浓度超标时须采取净化措施，做到达标排放',
      '可能产生有毒有害气体的实验须在通风柜内进行，操作者佩戴有效个体防护装备',
      '实验室内不得饮食',
    ]},
    { no: 5, title: '腐蚀风险', desc: '接触皮肤、眼睛或呼吸道会造成严重化学灼伤，并对环境造成破坏。', actions: [
      '存在燃烧、腐蚀等风险的实验区域须配置应急喷淋和洗眼装置',
      '按需要佩戴防护眼镜、防护手套、安全帽、呼吸器或面罩等',
      '配备必要的二次泄漏防护、吸附或防溢流功能等的设施设备',
    ]},
    { no: 6, title: '个体防护风险', desc: '个体防护装备配备错误，与危险源及反应过程风险不匹配，或未配备个体防护装备。', actions: [
      '进入实验室人员须穿着质地合适的实验服或防护服',
      '化学和高温实验时慎戴隐形眼镜',
      '穿着化学类实验服或戴实验手套时不得进入非实验区',
    ]},
    { no: 7, title: '实验条件风险', desc: '实验条件不能满足实验要求。', actions: [
      '项目负责人对实验项目进行危险源辨识、风险评估和控制，制定现场处置方案',
      '开展实验前进行安全风险分析并经项目负责人审核，调整工艺路线后须重新进行安全风险分析',
    ]},
    { no: 8, title: '使用过程风险', desc: '标准操作规程与危化品使用过程不匹配或未制定 SOP。', actions: [
      '危险实验时不能脱岗，须有实验室负责人或其指定的安全员在场',
      '制定危险实验、危险工艺指导书、各类标准操作规程（SOP）、应急预案',
    ]},
    { no: 9, title: '应急处置风险', desc: '应急处置预案及设施与实验涉及危化品不匹配，或未制定应急预案、未配备应急设施。', actions: [
      '学校、二级单位和实验室建立针对重要危险源的现场处置方案并定期组织演练',
      '配备的急救箱不得上锁，定期检查物品是否在保质期内',
      '存在燃烧、腐蚀等风险的实验区域须配置应急喷淋和洗眼装置',
    ]},
  ]},
  gas: { no: 2, key: 'gas', label: '气体气瓶', short: '气瓶', items: [
    { no: 10, title: '物理爆炸风险', desc: '气瓶存放不当、超期使用、受到撞击、安全附件失效时可能发生物理爆炸，碎片和冲击波造成严重伤害。', actions: [
      '气体（气瓶）存放点须通风、远离热源、避免暴晒，地面平整干燥',
      '气瓶应合理固定',
      '有供应商定期检验合格标识，无超过检验有效期及设计年限的气瓶',
      '气瓶附件齐全',
    ]},
    { no: 11, title: '化学爆炸风险', desc: '易燃气体与空气混合达到爆炸极限，遇明火/静电火花即可能引发化学爆炸；助燃气体与油脂或可燃物接触可能剧烈燃烧。', actions: [
      '有防爆需求的实验室选用防爆型电气设备',
      '涉及有毒、可燃气体的场所配有通风设施和气体监测报警装置',
      '可燃性气体与氧气等助燃气体气瓶不得混放',
    ]},
    { no: 12, title: '中毒与窒息风险', desc: '有毒气体泄漏可能导致急性中毒；惰性气体或窒息性气体在密闭空间大量泄漏会置换氧气，导致缺氧窒息。', actions: [
      '操作者佩戴合适有效的呼吸防护用具',
      '涉及有毒、可燃气体的场所配有通风和气体监测报警装置',
      '存有大量无毒窒息性压缩气体或液化气体的较小密闭空间须安装氧含量监测报警装置',
      '同一实验单元内须控制气瓶的存放总量在合理范围',
    ]},
    { no: 13, title: '气体监测装置风险', desc: '气体监测装置与危险气体不匹配、安装位置错误、功能失效。', actions: [
      '涉及有毒、可燃气体的场所配有气体监测报警装置',
      '存有大量窒息性气体的较小密闭空间须安装氧含量监测报警装置',
      '所有安装的监测报警装置须符合规范要求',
    ]},
    { no: 14, title: '气瓶检验与配件风险', desc: '气瓶超过检验有效期或设计年限；压力表、减压阀等过期失效，气瓶缺少保护罩等附件。', actions: [
      '有供应商定期检验合格标识，无超期或超龄气瓶',
      '气瓶附件齐全、与气体配套',
      '安全阀或压力表等附件须委托有资质的单位定期校验或检定',
    ]},
    { no: 15, title: '气瓶使用风险', desc: '气路老化泄漏。', actions: [
      '管路材质选择合适，无破损或老化现象，连接处须有效加固并定期进行气密性检查',
    ]},
  ]},
  bio: { no: 3, key: 'bio', label: '生物安全', short: '生物', items: [
    { no: 16, title: '高致病性病原微生物感染风险', desc: '操作未经灭活的高致病性病原微生物时防护不当，可能通过气溶胶、直接接触等途径导致实验室获得性感染，甚至引发公共卫生事件。', actions: [
      '实验室生物安全级别不低于国家发布的病原微生物目录要求',
      '在合适的生物安全柜中操作，不得在超净工作台中进行',
      '操作高速离心机时防止离心管破损或盖子破裂造成溢洒或气溶胶扩散',
      '有合适的个体防护措施，禁止戴防护手套操作相关实验以外的设施设备',
    ]},
    { no: 17, title: '动物实验风险', desc: '实验动物可能携带人畜共患病病原体，咬伤、抓伤或接触排泄物、分泌物时可能造成感染。', actions: [
      '实验动物须从有资质单位购买并有合格证明',
      '解剖实验动物时必须做好个体防护',
      '直接接触实验动物的工作人员须定期组织健康检查',
      '动物尸体及组织应做无害化处理',
    ]},
    { no: 18, title: '过程操作风险', desc: '在生物安全柜外操作病原微生物，离心操作不当造成离心管破裂，未经培训使用生物安全柜，解剖动物时防护不当。', actions: [
      '不得在超净工作台中进行 BSL-2 以上病原微生物实验',
      '按 SOP 安全操作高速离心机',
      '人员经考核合格并取得证书',
      '配备生物安全柜并定期检测',
    ]},
    { no: 19, title: '物品与废物风险', desc: '使用后的锐器未放入利器盒导致刺伤；感染性废物未经有效灭菌即移出；动物尸体未做无害化处理。', actions: [
      '尖锐物应使用利器盒或耐扎纸板箱盛放',
      '感染性生物废物必须高温高压灭菌或化学浸泡处理后由有资质公司处置',
      '动物尸体及组织做无害化处理，感染性废物彻底灭菌',
      '实验室配备生物废物垃圾桶并定期消毒杀菌、监测效果',
    ]},
    { no: 20, title: '资质与备案风险', desc: '未经批准或备案在不符合等级要求的实验室开展病原微生物实验；使用高致病性菌（毒）种未办理申请报批。', actions: [
      'BSL-1/ABSL-1、BSL-2/ABSL-2 实验室由学校建设后报设区市卫生或农业农村部门备案',
      '合规获取病原微生物菌（毒）株，学校应有审批流程',
      '转移和运输高致病病原微生物须按规定报批',
    ]},
    { no: 21, title: '人员与培训风险', desc: '相关人员未经专业培训取得证书；未对从事高致病性人员提供医学评估和监测；外来人员随意进入。', actions: [
      '人员经考核合格并取得证书',
      '对实验室工作人员进行健康监测，妥善保存医学记录',
      '外来人员进入须经负责人批准并有相关教育培训、安全防控措施',
      '出现感冒发热等症状时不得进行病原微生物实验',
    ]},
    { no: 22, title: '伦理与处置风险', desc: '动物实验未通过伦理审查；生物废物处置不规范，未与有资质单位签约或与生活垃圾混装。', actions: [
      '学校有实验动物福利伦理审查机构并有审查记录',
      '学校与有资质单位签约处置感染性废物并有交接记录',
      '生物废物应与化学废物、生活垃圾分开贮存',
    ]},
  ]},
  rad: { no: 4, key: 'rad', label: '辐射安全', short: '辐射', items: [
    { no: 23, title: '外照射风险', desc: 'γ 辐照装置、X 射线衍射仪、电子加速器等射线装置以及密封放射源，在无屏蔽或屏蔽不足时可能引起组织损伤、白血病、癌症等。', actions: [
      '辐射工作人员应具有考核成绩报告单',
      '进入实验场所须佩戴个人剂量计',
      '辐照设施设备和场所应具有正常工作的安全联锁和报警装置',
      '各类放射性装置有符合国家规定的操作规程、安保方案及应急预案',
    ]},
    { no: 24, title: '内照射风险', desc: '操作非密封放射性物质时防护不当，可能通过吸入、食入或伤口进入体内造成内照射，对器官造成长期损害。', actions: [
      '进入实验场所须佩戴个人剂量计',
      '辐射工作人员经过专门培训',
      '制定辐射事故应急预案并演练',
    ]},
    { no: 25, title: '操作风险', desc: '未按规定程序操作辐照装置导致人员误入辐照室被照射；放射性物质泄漏泼洒造成大面积污染；联锁装置失效。', actions: [
      '辐照设施设备具有有效安全联锁装置',
      '辐射实验场所每年有合格的实验场所检测报告',
      '遵守操作规程、安保方案及应急预案',
      '定期组织应急演练',
    ]},
    { no: 26, title: '储存与保管风险', desc: '放射源未按规定在储库或保险柜中存放，或未执行双人双锁管理，存在被盗、丢失风险。', actions: [
      '放射源有专人管理并做好贮存、领取、发放情况登记',
      '核材料许可证持有单位须建立专职机构或指定专人负责保管核材料',
      '放射源储存库应设双人双锁，并有安全报警系统和视频监控',
    ]},
    { no: 27, title: '资质与人员风险', desc: '未取得辐射安全许可证即开展辐射工作；人员未经培训考核、未参加体检；未佩戴或未送检剂量计。', actions: [
      '工作单位须取得辐射安全许可证',
      '工作人员应具有考核成绩报告单',
      '按时参加放射性职业体检并有健康档案',
      '工作人员须佩戴个人剂量计，委托有资质单位按时进行剂量监测',
    ]},
    { no: 28, title: '场所与废物风险', desc: '辐射设施和场所未设警示、联锁和报警装置；放射性废物当作普通废物处理；放射性废液随意排放；转让运输未报批。', actions: [
      '有明显的安全警示标志、警戒线和剂量报警仪',
      '配置专门的放射性废物收集桶，放射性废液送贮前进行固化整备',
      '放射性废物应及时送交有资质单位贮存',
      '排放气态或液态放射性流出物按环评批准方式执行',
    ]},
    { no: 29, title: '应急与处置风险', desc: '无辐射事故应急预案或未演练；放射源及设备报废时无符合国家规定的处置方案或回收协议；涉源场所退役未按规定执行。', actions: [
      '有辐射事故应急预案及应急演练记录',
      '中、长半衰期核素固液废物有符合国家规定的处置方案或回收协议',
      '报废放射源或可产生放射性的设备须报学校管理部门同意，并按国家规定退役处置',
    ]},
  ]},
  heat: { no: 5, key: 'heat', label: '加热设备', short: '加热', items: [
    { no: 30, title: '火灾风险', desc: '烘箱、电阻炉、马弗炉、电热板、油浴锅等加热设备，长时间超温运行、散热不良、线路老化或周边堆放易燃易爆物品时极易引发火灾。', actions: [
      '设备旁不得放置易燃易爆物品',
      '设备使用完毕清理物品、切断电源，确认其冷却至安全温度后方能离开',
    ]},
    { no: 31, title: '烫伤风险', desc: '设备表面温度高，人员误触或操作不当（如未使用隔热工具）可能造成严重烫伤。', actions: [
      '设备周边醒目位置张贴高温警示标志，并有必要的防护措施',
      '按需要佩戴防护眼镜、防护手套等',
    ]},
    { no: 32, title: '爆炸风险', desc: '将易燃易爆试剂或物品（易燃溶剂、塑料、纸制品）放入烘箱等密闭加热设备中烘烤，可能引发爆炸。', actions: [
      '烘箱等加热设备内不准烘烤易燃易爆试剂及易燃物品',
      '不得使用塑料筐等易燃容器盛放实验物品在烘箱等加热设备内烘烤',
    ]},
    { no: 33, title: '操作过程风险', desc: '未制定加热设备 SOP；使用加热设备时人员离开现场，使用明火电炉或高温实验时无人值守。', actions: [
      '张贴有安全操作规程、警示标志',
      '使用电阻炉等明火设备时经过审批并有人值守',
      '使用加热设备时温度较高的实验须有人值守或有实时监控措施',
      '危险实验时不能脱岗',
    ]},
    { no: 34, title: '超期使用风险', desc: '烘箱、电阻炉等设备超期服役，未定期维护保养和检查。', actions: [
      '烘箱、电阻炉不超期使用，如超期使用须经审批',
    ]},
  ]},
  cool: { no: 6, key: 'cool', label: '制冷设备', short: '制冷', items: [
    { no: 35, title: '爆炸风险', desc: '普通冰箱（非防爆）内部电气元件开关时可能产生火花，若存放易燃易爆化学品（乙醚、丙酮），其挥发蒸气遇火花可能引发爆炸。', actions: [
      '贮存危化品的冰箱应为防爆冰箱或经过防爆改造，并在冰箱门上注明是否防爆',
      '实验室冰箱中试剂瓶螺口拧紧，无开口容器',
    ]},
    { no: 36, title: '冻伤风险', desc: '接触制冷设备（超低温冰箱、液氮罐）的低温表面或内容物（液氮、冻存管），可能造成皮肤冻伤。', actions: [
      '定期开展应急知识学习、应急处置培训和应急演练',
      '按需要佩戴防护眼镜、防护手套等',
    ]},
    { no: 37, title: '窒息风险', desc: '使用液氮、液氩等液化气体在密闭或通风不良的小空间内大量泄漏，迅速气化置换空气中的氧气，导致缺氧窒息。', actions: [
      '定期开展应急知识学习、应急处置培训和应急演练',
      '存有大量无毒窒息性压缩气体或液化气体的较小密闭空间须安装氧含量监测报警装置',
    ]},
    { no: 38, title: '超期使用风险', desc: '冰箱超期使用，设备老化，能耗增加，制冷效率下降，安全隐患（线路老化、温控失灵）增大。', actions: [
      '冰箱不超期使用，如超期使用须经审批',
    ]},
    { no: 39, title: '散热不良风险', desc: '冰箱周围堆放杂物或紧贴墙壁放置，影响散热，可能导致压缩机过热、寿命缩短甚至引发火灾。', actions: [
      '冰箱周围留出足够空间，周围不堆放杂物，不影响散热',
    ]},
    { no: 40, title: '标识与分区风险', desc: '超低温冰箱门上无储物分区标识，影响查找和整理。', actions: [
      '冰箱内存放的物品须标识明确，至少包括名称、使用人、日期等，并经常清理',
      '超低温冰箱门上有储物分区标识',
    ]},
  ]},
  press: { no: 7, key: 'press', label: '压力容器', short: '压力', items: [
    { no: 41, title: '超压爆炸风险', desc: '压力容器（储气罐、高压灭菌锅、反应釜）罐体或其他关键设备腐蚀老化时可能发生超压爆炸，造成严重伤害。', actions: [
      '压力容器须取得特种设备使用登记证',
      '委托有资质的单位进行定期检验，并将定期检验合格证置于显著位置',
      '建立压力容器自行检查制度',
    ]},
    { no: 42, title: '物理爆炸风险', desc: '快开门式压力容器（灭菌锅）在门未完全关闭或锁紧时升压，或压力未降至常压时开门，极易发生爆炸事故。', actions: [
      '快开门式压力容器操作人员应取得相应特种设备作业人员证，持证上岗',
    ]},
    { no: 43, title: '介质泄漏风险', desc: '盛装有毒、易燃、腐蚀性介质的压力容器发生泄漏，可能导致中毒、火灾、化学灼伤等次生灾害。', actions: [
      '涉及有毒、可燃气体的场所配有通风设施和气体监测报警装置',
    ]},
    { no: 44, title: '操作风险', desc: '操作人员未经培训、无证上岗；未按操作规程进行升压、保压、降压；快开门压力容器违规操作门锁。', actions: [
      '建立各项安全管理制度，制定操作规程',
      '实验室经常巡回检查，发现异常及时处理',
    ]},
    { no: 45, title: '附件失效风险', desc: '安全阀、压力表未定期校验或检定导致失效；安全阀泄放口未正确导向，可能误伤人员。', actions: [
      '安全阀或压力表等附件须委托有资质的单位定期校验或检定',
    ]},
    { no: 46, title: '登记与检验风险', desc: '未办理特种设备使用登记证；未委托有资质单位定期检验或检验合格证过期；简单压力容器未建立设备安全管理档案；超期使用。', actions: [
      '压力容器须取得特种设备使用登记证',
      '委托有资质的单位进行定期检验',
      '简单压力容器也应建立设备安全管理档案',
      '达到设计使用年限的压力容器应及时报废',
    ]},
  ]},
  oper: { no: 8, key: 'oper', label: '危险作业', short: '危作', items: [
    { no: 47, title: '危险作业风险', desc: '动火、有限空间、高处作业、吊装、临时用电、爆破、挖掘等。理工科高校学生从事小试或中试实验时会从事危险作业，作业风险高、事故易发。', actions: [
      '危险作业前对作业现场进行安全风险辨识、制定作业方案和安全防范措施',
      '按规定持证上岗、进行安全技术交底',
      '指定专人进行现场作业的统一指挥',
      '指定安全管理人员进行现场安全检查和监督',
    ]},
    { no: 48, title: '特殊设备风险', desc: '高电压、大电流、高温、高压、高速运动、电磁辐射等特殊设备，以及非标自制实验设备、锂电池等未做安全评估与防护，无人员监管。', actions: [
      '特殊设备电路容量要匹配，有设备运行维护记录、安全操作规程或注意事项',
      '特殊设备有安全防护措施，对使用者有培训要求，有安全警示标志和警示线',
      '非标自制设备应经安全论证合格后方可使用，须充分考虑安全系数并有安全防护措施',
      '操作特殊设备时实验人员应做好个体防护，防护用品要穿戴齐全',
      '高电压、大电流等强电实验室要设定安全距离，按规定设置安全警示牌、安全信号灯、联动式警铃、门锁，有安全隔离装置或屏蔽遮栏',
      '强电实验室禁止存放易燃、易爆、易腐品，保持通风散热',
      '功率较大的激光器有互锁装置、防护罩，激光照射方向不会对他人造成伤害',
      '锂电池、高能量密度电池等在充放电时须注意热失控，相关实验区域应远离其他可燃物品',
      '进行特殊设备相关实验时须有专人在场指导',
    ]},
  ]},
};
const TAXONOMY_ORDER_8 = ['chem', 'gas', 'bio', 'rad', 'heat', 'cool', 'press', 'oper'];

/* === KIND_TO_CLASS · 7-kind 类型轴 → 8-class 政策轴默认映射 ================
 * hazardSource 上 class8 字段优先（显式覆盖）。physical 默认归"加热"，但
 * 液氮/液氦等显式标 'cool'；mechanical/electrical 默认归"危险作业"，但
 * 液压系统等显式标 'press'。
 * ============================================================================ */
const KIND_TO_CLASS = {
  chemical:   'chem',
  gas:        'gas',
  biological: 'bio',
  radiation:  'rad',
  physical:   'heat',
  electrical: 'oper',
  mechanical: 'oper',
};

/* === RISK_GRADE_META · 风险分级 Ⅰ/Ⅱ/Ⅲ（政策语言） + severity 一一对应 ===== */
const SEV_TO_GRADE = { critical: 'I', warning: 'II', info: 'III' };
const RISK_GRADE_META = {
  I:   { label: 'Ⅰ 级', short: 'Ⅰ', color: 'var(--red)',   desc: '高风险' },
  II:  { label: 'Ⅱ 级', short: 'Ⅱ', color: 'var(--amber)', desc: '中风险' },
  III: { label: 'Ⅲ 级', short: 'Ⅲ', color: 'var(--green)', desc: '低风险' },
};

/* === PROJECT_STATUS_META / PROJECT_RISK_META · 实验项目元数据 ============== */
const PROJECT_STATUS_META = {
  draft:           { label: '草稿',     color: 'var(--ink-3)', chipCls: 'chip-gray' },
  'advisor-review':{ label: '导师审核', color: 'var(--amber)', chipCls: 'chip-amber' },
  'center-review': { label: '实验中心', color: 'var(--amber)', chipCls: 'chip-amber' },
  'dean-review':   { label: '学院终审', color: 'var(--amber)', chipCls: 'chip-amber' },
  active:          { label: '进行中',   color: 'var(--brand)', chipCls: 'chip-brand' },
  closed:          { label: '已结案',   color: 'var(--green)', chipCls: 'chip-green' },
  rejected:        { label: '已驳回',   color: 'var(--red)',   chipCls: 'chip-red' },
};
const PROJECT_STATUS_ORDER = ['advisor-review', 'center-review', 'dean-review', 'active', 'closed', 'rejected'];
const PROJECT_RISK_META = {
  high:   { label: '高风险', color: 'var(--red)' },
  medium: { label: '中风险', color: 'var(--amber)' },
  low:    { label: '低风险', color: 'var(--green)' },
};

const MOCK = {
  today: '2026-04-21',
  me: { name: '李雪茹', role: '管理员 · 学院 HSE', dept: '材料科学与工程学院', avatar: '李' },
  labs: [
    {
      id: '302', name: '电化学与储能材料实验室', dept: '材料化学系', lead: '赵振华',
      status: 'normal', level: 1, nextInspection: '2026-04-28',
      temp: 22.2, humidity: 59, score: 92, inRoom: 3, today: 14,
      hazards: ['腐蚀','火灾','爆炸','中毒','高压'], note: '',
      hazardSources: [
        { id: 'hs-302-01', kind: 'chemical', name: '浓硫酸 1 L', location: '302 · 危化柜 #1',
          severity: 'critical', ppe: ['丁腈手套', '防护面屏', '耐酸围裙'],
          emergency: '大量清水冲洗 ≥ 15min · 立即就医（一级洗眼器在门口右侧）', lastCheck: '2026-04-15' },
        { id: 'hs-302-02', kind: 'chemical', name: '锂金属箔 50 g', location: '302 · 手套箱配套柜',
          severity: 'critical', ppe: ['丁腈手套', '防护眼镜', '阻燃实验服'],
          emergency: '严禁遇水 · D 类金属火灾用石墨粉扑灭，禁用水/CO₂', lastCheck: '2026-04-12' },
        { id: 'hs-302-03', kind: 'electrical', name: '电化学工作站 CHI760E', location: '302 · 工位 3',
          severity: 'warning', ppe: ['绝缘鞋'],
          emergency: '断电 → 隔离 · 切勿触碰输出端子（最高 ±10V / 1A）', lastCheck: '2026-04-10' },
      ],
      vacationAuth: [
        { studentId: 'p02', studentName: '王语嫣', fromDate: '2026-07-15', toDate: '2026-08-31',
          dayOnly: true, grantedBy: '赵振华', grantedAt: '2026-04-25' },
      ],
    },
    {
      id: '410', name: '功能材料合成实验室', dept: '材料物理系', lead: '周景明',
      status: 'rectifying', level: 1, nextInspection: '2026-04-28',
      temp: 24.1, humidity: 52, score: 48, inRoom: 0, today: 2,
      hazards: ['火灾','爆炸','高温','中毒'],
      note: '违规积分触发关闭门禁，整改至 04-28', deadline: '2026-04-28',
      hazardSources: [
        { id: 'hs-410-01', kind: 'physical', name: '管式炉 GSL-1700X', location: '410 · 工位 1',
          severity: 'critical', ppe: ['耐高温手套', '防护面屏', '阻燃实验服'],
          emergency: '断电 + 自然降温 · 严禁开炉 < 200°C · 烫伤涂烧伤膏并就医', lastCheck: '2026-04-08' },
        { id: 'hs-410-02', kind: 'gas', name: '氢气钢瓶 40 L', location: '410 · 室外气瓶柜',
          severity: 'critical', ppe: ['静电手环', '防护面屏'],
          emergency: '关阀断气 · 通风 · 拨打 119（爆炸下限 4%）', lastCheck: '2026-04-15' },
        { id: 'hs-410-03', kind: 'chemical', name: '三氯化磷 500 mL', location: '410 · 危化柜 #2',
          severity: 'critical', ppe: ['丁腈手套', '全面型防毒面具', '通风柜操作'],
          emergency: '剧毒挥发 · 防毒面具 + 撤离至上风口 · 立即就医', lastCheck: '2026-04-15' },
      ],
    },
    {
      id: 'A208', name: '色质联用与有机分析室', dept: '测试中心', lead: '钱雨桐',
      status: 'warning', level: 2, nextInspection: '2026-05-21',
      temp: 26.8, humidity: 65.4, score: 78, inRoom: 2, today: 6,
      hazards: ['火灾','中毒','高温'],
      note: '挥发性气体浓度偏高，通风已加强',
      hazardSources: [
        { id: 'hs-A208-01', kind: 'chemical', name: '氢氟酸 500 mL', location: 'A208 · 剧毒柜（双锁）',
          severity: 'critical', ppe: ['HF 专用手套', '全面型防毒面具', '耐酸围裙'],
          emergency: '皮肤接触 → 葡萄糖酸钙凝胶覆盖 + 立即就医（必须告知 HF）', lastCheck: '2026-04-19' },
        { id: 'hs-A208-02', kind: 'chemical', name: '乙腈 4 L', location: 'A208 · 易燃柜 #1',
          severity: 'warning', ppe: ['丁腈手套', '防护眼镜'],
          emergency: '远离明火 · 通风操作 · 吸入大量空气 + 就医', lastCheck: '2026-04-12' },
        { id: 'hs-A208-03', kind: 'physical', name: 'GC-MS 离子源 250°C', location: 'A208 · GC 仪器舱',
          severity: 'warning', ppe: ['耐高温手套'],
          emergency: '禁打开舱门 < 50°C · 烫伤就医', lastCheck: '2026-04-10' },
      ],
    },
    {
      id: '105', name: 'X 射线衍射分析室', dept: '测试中心', lead: '孙学明',
      status: 'warning', level: 2, nextInspection: '2026-05-21',
      temp: 21.5, humidity: 48, score: 80, inRoom: 1, today: 3,
      hazards: ['辐射','高压'],
      note: '单人操作告警 · 已通知',
      hazardSources: [
        { id: 'hs-105-01', kind: 'radiation', name: 'X 射线源 (Cu Kα)', location: '105 · XRD 主仓',
          severity: 'critical', ppe: ['辐射剂量计', '铅围裙（备用）'],
          emergency: '严禁手动开舱门 · 异常时立即关电源 → 联系辐射安全员', lastCheck: '2026-04-15' },
        { id: 'hs-105-02', kind: 'electrical', name: '高压发生器 60 kV', location: '105 · XRD 控制柜',
          severity: 'critical', ppe: ['绝缘鞋', '禁带金属饰品'],
          emergency: '断电后等 15min 放电 · 禁触摸高压端子', lastCheck: '2026-04-10' },
      ],
    },
    {
      id: '207', name: '扫描电镜测试室', dept: '测试中心', lead: '李雪茹',
      status: 'normal', level: 2, nextInspection: '2026-05-21',
      temp: 22.0, humidity: 45, score: 96, inRoom: 1, today: 2,
      hazards: ['高压','辐射'],
      hazardSources: [
        { id: 'hs-207-01', kind: 'electrical', name: 'SEM 加速电压 30 kV', location: '207 · 主机',
          severity: 'warning', ppe: ['绝缘鞋'],
          emergency: '断电 · 等 5min 放电 → 联系工程师', lastCheck: '2026-04-12' },
        { id: 'hs-207-02', kind: 'radiation', name: '二次电子 / 背散射探测器', location: '207 · 样品舱',
          severity: 'info', ppe: ['辐射剂量计（年检）'],
          emergency: '低剂量 · 正常使用即可', lastCheck: '2026-04-12' },
      ],
    },
    {
      id: '312', name: '手套箱与惰性气氛实验室', dept: '材料化学系', lead: '赵振华',
      status: 'normal', level: 2, nextInspection: '2026-05-21',
      temp: 23.5, humidity: 30, score: 94, inRoom: 2, today: 8,
      hazards: ['爆炸','低温','缺氧'],
      hazardSources: [
        { id: 'hs-312-01', kind: 'chemical', name: '锂金属（手套箱内）', location: '312 · 手套箱 A',
          severity: 'critical', ppe: ['丁腈手套（手套箱）', '防护眼镜'],
          emergency: '严禁取出手套箱 · D 类金属火灾用石墨粉', lastCheck: '2026-04-18' },
        { id: 'hs-312-02', kind: 'physical', class8: 'cool', name: '液氮杜瓦瓶 50 L', location: '312 · 制冷区',
          severity: 'warning', ppe: ['低温手套', '防护面屏'],
          emergency: '冻伤 → 温水缓慢复温（禁热水）+ 就医', lastCheck: '2026-04-10' },
        { id: 'hs-312-03', kind: 'gas', name: '氩气惰性气氛', location: '312 · 室内整体',
          severity: 'info', ppe: ['氧浓度报警器'],
          emergency: '氧 < 19.5% 立即撤离 · 通风', lastCheck: '2026-04-15' },
      ],
      vacationAuth: [
        { studentId: 'p02', studentName: '王语嫣', fromDate: '2026-07-15', toDate: '2026-07-30',
          dayOnly: true, grantedBy: '赵振华', grantedAt: '2026-04-25' },
        { studentId: 'p04', studentName: '孙静怡', fromDate: '2026-08-01', toDate: '2026-08-25',
          dayOnly: true, grantedBy: '赵振华', grantedAt: '2026-04-26' },
      ],
    },
    {
      id: '216', name: '材料力学性能测试室', dept: '材料工程系', lead: '黄志刚',
      status: 'normal', level: 2, nextInspection: '2026-05-21',
      temp: 24.0, humidity: 50, score: 90, inRoom: 1, today: 4,
      hazards: ['机械','噪声','高压'],
      hazardSources: [
        { id: 'hs-216-01', kind: 'mechanical', name: '万能试验机 100 kN', location: '216 · 工位 1',
          severity: 'warning', ppe: ['防护眼镜', '安全鞋'],
          emergency: '紧急停机按钮（红色蘑菇头）· 远离运动夹具', lastCheck: '2026-04-08' },
        { id: 'hs-216-02', kind: 'mechanical', class8: 'press', name: '液压伺服系统 25 MPa', location: '216 · 工位 2',
          severity: 'critical', ppe: ['防护眼镜', '安全鞋'],
          emergency: '泄压 + 断电 · 严禁带压拆装管路', lastCheck: '2026-04-08' },
      ],
    },
    {
      id: 'B105', name: '生物材料细胞培养室', dept: '材料化学系', lead: '周明',
      status: 'normal', level: 2, nextInspection: '2026-05-21',
      temp: 25.0, humidity: 55, score: 88, inRoom: 2, today: 5,
      hazards: ['生物','腐蚀'],
      hazardSources: [
        { id: 'hs-B105-01', kind: 'biological', name: '大肠杆菌 K-12（BSL-1）', location: 'B105 · 生物安全柜',
          severity: 'warning', ppe: ['一次性手套', '实验服', '口罩'],
          emergency: '泄漏 → 含氯消毒液覆盖 30min · 高压灭菌 121°C 20min', lastCheck: '2026-04-19' },
        { id: 'hs-B105-02', kind: 'chemical', name: '戊二醛 25% 500 mL', location: 'B105 · 危化柜',
          severity: 'warning', ppe: ['丁腈手套', '防护眼镜', '通风柜操作'],
          emergency: '皮肤接触 → 大量清水冲洗 · 吸入 → 通风 + 就医', lastCheck: '2026-04-15' },
      ],
    },
  ],
  events: [
    { id: 'ev-01', kind: 'alert',      severity: 'critical', lab: 'A208', time: '今日 14:32', title: '长时驻留 10 小时', detail: '孙静怡 · 进入时间 04:30 · 单人连续工作', actors: ['已通知 导师', '未通知 HSE'], status: 'active', counter: '升级倒计时 07:12' },
    { id: 'ev-02', kind: 'inspection', severity: 'warning',  lab: '410',  time: '今日 10:23', title: '管式炉周围堆放可燃试剂 · 周检扣 5 分', detail: '违规者 李浩然（累计 -12 分 黄牌）· 检查人 王玉鸿（一级周检发现）', status: 'pending', counter: '申诉期剩 59h' },
    { id: 'ev-03', kind: 'rectify',    severity: 'info',     lab: '410',  time: '04-19',     title: '整改期 · 剩 3 天', detail: '周景明已提交整改报告（8 张照片）· 待你现场签字', progress: 80, status: 'pending', counter: '04-28 截止' },
    { id: 'ev-04', kind: 'inspection', severity: 'warning',  lab: '302',  time: '昨日 16:08', title: '未戴护目镜操作酸液 · 季检扣 3 分', detail: '违规者 王语嫣 · 检查人 王玉鸿（学校季度检查发现）', status: 'rectifying' },
    { id: 'ev-05', kind: 'alert',      severity: 'warning',  lab: '105',  time: '昨日 22:15', title: '单人夜间操作（禁止独自）', detail: '孙学明 · 已远程语音提醒', status: 'handled' },
    { id: 'ev-06', kind: 'alert',      severity: 'info',     lab: '207',  time: '04-19 12:05', title: '烟感报警（焊接作业误报）', detail: '3 分钟内确认处置', status: 'handled' },
    { id: 'ev-07', kind: 'patrol',     severity: 'info',     lab: 'A208', time: '04-18',     title: '废液桶未分类 · 巡查记录', detail: '钱雨桐已现场重新分类 · 不扣分（日常巡查仅留痕）', status: 'done' },
    { id: 'ev-08', kind: 'rectify',    severity: 'info',     lab: '302',  time: '04-10',     title: '电化学工作站接地线松动 整改完成', detail: '赵振华签字 · 复检合格', status: 'done' },
    { id: 'ev-09', kind: 'unattended', severity: 'critical', lab: '410',  time: '今日 13:42', title: '反应炉运行中 · 0 人在室', detail: '李浩然 13:24 离开 · 实验「催化合成 #3」未停止 · 已 18 分钟', actors: ['已通知 周景明', '已通知 王玉鸿'], status: 'active', counter: '升级倒计时 02:00' },
    { id: 'ev-10', kind: 'inspection', severity: 'info',     lab: '302',  time: '04-28',     title: '一级实验室 · 周检即将到达（剩 7 天）', detail: '检查人 王玉鸿 · 重点：危化柜双锁 / 管式炉周边 / 通风柜负载', status: 'pending', counter: '04-28 09:00 截止' },
    { id: 'ev-11', kind: 'patrol',     severity: 'info',     lab: 'A208', time: '昨日 11:20', title: '试剂瓶标签褪色 · 巡查记录', detail: '已现场提醒钱雨桐重新标注 · 不扣分', status: 'handled' },
  ],
  projects: [
    {
      id: 'proj-2026-01', title: '钠离子电池正极材料 · 高温烧结合成',
      lab: '302', applicant: '张一凡', advisor: '赵振华',
      riskLevel: 'high', status: 'active', currentStep: 4,
      hazardSources: ['hs-302-01', 'hs-302-02', 'hs-410-01'],
      sop: '高温炉 800°C 烧结 6h · 真空环境 · 单批次 ≤ 5 g · 必须双人在场',
      estimatedEnd: '2026-04-28 16:30',
      timeline: [
        { time: '03-15 09:00', title: '学生申请',     desc: '张一凡 提交项目申请书 + SOP v3.2', done: true },
        { time: '03-16 11:20', title: '导师审核',     desc: '赵振华 已签字 · 危险源核实通过', done: true },
        { time: '03-18 14:30', title: '实验中心审核', desc: '王玉鸿 现场核对危化品库存与 PPE 配置', done: true },
        { time: '03-20 10:00', title: '学院终审',     desc: '安全副院长签字 · 准予立项', done: true },
        { time: '04-21 14:00', title: '项目进行中',   desc: '当前在 302 · 实验阶段 4/6 · 双人在场', current: true },
        { time: '—',           title: '项目结束 · 归档', desc: '关闭门禁高风险标识 · 三废清单交接' },
      ],
    },
    {
      id: 'proj-2026-02', title: '锂电池电解液配方筛选',
      lab: '312', applicant: '王语嫣', advisor: '赵振华',
      riskLevel: 'medium', status: 'advisor-review', currentStep: 1,
      hazardSources: ['hs-312-01', 'hs-312-03'],
      sop: '手套箱内配制 · 单次 < 100 mL · 含氟添加剂占比 ≤ 3%',
      estimatedEnd: '2026-05-30',
      timeline: [
        { time: '04-19 16:00', title: '学生申请', desc: '王语嫣 提交申请书 + SOP v1.0', done: true },
        { time: '—',           title: '导师审核', desc: '赵振华 待签字（剩 22h）', current: true },
        { time: '—',           title: '实验中心备案', desc: '中风险项目 · 仅备案不需现场核验' },
        { time: '—',           title: '准予立项',   desc: '导师审核通过即生效' },
      ],
    },
    {
      id: 'proj-2026-03', title: 'SEM 样品形貌表征 · 镍基合金断口分析',
      lab: '207', applicant: '孙静怡', advisor: '李雪茹',
      riskLevel: 'low', status: 'closed', currentStep: 3,
      hazardSources: ['hs-207-01'],
      sop: 'SEM 标准操作 · 加速电压 ≤ 20 kV · 单次 ≤ 4h',
      estimatedEnd: '2026-04-10',
      timeline: [
        { time: '03-25 10:00', title: '学生申请', desc: '孙静怡 提交常规测试申请', done: true },
        { time: '03-25 11:30', title: '导师审核', desc: '李雪茹 当日签字（低风险走快速通道）', done: true },
        { time: '04-08 09:00', title: '项目进行中', desc: '完成 12 个样品测试', done: true },
        { time: '04-10 17:00', title: '结案归档',   desc: '数据已提交 · 项目关闭', done: true },
      ],
    },
  ],
  people: [
    { id: 'p01', name: '李浩然', role: '学生',   dept: '材料研24',  labs: ['410'],       score: 78,  status: '黄牌', violations: 2, training: 'valid' },
    { id: 'p02', name: '王语嫣', role: '学生',   dept: '材料研24',  labs: ['302'],       score: 89,  status: '正常', violations: 1, training: 'valid' },
    { id: 'p03', name: '赵梓豪', role: '学生',   dept: '材料研23',  labs: ['410'],       score: 72,  status: '黄牌', violations: 3, training: 'expiring' },
    { id: 'p04', name: '孙静怡', role: '学生',   dept: '测试中心',  labs: ['A208'],      score: 95,  status: '正常', violations: 0, training: 'valid' },
    { id: 'p05', name: '钱雨桐', role: '学生',   dept: '测试中心',  labs: ['A208'],      score: 72,  status: '黄牌', violations: 3, training: 'valid' },
    { id: 'p06', name: '赵振华', role: '导师',   dept: '材料化学系', labs: ['302','312'], score: 100, status: '正常', violations: 0, training: 'valid' },
    { id: 'p07', name: '周景明', role: '导师',   dept: '材料物理系', labs: ['410'],       score: 88,  status: '正常', violations: 1, training: 'valid' },
    { id: 'p08', name: '王玉鸿', role: '巡查员', dept: '学院 HSE',   labs: ['*'],         score: 100, status: '正常', violations: 0, training: 'valid' },
  ],
  accessFlow: [
    { t: '14:45', who: '赵振华', action: '进入', lab: '302', via: '人脸' },
    { t: '14:32', who: '孙静怡', action: '⚠ 长时驻留告警', lab: 'A208', via: '系统' },
    { t: '14:28', who: '王语嫣', action: '进入', lab: '302', via: '人脸' },
    { t: '14:10', who: '李浩然', action: '拒绝进入（整改期）', lab: '410', via: '人脸' },
    { t: '13:55', who: '钱雨桐', action: '离开', lab: 'A208', via: '人脸' },
    { t: '13:40', who: '黄志刚', action: '进入', lab: '216', via: '人脸' },
  ],
  trend7d: [22, 28, 31, 27, 35, 18, 24],
};

/* === 8-class 反算 helper（policy taxonomy 唯一计算入口） ============== */
function class8Of(hz) { return (hz && hz.class8) || (hz && KIND_TO_CLASS[hz.kind]) || 'oper'; }
function gradeOf(hz)  { return (hz && hz.riskGrade) || (hz && SEV_TO_GRADE[hz.severity]) || 'III'; }
function labGradeOf(lab) {
  const grades = ((lab && lab.hazardSources) || []).map(gradeOf);
  if (grades.includes('I')) return 'I';
  if (grades.includes('II')) return 'II';
  return 'III';
}
function summarize8Class(labs) {
  const r = Object.fromEntries(TAXONOMY_ORDER_8.map(k => [k, 0]));
  (labs || []).forEach(l => ((l.hazardSources) || []).forEach(h => {
    r[class8Of(h)] += (h.count || 1);
  }));
  return r;
}

window.MOCK = MOCK;
window.EVENT_KIND_META = EVENT_KIND_META;
window.EVENT_KINDS_ORDER = EVENT_KINDS_ORDER;
window.HAZARD_KIND_META = HAZARD_KIND_META;
window.HAZARD_KINDS_ORDER = HAZARD_KINDS_ORDER;
window.PROJECT_STATUS_META = PROJECT_STATUS_META;
window.PROJECT_STATUS_ORDER = PROJECT_STATUS_ORDER;
window.PROJECT_RISK_META = PROJECT_RISK_META;
window.RISK_TAXONOMY_8CLASS = RISK_TAXONOMY_8CLASS;
window.TAXONOMY_ORDER_8 = TAXONOMY_ORDER_8;
window.KIND_TO_CLASS = KIND_TO_CLASS;
window.SEV_TO_GRADE = SEV_TO_GRADE;
window.RISK_GRADE_META = RISK_GRADE_META;
window.class8Of = class8Of;
window.gradeOf = gradeOf;
window.labGradeOf = labGradeOf;
window.summarize8Class = summarize8Class;
