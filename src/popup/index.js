/*global chrome*/
import React from 'react';
import './popup.scss' // 作为popup所有页面的全局样式
import { Button, Input, Form } from 'antd'
// 在popup页面调试content script，仅用于开发环境，build前记得要注释掉
// import '@/content'


function Popup() {
    const [form] = Form.useForm()


    const onFinish = (searchInfo) => {
        console.log(searchInfo);
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
            <header className="App-header">
                <h1 className="App-title">Twitter Bot</h1>
            </header>
            <Form labelCol={{ span: 8 }} className="Form" form={form} onFinish={onFinish}>
                <Form.Item name="keywords" label="Keywords" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="hours" label="Hours" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <button className="niceButton" type='submit'>开始获取数据</button>
            </Form>
        </div >
    );
}



export default Popup