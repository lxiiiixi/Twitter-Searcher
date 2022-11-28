/*global chrome*/
import React from 'react';
import './popup.scss' // 作为popup所有页面的全局样式
import { Input, Form } from 'antd'
// 在popup页面调试content script，仅用于开发环境，build前记得要注释掉
// import '@/content'


function Popup() {
    const [form] = Form.useForm()


    const onFinish = (searchInfo) => {
        console.log(searchInfo);
        searchInfo.searchUrl = `https://twitter.com/search?q=${searchInfo.keywords}&src=recent_search_click&f=live`
        // pupop -> background script
        chrome.runtime.sendMessage({ type: "startScan", searchInfo }, function (response) {
            // 这里的response为什么不能接收!
        })
        // 问题:tabs[0].id是对于当前触发事件的页面来说 并不是向新打开的tab发送数据
        // chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        //     console.log(tabs);
        //     chrome.tabs.sendMessage(tabs[0].id, { type: "sendToContent", searchInfo }, function (response) {
        //         alert(response)
        //         console.log(response);
        //     });
        // });
    }

    return (
        <div className="App">
            {/* <header className="App-header">
                <h1 className="App-title">Twitter Bot</h1>
            </header> */}
            <Form labelCol={{ span: 8 }} className="Form" form={form} onFinish={onFinish}>
                <Form.Item name="keywords" label="Keywords" rules={[{ required: true, message: 'Please input a keyword!' }]}>
                    <Input placeholder="输入需要搜索的关键词" />
                </Form.Item>
                <Form.Item name="hours" label="Hours(H)" rules={[{ required: true, message: 'Please input a number!' }]}>
                    <Input placeholder="输入整数/小数" />
                </Form.Item>
                <button className="niceButton" type='submit'>开始获取数据</button>
            </Form>
        </div >
    );
}



export default Popup