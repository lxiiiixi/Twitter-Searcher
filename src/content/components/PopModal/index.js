import { useState } from 'react'
import { apiReqs } from '@/api'
// import { Button, Input, Modal, Select } from 'antd'
// 单独引入 避免加载Antd的全局reset样式
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Modal from 'antd/es/modal'
import Select from 'antd/es/select'
import 'antd/es/button/style/index.css'
import 'antd/es/input/style/index.css'
import 'antd/es/modal/style/index.css'
import 'antd/es/select/style/index.css'
import './PopModal.scss'


function PopModal(props) {
    // 接收父组件控制本组件关闭的方法
    const { onClose, displayData } = props

    return (
        <Modal
            className="CRX-mainModal CRX-antd-diy"
            visible={true}
            title={<div>本次将上传的数据数量为: {displayData.length}</div>}
            footer={null}
            maskClosable={false}
            onCancel={() => {
                onClose && onClose()
            }}
            width={600}
        >
            <div className="main-content-con">
                {displayData.length && displayData.map(item => {
                    return (
                        <div className="item-box">
                            <li> 发布时间: {item.user} </li>
                            <li> 发布用户: {item.user} </li>
                            <li> 推文内容: {item.content} </li>
                        </div>
                    )
                })}
            </div>
        </Modal>
    )
}

export default PopModal
