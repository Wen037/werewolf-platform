export type Lang = 'en' | 'zh';

export const zh: Record<string, string> = {
  // ── Navigation ────────────────────────────────────────────────────
  'Find Games':  '找游戏',
  'Game Space':  '游戏场地',
  'My Events':   '我的活动',
  'My Profile':  '我的档案',
  'Login':       '登录',
  'Logout':      '退出',
  'Contact Us':  '联系我们',

  // ── Header page titles ────────────────────────────────────────────
  'Game Map':    '游戏地图',
  'Dashboard':   '主页',

  // ── Home page ─────────────────────────────────────────────────────
  'A Night of Deception': '谎言之夜',
  'Login / Register':     '登录 / 注册',
  'Find a Game':          '找一局',
  'The village awaits.':  '进入狼村',

  // ── Credit ranks ──────────────────────────────────────────────────
  '⚠ Flagged':   '⚠ 警告',
  'Flagged':     '⚠ 警告',
  'Recruit':     '新注册',
  'Trusted':     '玩过几次',
  'Reliable':    '靠谱',
  'Tactician':   '经常玩',
  'Elite':       '打狼狂人',
  'Grandmaster': '重度狼瘾',

  // ── Skill / Proficiency ───────────────────────────────────────────
  'Beginner':    '初学',
  'Intermediate':'中等',
  'Advanced':    '高手',
  'Expert':      '大神',
  'All Welcome': '不限水平',
  'Newbie':      '新手',

  // ── Profile page ──────────────────────────────────────────────────
  'Following':              '关注',
  'Followers':              '粉丝',
  'Level':                  '等级',
  'Saved Places':           '收藏场地',
  'Match History':          '对局记录',
  'Games':                  '局数',
  'Likes':                  '获赞',
  'Edit Contact Info':      '编辑联系方式',
  'Edit Bio':               '编辑简介',
  'Choose Avatar':          '换头像',
  'Cancel':                 '取消',
  'Report':                 '举报',
  'Admin':                  '管理员',
  '⚠ Caution':              '⚠ 注意',
  'Not following anyone.':  '还没有关注任何人。',
  'No saved places.':       '还没有收藏场地。',
  'No games played yet.':   '还没有游戏记录。',
  '● Completed':            '● 完成',
  '● Left Early':           '● 提前退出',
  'Score below 100 is visible to hosts.':   '信用分低于100对发起人可见。',
  'Attend an event on time':                '准时参加活动',
  'Quit within 24 hrs of event start':      '开场前24小时内退出',
  'No bio yet. Just a villager trying to survive the night.':
                                            '还没有简介。就是个努力活过今晚的村民。',

  // ── My Events ─────────────────────────────────────────────────────
  'upcoming':                   '即将进行',
  'history':                    '历史记录',
  'Host Event':                 '发起游戏',
  'Quit Event':                 '退出活动',
  'Quit Event?':                '确认退出?',
  'Keep My Spot':               '保留席位',
  'Quit (−1 credit)':           '退出（-1信用分）',
  'Late Cancellation Penalty':  '临时退出扣分',
  'Your Credit':                '我的信用分',
  'After Quit':                 '退出后',
  'rank drop':                  '等级下降',
  'Venue Confirmed':            '场地已确认',
  'Pending Space Approval':     '等待场地确认',
  'Invite Friends':             '邀请好友',
  'Hosted by':                  '发起人',
  'No upcoming events found.':  '没有即将进行的活动。',
  'No history events found.':   '没有历史记录。',
  'Time to hunt some wolves!':  '出发去猎狼吧！',
  'Your Rating':                '我的评分',
  'Punctual':                   '守时',
  'Late':                       '迟到',
  'WeChat':                     '微信',
  'Copied!':                    '已复制!',

  // ── Venue type labels ─────────────────────────────────────────────
  'Board Game Café':  '桌游咖啡馆',
  'Home':             '家',
  'Office / Co-work': '办公室',
  'School / Campus':  '学校',
  'Other':            '其他',

  // ── Edit Space Modal ──────────────────────────────────────────────
  'Only you (the owner) can edit this listing': '仅场地主可编辑此场地',
  'Space Type':             '场地类型',
  'Address Privacy':        '地址隐私',
  'Public':                 '公开',
  'Approximate':            '大致位置',
  'Private':                '保密',
  'Full address shown to everyone':             '完整地址对所有人可见',
  'District shown; full address on request':    '仅显示区域；完整地址可申请',
  'Area only; shared after player joins':       '仅显示区域；加入后获取详址',
  'Home venues default to private — only the district is shown publicly.':
    '家庭场地默认保密——仅公开显示区域。',
  'Office / school venues default to approximate — full address shared on request.':
    '办公室/学校场地默认大致位置——完整地址可申请。',
  'This exact address is hidden from the public listing.': '完整地址不会公开显示。',
  'Shown on the listing as "Yishun area" so players know the general location.':
    '以"区域"形式显示，让玩家了解大致位置。',
  'JPG / PNG / WebP · max 5 MB each': 'JPG / PNG / WebP · 每张最大 5 MB',
  'Space Name':             '场地名称',
  'Full Address (shown publicly)': '完整地址（公开显示）',
  'Full Address (kept private)':   '完整地址（保密）',
  'Public Area Label':      '公开区域标签',
  'Price / hr (0 = Free)':  '价格/小时（0=免费）',
  'Max Capacity':           '最大人数',
  'Pricing Model':          '收费模式',
  '$/hr (whole space)':     '$/小时（整个场地）',
  '$/person/hr':            '$/人/小时',
  'Opening / Available Hours': '开放时间',
  'Photos':                 '场地照片',
  'Add Photo':              '添加图片',
  'Uploading photos…':      '正在上传图片…',
  'Set as Cover':           '设为封面',
  'Cover':                  '封面',
  'Description':            '描述',
  'Describe the space...':  '描述场地...',
  'Saved!':                 '已保存!',
  'Save Changes':           '保存更改',

  // ── Game Spaces ───────────────────────────────────────────────────
  'Game Spaces':        '游戏场地',
  'Add Space':          '添加场地',
  'Add a Space':        '添加场地',
  'Limit Reached':      '已达上限',
  'My Spaces':          '我的场地',
  'All Spaces':         '全部场地',
  'No spaces match':    '没有匹配的场地',
  'Clear search':       '清除搜索',
  'Verified Space':     '认证场地',
  'Edit Space':         '编辑场地',
  'Report Space':       '举报场地',
  'Subscribe':          '订阅',
  'Subscribed':         '已订阅',
  'Unsubscribe':        '取消订阅',
  'Free':               '免费',
  'used':               '已用',
  'spaces':             '个场地',
  'Unlimited (Admin)':  '无限制（管理员）',
  'person/hr':          '人/小时',
  'Discover the best places to hunt in Singapore.':
                        '发现新加坡最好的狼人杀场地。',

  // ── Lobby / Event detail ─────────────────────────────────────────
  'Joined':             '已加入',
  'Pending Approval':   '等待审批',
  'Event Full':         '活动已满',
  'Apply to Join':      '申请加入',

  // ── Booking modal ─────────────────────────────────────────────────
  'Book Now':           '立即预约',
  'Date':               '日期',
  'Start Time':         '开始时间',
  'Duration':           '时长',
  'No. of Pax':         '人数',
  'Estimated cost':     '预计费用',
  'Your Name':          '你的姓名',
  'Contact':            '联系方式',
  'Notes':              '备注',
  'Send Enquiry':       '发送询问',
  'Done':               '完成',
  'hr':                 '小时',
  'hrs':                '小时',
  'e.g. Alex Tan':      '例：张三',
  'Phone or email':     '手机号或邮箱',
  'Special requests, setup needs...': '特殊要求、场地需求...',
  '(optional)':         '（可选）',

  // ── Contact Settings modal ────────────────────────────────────────
  'Contact Settings':   '联系方式设置',
  'Email Address':      '电子邮件',
  'Phone Number':       '手机号码',
  'Enter your email':   '输入邮箱',
  'Enter your phone number': '输入手机号',

  // ── Host Control Panel tabs ───────────────────────────────────────
  'Info':               '信息',
  'Roster':             '名单',
  'Manage':             '管理',
  'Attendance':         '考勤',
  'Danger':             '危险',

  // ── Create Space Modal ────────────────────────────────────────────
  'List Your Space':    '发布场地',
  'Create Your Space':  '创建场地',
  'Add a new venue for Werewolf games': '添加新的狼人杀场地',
  'Venue Name':         '场地名称',
  'Full Address':       '完整地址',
  'Venue Type':         '场地类型',
  'house':              '住宅',
  'work':               '办公室',
  'school':             '学校',
  'boardgame_store':    '桌游店',
  'other':              '其他',
  'Venue Image':        '场地图片',
  'Click to upload':    '点击上传',
  'or drag and drop':   '或拖拽上传',
  'PNG, JPG up to 5MB': 'PNG, JPG 最大5MB',
  'image selected':     '张图片已选择',
  'images selected':    '张图片已选择',
  'No images selected yet': '尚未选择图片',
  'Remove image':       '移除图片',
  'Contact for Verification': '验证联系方式',
  'Phone number or email': '手机号或邮箱',
  'Submit for verification': '提交验证',
  'Submit':             '提交',
  'Submitting…':        '提交中…',
  'Locating address…':  '正在定位地址…',
  'Uploading images…':  '正在上传图片…',
  'Creating venue…':    '正在创建场地…',
  'Venue name must be at least 3 characters.': '场地名称至少需要3个字符。',
  'Please enter a full address.': '请输入完整地址。',
  'Failed to create venue. Please try again.': '创建场地失败，请重试。',
  'Search name, area, amenities…': '搜索名称、区域、设施…',
  'Enter venue name...': '输入场地名称...',

  // ── Venue detail ──────────────────────────────────────────────────
  'About this Place':                       '关于此地',
  'House Rules':                            '场地规则',
  'Amenities':                              '设施',
  'Pending Approvals':                      '待确认',
  'Coming Events':                          '即将举行',
  'Event History':                          '活动历史',
  'Back to Directory':                      '返回列表',
  'Directions':                             '导航',
  'Book a Session':                         '预约场地',
  'Join':                                   '加入',
  'OPEN':                                   '开放中',
  'FULL':                                   '已满',
  'Finished':                               '已结束',
  'RECRUITING':                             '招募中',
  'No upcoming events scheduled here yet.': '暂无即将举行的活动。',
  'No past events recorded here.':          '暂无历史活动记录。',
  'No events have been held here yet.':     '还没有活动在此举办过。',

  // ── Game Map ──────────────────────────────────────────────────────
  'Venues':           '场地',
  'Events':           '活动',
  'Join Game':        '加入游戏',
  'Game Time':        '游戏时间',
  'Location':         '位置',
  'Report Submitted': '举报已提交',
  'Google Maps':      '谷歌地图',

  // ── Attendance status ─────────────────────────────────────────────
  'attended':    '已出席',
  'no-show':     '爽约',
  'cancelled':   '已取消',
  'registered':  '已报名',

  // ── Host Control Panel content ────────────────────────────────────────
  'Host Control':             '主办控制',
  'Event Title':              '活动标题',
  'Time':                     '时间',
  'Max Pax':                  '最大人数',
  'Proficiency':              '水平',
  'Social Group Link':        '社群链接',
  'joined players only':      '仅限已加入玩家',
  'Select a platform above to add a group invite link.': '选择上方平台添加群组邀请链接。',
  'Hide QR':                  '隐藏二维码',
  'Preview QR':               '预览二维码',
  'Add special rules or notes for players…': '添加特别规则或玩家备注…',
  'Title is required.':       '标题不能为空。',
  'Date and time are required.': '日期和时间不能为空。',
  // Roster tab
  'Guests':                   '访客',
  'None added':               '尚无访客',
  'Name…':                    '姓名…',
  'Add':                      '添加',
  'Awaiting Approval':        '等待审批',
  'Players':                  '玩家',
  'Search player…':           '搜索玩家…',
  'No player matches that name.': '没有匹配该名字的玩家。',
  'No registered players yet.': '暂无已报名玩家。',
  'Accept':                   '接受',
  'Decline':                  '拒绝',
  'Message':                  '私信',
  'Removing':                 '踢出',
  'deducts −0.5 credit':      '将被扣除 −0.5 信用分',
  'Type your message…':       '输入你的消息…',
  'Send':                     '发送',
  '✓ Sent!':                  '✓ 已发送!',
  'Sending…':                 '发送中…',
  'Reason for removal (required)…': '踢出原因（必填）…',
  'Confirm Remove':           '确认踢出',
  'Removing…':                '踢出中…',
  'players on waitlist':      '名玩家在等候',
  'Promoted automatically when a spot opens.': '有位置空出时自动晋级。',
  // Manage tab
  'Entry Mode':               '加入模式',
  'Open':                     '开放',
  'Approval':                 '审批',
  'Invite Only':              '仅限邀请',
  'Anyone can join instantly': '任何人均可立即加入',
  'You review each join request': '你需审批每条加入申请',
  'You invite players directly': '你直接邀请玩家',
  'Session Status':           '游戏状态',
  'Playing':                  '游戏中',
  'New join requests appear in the Roster tab for your approval.': '新的加入申请将出现在名单栏供你审批。',
  'Event is hidden from public listing. Only you can see it in My Events.': '活动不公开显示，仅你可在我的活动中看到。',
  'Session is live. Players can no longer join or leave.': '游戏进行中，玩家无法加入或离开。',
  'Session closed. Head to the Attendance tab to mark results.': '游戏已结束，前往考勤栏标记结果。',
  'Event Info':               '活动信息',
  'Venue':                    '场地',
  'Venue Approval':           '场地审批',
  'Confirmed':                '已确认',
  'Pending':                  '待确认',
  // Attendance tab
  'No players to mark attendance for.': '暂无需要标记考勤的玩家。',
  'Select all:':              '全选：',
  'All Attended':             '全部出席',
  'All No-show':              '全部爽约',
  'Clear':                    '清除',
  'Attended':                 '出席',
  'No-show':                  '爽约',
  // Danger tab
  'Danger Zone':              '危险操作区',
  'These actions are irreversible. All registered players will be notified and removed.': '此操作不可逆，所有已报名玩家将被通知并移除。',
  'Cancel This Event':        '取消此活动',
  'registered players will be removed.': '名已报名玩家将被移除。',
  'Your credit:':             '你的信用分：',
  'No credit penalty':        '无信用分扣除',
  '−0.5 credit (3–4 players affected)': '−0.5 信用分（3–4名玩家受影响）',
  '−1 credit (5–8 players affected)':   '−1 信用分（5–8名玩家受影响）',
  '−1.5 credit (9+ players affected)':  '−1.5 信用分（9+名玩家受影响）',
  'Keep Event':               '保留活动',
  'Yes, Cancel':              '确认取消',
  'Cancelling…':              '取消中…',
  // Save button states
  'Saving…':                  '保存中…',
  'Auto-saved':               '自动保存',

  // ── Common ────────────────────────────────────────────────────────
  'Welcome back,': '欢迎回来，',
  'Guest View':    '访客模式',
  'Save':          '保存',
};

export function t(key: string, lang: Lang): string {
  if (lang === 'en') return key;
  return zh[key] ?? key;
}

const ZH_WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function formatEventDate(dateStr: string, lang: Lang): { dayNum: number; month: string; fullString: string } {
  const date = new Date(dateStr);
  const dayNum = date.getDate();
  if (lang === 'zh') {
    const mo = date.getMonth() + 1;
    const wd = ZH_WEEKDAYS[date.getDay()];
    const h24 = date.getHours();
    const min = date.getMinutes().toString().padStart(2, '0');
    const ampm = h24 >= 12 ? '下午' : '上午';
    const h12 = h24 % 12 || 12;
    return { dayNum, month: `${mo}月`, fullString: `${mo}月${dayNum}日 ${wd} ${ampm}${h12}:${min}` };
  }
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { dayNum, month, fullString: `${dayNum} ${month} ${time}, ${dayName}` };
}

export function formatShortDate(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr);
  if (lang === 'zh') {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
