/*global chrome*/
import { apiRequest } from '@/api'
import { switchTime } from "../common/utils"


let searchInfo = {}

// 侦听从⻚⾯发来的消息和数据
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        // Sender: An object containing information about the script context that sent a message or request.
        // https://developer.chrome.com/docs/extensions/reference/runtime/#type-MessageSender
        console.log(sender.tab ? "A message from a content script:" + sender.tab.url : "A message from the extension");
        // 点击【开始抓取】的时候，App.js传来的总的要抓取的⻚⾯列表，并将相关数据进⾏重置
        // 这一部分只会执行一次(在点击爬取按钮之后)
        if (request.type === "startScan") {
            searchInfo = request.searchInfo
            openTabs()
        } else if (request.type === "parseLabels") {
            console.log("本次上传的数据列表:", request.data);
            // 下载内容
            console.log("获取数据结束 开始下载");
            chrome.downloads.download({
                url: request.downLoadFile.url,
                filename: request.downLoadFile.filename
            })
            // closeTabs(request.dataInfo.url)
            return true;
        }
    }
);

// let timer = null
function openTabs() {
    const openUrl = searchInfo.searchUrl
    console.log("打开URL:", openUrl);
    chrome.tabs.create({ url: openUrl }, () => { })
    // 获取到刚刚打开的tab的id
    chrome.tabs.query({ url: openUrl }, function (tabs) {
        searchInfo.tabId = tabs[0].id
        // 这里是一个异步方法 只能这样传递否则获取不到值
        // console.log(searchInfo.tabId, "新打开页面的tabid");
    })
}

// 有tab活跃的时候触发(给tabId指定为刚刚默认打开的,否则每个tab页面都会收到相关的消息)
chrome.tabs.onUpdated.addListener((tab = searchInfo.tabId, changeInfo) => {
    // console.log(tab, searchInfo.tabId, "发送消息的tabId");
    // 如果活跃的是刚刚打开的这个tab
    if (tab === searchInfo.tabId) {
        console.log("开始发送信息 background => content");
        chrome.tabs.sendMessage(tab, { searchInfo }, (res) => {
            // background => content
            // console.log(res); // 收到content发来的res
        });
    }
});




function closeTabs(url) { // 3秒左右关闭
    const time = 4000 + Math.round(Math.random() * 3000)
    setTimeout(function () {
        chrome.tabs.query({ url: url }, function (tabs) {
            chrome.tabs.remove(tabs[0].id, function () { });
        })
    }, time)
}



// manifest.json的Permissions配置需添加 declarativeContent 权限
chrome.runtime.onInstalled.addListener(function () {
    // 默认先禁止Page Action。如果不加这一句，则无法生效下面的规则
    chrome.action.disable()
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        // 设置规则
        let rule = {
            // 运行插件运行的页面URL规则
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {
                        // 适配所有域名以“www.”开头的网页
                        // hostPrefix: 'www.'
                        // 适配所有域名以“.baidu.com”结尾的网页
                        // hostSuffix: '.baidu.com',
                        // 适配域名为“www.baidu.com”的网页
                        // hostEquals: 'www.baidu.com',
                        // 适配https协议的网页
                        schemes: ['https'],
                    },
                }),
            ],
            actions: [
                // ShowPageAction已被废弃，改用ShowAction。为了兼顾旧版，做了兼容适配
                chrome.declarativeContent.ShowAction
                    ? new chrome.declarativeContent.ShowAction()
                    : new chrome.declarativeContent.ShowPageAction(),
            ],
        }
        // 整合所有规则
        const rules = [rule]
        // 执行规则
        chrome.declarativeContent.onPageChanged.addRules(rules)
    })
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // 接受来自content-script的消息，requset里不允许传递function和file类型的参数
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        const { contentRequest } = request
        // 接收来自content的api请求
        if (contentRequest === 'apiRequest') {
            let { config } = request
            // API请求成功的回调
            config.success = (data) => {
                data.result = 'succ'
                sendResponse(data)
            }
            // API请求失败的回调
            config.fail = (msg) => {
                sendResponse({
                    result: 'fail',
                    msg
                })
            }
            // 发起请求
            apiRequest(config)
        }
    })
    return true
})