/*global chrome*/
import React, { useEffect, useState } from 'react'
import { createRoot } from "react-dom/client"
import PopModal from './components/PopModal'
import './antd-diy.css'
import './content.scss'
import { switchTime, formatTime } from "@/common/utils"

let searchInfo = {}
let flag = true // 作为对触发后续函数的记录(只触发一次)
let data = []
let timer = null


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    searchInfo = request.searchInfo
    console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
    console.log("收到background的信息:searchInfo", searchInfo);
    if (!!searchInfo && flag) {
        // flag = true
        if (window.confirm("确定要获取本页面的数据吗")) {
            console.log("触发数据获取的函数");
            getData(searchInfo.hours)
            flag = false
        }
    }
    // sendResponse('content script 收到了 background 页面的消息！');
    return true;
});

// time: 需要获取数据的时长
function getData(time) {
    const stopTimeStamp = new Date().getTime() - time * 60 * 60 * 1000  // 当前时间 - 需要获取的时间 (作为触发点)
    console.log(stopTimeStamp, formatTime(stopTimeStamp));

    let downLoadData = windowScroll(stopTimeStamp, getTwitter) || "" // 返回值为获取到的数据,
    chrome.runtime.sendMessage({
        type: "parseLabels",
        data: downLoadData
    }, function (response) { });


    // 1. 屏幕开始滚动
    // 2. 滚动到合适的时间就开始调用获取数据的函数





    // 控制窗口滚动
    function windowScroll(stopTimeStamp, func) {
        // 1. 进入目标页面之后
        // 2. 获取当前所显示内容的所有time 找到最前面的time对比与上一次截止时间戳(浏览器缓存/直接当前时间戳-10min)
        // 3. 对比一次屏幕就滚动一段长度 如果一直对比到如果某个时间小于了这个时间戳就停止滚动 再开始执行后续的爬取

        clearTimeout(timer)
        function scrollAgain() {
            console.log("开始获取时间节点");
            let ifScroll = true
            const Time = Array.from(document.querySelectorAll("time"))

            // 不做判断的话会陷入死循环
            // 11.16这里出现了一个bug: 单独单开某个页面不会出现,但是执行整个流程的时候其中有一个页面会出现死循环(无限滚动)
            // 问题2: 一旦开始执行第一次之后一定能获取到数据 但是页面并没有加载 还是会死循环 一旦数据量变大涉及到页面滚动这里都会有问题
            // 问题关键点在于: 页面滚动没有执行语句速度快
            // 解决: 增加延时器等待页面滚动的产生


            // 如果本次获取到的和上次是一样的

            if (Time.length) {
                // Time.forEach(time => {
                //     const itemTimeStamp = new Date(time.dateTime).getTime()

                //     // 如果出现了在当前时间戳之前的 (说明可以不用再滚动了)
                //     // 这里的判断可能会有误 因为可能会出现获取到的time内容是广告/转发内容的时间,就不是当前latest下面最新发布的时间了
                //     console.log("开始判断是否滚动");
                //     console.log(time, itemTimeStamp < stopTimeStamp, formatTime(itemTimeStamp), formatTime(stopTimeStamp));
                //     if (itemTimeStamp < stopTimeStamp) {
                //         console.log("不用滚动了");
                //         ifScroll = false
                //     }
                // })


                // 问题的临时解决方法: 每次只对比最后一个time节点, 但是这样有可能会在最后一个正好命中广告 / 转发的内容(小概率)
                // 后来发现碰到的概率还挺大的 那就对比这个和前面两个节点 如果都小于就不滚 否则还是滚一次
                console.log("开始本轮判断");
                const itemTimeStamp1 = new Date(Time[Time.length - 1].dateTime).getTime()
                const itemTimeStamp2 = new Date(Time[Time.length - 2].dateTime).getTime()
                console.log(Time[Time.length - 1], Time[Time.length - 2], formatTime(itemTimeStamp1), formatTime(itemTimeStamp2), formatTime(stopTimeStamp));
                if (itemTimeStamp1 < stopTimeStamp && itemTimeStamp2 < stopTimeStamp) {
                    console.log("不用滚动了");
                    ifScroll = false
                }


                if (ifScroll) {
                    console.log("滚动+再执行一次");
                    window.scrollBy(0, window.innerHeight * 3)

                    clearTimeout(timer)
                    timer = setTimeout(function () {
                        scrollAgain()
                    }, [3000])

                } else {
                    // 如果滚动到合适的内容就可以开始获取数据了
                    return func(stopTimeStamp)
                    // return null
                }
            } else {
                // 如果没有获取到内容说明也没还没加载出来(再等待一会人重新执行滚动)
                console.log("没有获取到内容 页面加载有问题");

                clearTimeout(timer)
                timer = setTimeout(function () {
                    scrollAgain()
                }, [4000])
            }
        }


        // 这里需要设置延时器等待屏幕加载
        timer = setTimeout(function () {
            scrollAgain()
        }, [4000])
    }

    // 获取Twitter数据
    function getTwitter(stopTimeStamp) {

        let queryWhole = "article"
        let queryTime = "time"
        let queryContent = ".css-901oao.r-18jsvk2.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-bnwqim.r-qvutc0 span"
        let queryUser = "a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-1loqt21.r-1wbh5a2.r-dnmrzs.r-1ny4l3l"
        let queryInteract = ".css-1dbjc4n.r-1ta3fxp.r-18u37iz.r-1wtj0ep.r-1s2bzr4.r-1mdbhws"
        let articles = Array.from(document.querySelectorAll(queryWhole))

        console.log(articles);
        articles.forEach((item, index) => {
            let content = ""
            Array.from(item.querySelectorAll(queryContent)).forEach(oneContent => {
                content += oneContent.textContent
            })
            const timeNode = Array.from(item.querySelectorAll(queryTime))[0]

            // articles中获取不到时间的为广告
            if (timeNode) {
                // console.log("article", item);
                // console.log("time", timeNode, timeNode.dateTime);
                // console.log("articleURL", timeNode.parentNode.href);
                // console.log("content", content);
                // console.log("user", Array.from(item.querySelectorAll(queryUser))[0] || "");
                // console.log("replayNum", Array.from(item.querySelectorAll(queryInteract))[0]?.ariaLabel);

                let replayNum = 0
                let retweetNum = 0
                let likeNum = 0
                const interactNums = Array.from(item.querySelectorAll(queryInteract))[0]?.ariaLabel.split(",")
                if (interactNums?.length) { // 有可能存在评论点赞转发都没有的情况
                    interactNums.forEach((item) => {
                        if (item.includes("replies")) {
                            replayNum = Number(item.match(/\d+/g)[0])
                        }
                        if (item.includes("Retweets")) {
                            retweetNum = Number(item.match(/\d+/g)[0])
                        }
                        if (item.includes("likes")) {
                            likeNum = Number(item.match(/\d+/g)[0])
                        }
                    })
                    // console.log(replayNum, retweetNum, likeNum);
                }


                const obj = {
                    timeStamp: new Date(timeNode.dateTime).getTime(),
                    time: formatTime(new Date(timeNode.dateTime).getTime()),
                    articleURL: timeNode.parentNode.href,
                    content,
                    user: Array.from(item.querySelectorAll(queryUser))[0]?.href,
                    replayNum,
                    retweetNum,
                    likeNum,
                }
                data.push(obj)
            }

        })


        console.log(data);
        // return data
        // displayData = data // 测试

        // 对data做一下筛选: 只保存十分钟之前到现在的内容
        let filteredData = []

        data.forEach(item => {
            const itemTimeStamp = item.timeStamp
            console.log(formatTime(itemTimeStamp), "|", formatTime(stopTimeStamp));
            if (itemTimeStamp > stopTimeStamp) {
                // 在这个stopTimeStamp之内就筛选出来
                filteredData.push(item)
            }
        })
        console.log("筛选之后的数据filteredData", filteredData);

        return filteredData
    }

}


function Content() {

    return (<div className="CRX-content">
        {/* <div
            className="content-entry CRX-antd-diy"
            onClick={() => {
                setMainModalVisiable(true)
            }}
        ></div>
        {mainModalVisiable ? (
            <PopModal
                displayData={displayData}
                onClose={() => {
                    setMainModalVisiable(false)
                }}
            />
        ) : null} */}
    </div>)
}


// 创建id为CRX-container的div
const app = document.createElement('div')
app.id = 'CRX-container'
// 将刚创建的div插入body最后
document.body.appendChild(app)
// 将ReactDOM插入刚创建的div
const container = createRoot(app)
container.render(<Content />)


// let flag = false
// let dataInfo = {}
// let displayData = []
// urlList.forEach(item => {
//     if (item.url === window.location.href) {
//         flag = true
//         dataInfo = item
//     }
// })



// function Content() {
//     const [mainModalVisiable, setMainModalVisiable] = useState(false)

//     // Start:打开urlList中存在页面执行
//     if (flag) {
//         let data = []
//         let timer = null

//         const lastTimeStamp = new Date().getTime() - 600000 - 60000 // 10min之前的时间戳 (作为触发点)
//         console.log(lastTimeStamp, formatTime(lastTimeStamp));


        // const getTwitter = () => {

        //     let queryWhole = "article"
        //     let queryTime = "time"
        //     let queryContent = ".css-901oao.r-18jsvk2.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-bnwqim.r-qvutc0 span"
        //     let queryUser = "a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-1loqt21.r-1wbh5a2.r-dnmrzs.r-1ny4l3l"
        //     let queryInteract = ".css-1dbjc4n.r-1ta3fxp.r-18u37iz.r-1wtj0ep.r-1s2bzr4.r-1mdbhws"
        //     let articles = Array.from(document.querySelectorAll(queryWhole))

        //     console.log(articles);
        //     articles.forEach((item, index) => {
        //         let content = ""
        //         Array.from(item.querySelectorAll(queryContent)).forEach(oneContent => {
        //             content += oneContent.textContent
        //         })
        //         const timeNode = Array.from(item.querySelectorAll(queryTime))[0]

        //         // articles中获取不到时间的为广告
        //         if (timeNode) {
        //             // console.log("article", item);
        //             // console.log("time", timeNode, timeNode.dateTime);
        //             // console.log("articleURL", timeNode.parentNode.href);
        //             // console.log("content", content);
        //             // console.log("user", Array.from(item.querySelectorAll(queryUser))[0] || "");
        //             // console.log("replayNum", Array.from(item.querySelectorAll(queryInteract))[0]?.ariaLabel);

        //             let replayNum = 0
        //             let retweetNum = 0
        //             let likeNum = 0
        //             const interactNums = Array.from(item.querySelectorAll(queryInteract))[0]?.ariaLabel.split(",")
        //             if (interactNums?.length) { // 有可能存在评论点赞转发都没有的情况
        //                 interactNums.forEach((item) => {
        //                     if (item.includes("replies")) {
        //                         replayNum = Number(item.match(/\d+/g)[0])
        //                     }
        //                     if (item.includes("Retweets")) {
        //                         retweetNum = Number(item.match(/\d+/g)[0])
        //                     }
        //                     if (item.includes("likes")) {
        //                         likeNum = Number(item.match(/\d+/g)[0])
        //                     }
        //                 })
        //                 // console.log(replayNum, retweetNum, likeNum);
        //             }


        //             const obj = {
        //                 time: timeNode.dateTime,
        //                 articleURL: timeNode.parentNode.href,
        //                 content,
        //                 user: Array.from(item.querySelectorAll(queryUser))[0]?.href,
        //                 replayNum,
        //                 retweetNum,
        //                 likeNum,
        //             }
        //             data.push(obj)
        //         }

        //     })


        //     console.log(data);
        //     // return data
        //     // displayData = data // 测试

        //     // 对data做一下筛选: 只保存十分钟之前到现在的内容
        //     let filteredData = []

        //     data.forEach(item => {
        //         const itemTimeStamp = new Date(item.time).getTime()
        //         // console.log(formatTime(itemTimeStamp), "|", formatTime(lastTimeStamp));
        //         if (itemTimeStamp > lastTimeStamp) {
        //             // 在这10分钟之内的内容就上传
        //             filteredData.push(item)
        //         }
        //     })
        //     console.log("筛选之后的数据filteredData", filteredData);

        //     return filteredData
        // }



//         const windowScroll = () => {
//             // 1. 进入目标页面之后
//             // 2. 获取当前所显示内容的所有time 找到最前面的time对比与上一次截止时间戳(浏览器缓存/直接当前时间戳-10min)
//             // 3. 对比一次屏幕就滚动一段长度 如果一直对比到如果某个时间小于了这个时间戳就停止滚动 再开始执行后续的爬取
//             clearTimeout(timer)

//             function scrollAgain() {

//                 console.log("开始判断是否滚动");
//                 let ifScroll = true
//                 // 这里我都采用以中国标准时间为准
//                 const Time = Array.from(document.querySelectorAll("time"))

//                 // 不做判断的话会陷入死循环
//                 if (Time.length) {
//                     Time.forEach(time => {
//                         const itemTimeStamp = new Date(time.dateTime).getTime()

//                         // 11.16这里出现了一个bug: 单独单开某个页面不会出现,但是执行整个流程的时候其中有一个页面会出现死循环(无限滚动)

//                         // 如果出现了在当前时间戳之前的 (说明可以不用再滚动了)
//                         if (itemTimeStamp < lastTimeStamp) {
//                             console.log("不用滚动了");
//                             ifScroll = false
//                         }
//                     })
//                     if (ifScroll) {
//                         console.log("滚动+再执行一次");
//                         window.scrollBy(0, window.innerHeight * 3)
//                         scrollAgain()
//                     } else {
//                         // 如果滚动到合适的内容就可以开始获取数据了
//                         getStart()
//                         return null
//                     }
//                 } else {
//                     // 如果没有获取到内容说明也没还没加载出来(再等待一会人重新执行滚动)
//                     console.log("没有获取到内容 页面加载有问题");

//                     clearTimeout(timer)
//                     timer = setTimeout(function () {
//                         scrollAgain()
//                     }, [4000])
//                 }
//             }


//             // 这里需要设置延时器等待屏幕加载
//             timer = setTimeout(function () {
//                 scrollAgain()
//             }, [4000])

//         }

//         // 内容上传
//         function downloadFile(content, dataInfo) {
//             const { type, keywords } = dataInfo
//             const time = switchTime(new Date().getTime())
//             const filename = `${type}_${keywords}_${time}.json`
//             const downloadContent = JSON.stringify(content)

//             var file = new File([downloadContent], filename, { type: "text/json;charset=UTF-8", })
//             if (content.result) {
//                 console.log("准备上传:", file);
//                 // console.log(content);
//                 uploadFile(file)
//             } else {
//                 console.log("这10min内没有更新的数据");
//             }
//         }


    //     const getStart = () => {
    //         const data = getTwitter()
    //         const content = {
    //             result: data.length,
    //             time: formatTime(new Date().getTime()),
    //             task: dataInfo.type + "_" + dataInfo.keywords,
    //             data: data
    //         }
    //         downloadFile(content, dataInfo)
    //         // 等到确认内容发送成功后 => 发送到background⾥去

    //         setTimeout(function () {
    //             chrome.runtime.sendMessage({
    //                 type: "parseLabels",
    //                 data: data,
    //                 dataInfo: dataInfo,
    //                 content: content
    //             }, function (response) {
    //                 displayData = response.data
    //                 // console.log(displayData);
    //                 setMainModalVisiable(true)
    //                 flag = false
    //             });
    //         }, [2000])
    //     }
    //     windowScroll()
    // }
//     // End:打开urlList中存在页面执行

//     return (
//         <div className="CRX-content">
//             {/* <div
//                 className="content-entry CRX-antd-diy"
//                 onClick={() => {
//                     setMainModalVisiable(true)
//                 }}
//             ></div>
//             {mainModalVisiable ? (
//                 <PopModal
//                     displayData={displayData}
//                     onClose={() => {
//                         setMainModalVisiable(false)
//                     }}
//                 />
//             ) : null} */}
//         </div>
//     )
// }

// // 创建id为CRX-container的div
// const app = document.createElement('div')
// app.id = 'CRX-container'
// // 将刚创建的div插入body最后
// document.body.appendChild(app)
// // 将ReactDOM插入刚创建的div
// const container = createRoot(app)
// container.render(<Content />)

