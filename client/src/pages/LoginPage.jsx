import { useState, useEffect } from "react";
import { Input, Button } from "antd-mobile";

export default function LoginPage({ onConnect, connected }) {
  const [name, setName] = useState("");

  useEffect(() => {
    const hisName = localStorage.getItem("playerName");
    if (hisName) {
      setName(hisName);
    }
  }, []);

  const handleConnect = () => {
    const finalName = name.trim() || `玩家${Math.floor(Math.random() * 1000)}`;
    onConnect(finalName);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <div className="logo-tiles">
            <span className="logo-tile" style={{ background: "#e74c3c" }}>
              5
            </span>
            <span className="logo-tile" style={{ background: "#27ae60" }}>
              3
            </span>
            <span className="logo-tile" style={{ background: "#3498db" }}>
              7
            </span>
            <span className="logo-tile" style={{ background: "#e67e22" }}>
              1
            </span>
            <span className="logo-tile" style={{ background: "#9b59b6" }}>
              4
            </span>
          </div>
        </div>
        <h1 className="login-title">五猜缤纷</h1>
        <p className="login-subtitle">Got Five!</p>
        <p className="login-desc">2-4人 · 逻辑推理 · 在线桌游</p>
        <div className="login-input-wrapper">
          <Input
            placeholder="输入你的昵称"
            value={name}
            onChange={(val) => {
              setName(val);
              localStorage.setItem("playerName", val);
            }}
            maxLength={12}
            clearable
            className="login-input"
          />
        </div>
        <Button
          block
          color="primary"
          size="large"
          onClick={handleConnect}
          className="login-btn"
        >
          {connected ? "已连接" : "进入游戏"}
        </Button>
        <div className="login-rules">
          <p>游戏规则：</p>
          <p>· 每位玩家有5个彩色数字方块，自己看不到，别人能看到</p>
          <p>· 轮流抽牌并提问，收集线索推理自己的数字</p>
          <p>· 率先猜对全部5个数字并喊出"Got Five!"者获胜</p>
        </div>
      </div>
    </div>
  );
}
