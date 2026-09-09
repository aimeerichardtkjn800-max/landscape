/* ============ config.js · 集中可替换内容配置 ============
   所有人名统一用 "XXX" 占位符，后期替换即可。
   其余可替换内容（日期/地点/照片/音乐/色系/时间线）均集中于此。
====================================================== */
window.App = window.App || {};
window.App.config = {
  /* 人名占位符（火漆印章首字母、RSVP 输入框、结尾署名都用此处取值） */
  bride: "XXX",
  groom: "XXX",

  /* 日期 / 时间 / 地点 */
  date: "2026-10-10",              // ISO，用于罗马化
  dateDisplay: "X · X · MMXXVI",  // 手动覆盖显示（罗马数字风格）
  time: "4:00 PM",
  venue: "Rosewood Garden Chapel",
  address: "123 Garden Avenue, Rosewood City",
  mapQuery: "Rosewood Garden Chapel",

  /* 照片：15 个槽位 */
  photoSlots: 15,
  photoKey: (i) => "photo-" + i,  // IndexedDB file key: photo-1 ~ photo-15
  /* 默认照片（随请柬内置的婚纱照，槽位无用户上传时回退显示） */
  defaultPhotos: [
    "assets/photos/p1.png", "assets/photos/p2.png", "assets/photos/p3.png",
    "assets/photos/p4.png", "assets/photos/p5.png", "assets/photos/p6.png",
    "assets/photos/p7.png", "assets/photos/p8.png", "assets/photos/p9.png",
    "assets/photos/p10.png", "assets/photos/p11.png", "assets/photos/p12.png",
    "assets/photos/p13.png", "assets/photos/p14.png", "assets/photos/p15.png",
  ],

  /* 音乐：null = 用内置合成器（Canon in D 风格）；填路径则用文件循环播放 */
  defaultMusic: "assets/music/bgm.ogg",

  /* 色系（CSS 变量与 THREE.Color 共用） */
  theme: {
    champagne: "#e8c987",
    gold:      "#d4af37",
    goldDeep:  "#9c6b26",
    goldLight: "#f0d68a",
    goldPale:  "#fff3d0",
    ivory:     "#fbf6ec",
    silk:      "#f3ead8",
    roseGold:  "#e3b1a0",
    rosePink:  "#e8c4c0",
    blush:     "#f7e4e0",
    warm:      "#fff0e2",
    skyTop:    "#f7eede",
    skyBot:    "#e9d6c0",
    skyHorizon:"#e3b1a0",
    fog:       "#f0e4d2",
    ground:    "#e9dcc6",
  },

  /* 时间线节点（场景5）：交替左右，5 个 */
  timeline: [
    { date: "MMXXIII · Spring",  title: "First Glance", body: "在花园的转角，初次相遇。",           side: -1, photo: 1 },
    { date: "MMXXIV · Summer",   title: "First Date",   body: "夏夜的星光与咖啡，话匣子一旦打开便关不上。", side:  1, photo: 2 },
    { date: "MMXXIV · Autumn",   title: "The Proposal", body: "枫叶纷飞的日子，单膝跪下许下承诺。",     side: -1, photo: 3 },
    { date: "MMXXV · Winter",    title: "Together",    body: "雪夜里的漫步，手心的温度。",           side:  1, photo: 4 },
    { date: "MMXXVI · Always",   title: "Forever",     body: "往后余生，风雪是你，平淡也是你。",       side: -1, photo: 5 },
  ],

  /* 各场景文案 */
  text: {
    inviteKicker:  "WEDDING INVITATION",
    inviteBody:    "Together with their families\nXXX & XXX\nrequest the honour of your presence\nat their wedding celebration.",
    storyTitle:    "OUR STORY",
    infoKicker:    "WEDDING DAY",
    infoTitle:     "Save the Date",
    rsvpKicker:    "R.S.V.P",
    rsvpTitle:     "Will You Join Us?",
    rsvpThanks:    "感谢您的祝福",
    endingTitle:   "Thank You",
    endingBody:    "愿所爱皆可得，愿所愿皆成真。\n风雪是你，平淡也是你。",
    openHint:      "Click to Open",
    scrollHint:    "Swipe · Continue",
  },

  /* 粒子上限（硬约束：花瓣≤50，光粒子≤100） */
  petals: { mobile: 30, desktop: 50 },
  flecks: { mobile: 40, desktop: 100 },

  /* 照片墙上限 */
  photoWallCols: 5,
  photoWallRows: 3,

  /* ============ 顶部祝福弹幕（预设示例，可替换为真实留言数据） ============ */
  /* 数据接口：window.App.danmaku.push("祝福语") 即可实时飘屏；
     RSVP 提交后会自动把嘉宾留言推入此处。 */
  danmaku: {
    enabled: true,
    rows: 3,                 // 多行轨道，避免重叠
    duration: [20, 30],      // 单条飘屏时长区间（秒），越慢越优雅
    interval: [5.5, 9],      // 自动循环投放间隔区间（秒）
    presets: [
      "祝 XXX & XXX 新婚快乐，百年好合！",
      "愿你们始于初见，止于终老，岁岁常欢愉。",
      "May your love grow stronger with every passing year.",
      "恭贺新禧，愿琴瑟和鸣，白头偕老。",
      "Wishing you a lifetime of love and laughter.",
      "愿有岁月可回首，且以深情共白头。",
      "Cheers to a beautiful journey together, forever & always.",
      "天作之合，佳偶天成，祝永结同心！",
    ],
  },
};
