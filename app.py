
from flask import Flask, render_template

app = Flask(__name__)

# 網站首頁
@app.route("/")
def home():
    return render_template("index.html")

# 每日一張牌
@app.route("/daily")
def daily():
    return "每日一張牌功能即將完成"

# 是非題占卜
@app.route("/yesno")
def yesno():
    return "是非題占卜功能即將完成"

# 三張牌占卜
@app.route("/three")
def three():
    return "三張牌占卜功能即將完成"

# 五張牌占卜
@app.route("/five")
def five():
    return "五張牌占卜功能即將完成"

if __name__ == "__main__":
    app.run(debug=True)
