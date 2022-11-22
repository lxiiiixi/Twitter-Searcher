import React from 'react';
import { createRoot } from "react-dom/client"
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN'
import Popup from '@/popup'

const antdConfig = {
  locale: zhCN,
}

let app = createRoot(document.getElementById("root"));
app.render(<ConfigProvider {...antdConfig}>
  <Popup />
</ConfigProvider>)