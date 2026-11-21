start cmd /k "cd client && npm run dev"
start cmd /k "cd server && node ./index.js"
@REM  通过 cloudflared 将本地端口映射到公网，需要提前安装 cloudflared 并登录
start cmd /k "cloudflared tunnel --url http://localhost:5173 "