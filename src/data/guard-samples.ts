/**
 * 聊天护航的演示对话：可以一条条推进，看风险曲线和骗局阶段怎么变化。
 * 内容根据公开反诈宣传整理，账号均为虚构占位。
 */
import type { GuardMessage } from "@/lib/guard";

export interface GuardSample {
  id: string;
  label: string;
  peer: string;
  desc: string;
  messages: GuardMessage[];
}

export const GUARD_SAMPLES: GuardSample[] = [
  {
    id: "refund",
    label: "网购理赔",
    peer: "购物平台售后客服",
    desc: "「客服」说要给你双倍理赔",
    messages: [
      { role: "them", text: "您好，我是购物平台售后客服，工号 9527。您上周买的儿童外套被检测出甲醛超标，平台给您办理双倍理赔。" },
      { role: "me", text: "真的吗？要怎么理赔？" },
      { role: "them", text: "理赔走的是专门通道，平台里不方便操作，您加一下我们理赔专员的微信，我把二维码发您。" },
      { role: "me", text: "好的，加了。" },
      { role: "them", text: "专员这边看到您的支付宝有备用金额度，理赔款会先打到备用金里，您打开备用金页面截图给我。" },
      { role: "me", text: "这个要收钱吗？" },
      { role: "them", text: "不收任何费用。为了方便指导，请您下载会议软件，开启屏幕共享，今天之内不处理，理赔通道就关闭了。" },
      { role: "them", text: "稍后您手机会收到一条验证码，把验证码报给我，理赔款马上到账。" },
    ],
  },
  {
    id: "shuadan",
    label: "刷单兼职",
    peer: "兼职客服·小雨",
    desc: "在家动动手指就能赚钱",
    messages: [
      { role: "them", text: "同学你好～看到你在群里找兼职，我们招线上点赞员，在家动动手指就能做，一单佣金 5～30 元，当天结算。" },
      { role: "me", text: "要怎么做？" },
      { role: "them", text: "很简单，帮商家点赞关注就行。第一单是体验单，做完马上返你 10 元佣金～" },
      { role: "me", text: "收到了，确实返了 10 块。" },
      { role: "them", text: "接下来是进阶任务，需要先垫付 200 元帮商家拍一单，完成后返本金再加 40 元佣金。" },
      { role: "them", text: "名额有限哦，今天不做就给别人了。下载我们的任务 App，在里面充值就能接单。" },
    ],
  },
  {
    id: "leader",
    label: "冒充领导",
    peer: "张总（新微信）",
    desc: "「领导」用新微信让你先垫钱",
    messages: [
      { role: "them", text: "小王，我是张总，这是我新的微信，原来那个号不用了。" },
      { role: "me", text: "张总好！" },
      { role: "them", text: "我在外面开会，不方便接电话。有个合作方的款今天必须付，你先帮我垫一下。" },
      { role: "me", text: "要多少？" },
      { role: "them", text: "5 万，转到这个账户：6222 xxxx xxxx 1234，回头我让财务给你报销。" },
      { role: "them", text: "这事先别跟财务和其他同事说，抓紧办，半小时内要到账。" },
    ],
  },
  {
    id: "normal",
    label: "正常聊天",
    peer: "老同学",
    desc: "对比看看，正常聊天不会乱报警",
    messages: [
      { role: "them", text: "在吗？周末同学聚会你来不来呀" },
      { role: "me", text: "来呀，几点？" },
      { role: "them", text: "周六中午 12 点，还是学校门口那家火锅店，记得把上次借你的那本书带来哈" },
      { role: "me", text: "好嘞，周六见！" },
    ],
  },
];
