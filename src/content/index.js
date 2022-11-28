/*global chrome*/
import React, { useEffect, useState } from 'react'
import { createRoot } from "react-dom/client"
import PopModal from './components/PopModal'
import './antd-diy.css'
import './content.scss'
import { switchTime, formatTime } from "@/common/utils"

let searchInfo = {}
let flag = true; // 作为对触发后续函数的记录(只触发一次)
let resultData = []
let timer = null


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // 用flag记录:只接受一次background的信息
    console.log(flag);
    if (flag) {
        searchInfo = request.searchInfo
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
        console.log("收到background的信息:searchInfo", searchInfo);

        flag = false
        if (window.confirm("确定要获取本页面的数据吗")) {
            // console.log("触发数据获取的函数");
            getData(searchInfo.hours)
        } else {
            // 这里只能传到background里面去关闭
            // chrome.tabs.remove(searchInfo.searchUrl, function () { });
        }

        // sendResponse('content script 收到了 background 页面的消息！');
    }
    // return true
});


// time: 需要获取数据的时长
function getData(time) {
    const stopTimeStamp = new Date().getTime() - time * 60 * 60 * 1000  // 当前时间 - 需要获取的时间 (作为触发点)
    console.log(stopTimeStamp, formatTime(stopTimeStamp));
    searchInfo.timeQuantum = `${formatTime(new Date().getTime())} - ${formatTime(stopTimeStamp)}`

    // let downLoadData = filterData(removeTheSame(windowScroll(stopTimeStamp, getTwitter)), stopTimeStamp)  // 返回值为获取到的数据,
    windowScroll(stopTimeStamp, getTwitter)


    // 控制窗口滚动
    function windowScroll(stopTimeStamp, getDataFunction) {

        // console.log("scroll");

        clearTimeout(timer)
        function scrollAgain() {
            // console.log("开始获取时间节点");
            let ifScroll = true
            const Time = Array.from(document.querySelectorAll("time"))

            // 11.16这里出现了一个bug: 单独单开某个页面不会出现,但是执行整个流程的时候其中有一个页面会出现死循环(无限滚动)
            // 问题2: 一旦开始执行第一次之后一定能获取到数据 但是页面并没有加载 还是会死循环 一旦数据量变大涉及到页面滚动这里都会有问题
            // 问题关键点在于: 页面滚动没有执行语句速度快
            // 解决: 增加延时器等待页面滚动的产生

            // 等待页面有内容了才开始循环,不做判断的话会陷入死循环
            if (Time.length) {
                // 问题的临时解决方法: 每次只对比最后一个time节点, 但是这样有可能会在最后一个正好命中广告 / 转发的内容(小概率)
                // 后来发现碰到的概率还挺大的 那就对比这个和前面两个节点 如果都小于就不滚 否则还是滚一次
                // console.log("开始本轮判断");
                const itemTimeStamp1 = new Date(Time[Time.length - 1].dateTime).getTime()
                const itemTimeStamp2 = new Date(Time[Time.length - 2].dateTime).getTime()
                // 页面滚动的种终止条件
                if (itemTimeStamp1 < stopTimeStamp && itemTimeStamp2 < stopTimeStamp) {
                    console.log(Time[Time.length - 1], Time[Time.length - 2], formatTime(itemTimeStamp1), formatTime(itemTimeStamp2), formatTime(stopTimeStamp));
                    console.log("不用滚动了");
                    ifScroll = false
                }


                if (ifScroll) {
                    // console.log("滚动+再执行一次");
                    window.scrollBy(0, window.innerHeight * 3)

                    // 隐藏bug:在网络不佳的时候可能会出现执行了滚动 但是页面不加载(网络问题) 但是内容一直重复获取的问题

                    clearTimeout(timer)
                    timer = setTimeout(function () {
                        getDataFunction()
                        scrollAgain()
                    }, [3000])
                } else {
                    // console.log("所有数据获取完毕,开始提交数据到background", resultData);
                    const downLoadData = filterData(removeTheSame(resultData), stopTimeStamp)
                    const downLoadFile = getDownLoadFile(downLoadData, searchInfo)

                    // 这一步必须等到所以内容获取完成后执行 之前放在上面就会有问题 因为有很多异步操作
                    chrome.runtime.sendMessage({
                        type: "parseLabels",
                        data: downLoadData, // 最终会下载的数据
                        downLoadFile  // 最终会下载的文件
                    }, function (response) {
                        console.log(response);
                    });
                    // return resultData
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
        // 第一次执行
        timer = setTimeout(function () {
            // console.log("first scroll");
            scrollAgain()
        }, [4000])

    }

    // 获取Twitter数据
    function getTwitter() {

        let queryWhole = "article"
        let queryTime = "time"
        let queryContent = ".css-901oao.r-18jsvk2.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-bnwqim.r-qvutc0 span"
        let queryUser = "a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-1loqt21.r-1wbh5a2.r-dnmrzs.r-1ny4l3l"
        let queryInteract = ".css-1dbjc4n.r-1ta3fxp.r-18u37iz.r-1wtj0ep.r-1s2bzr4.r-1mdbhws"
        let articles = Array.from(document.querySelectorAll(queryWhole))

        // console.log(articles);
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
                resultData.push(obj)
            }
        })

        // console.log(resultData);
        // return filterData(resultData)
        // return resultData
    }

    // 去掉重复项
    const removeTheSame = (oldData) => {
        let newArr = {}
        oldData.forEach(item => {
            newArr[item.articleURL] = item
        })
        console.log(Object.values(newArr));
        return Object.values(newArr)
    }

    // 筛选出stopTimeStamp时间后面的所有数据
    const filterData = (oldData, stopTimeStamp) => {
        // 对data做一下筛选: 只保存stopTimeStamp这个节点到现在的内容
        let filteredData = []
        oldData.forEach(item => {
            const itemTimeStamp = item.timeStamp
            // console.log(formatTime(itemTimeStamp), "|", formatTime(stopTimeStamp));
            if (itemTimeStamp > stopTimeStamp) {
                // 在这个stopTimeStamp之内就筛选出来
                filteredData.push(item)
            }
        })
        console.log("筛选之后的数据filteredData", filteredData);
        return filteredData
    }

    const getDownLoadFile = (content, dataInfo) => {
        const { hours, keywords, timeQuantum, searchUrl } = dataInfo
        const time = switchTime(new Date().getTime())
        const filename = `${keywords}_${hours}h_${time}.json`
        const downloadContent = JSON.stringify({
            searchUrl,
            searchTime: formatTime(new Date()),
            dataTimeQuantum: timeQuantum,
            data: content
        })
        // console.log(downloadContent);

        var blob = new Blob([downloadContent], { type: "text/json;charset=UTF-8" });
        var url = window.URL.createObjectURL(blob);
        return { url, filename }
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