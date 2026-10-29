from flask import Flask, render_template, request, session, abort
from card import cards, yesno_answers
from reading import three_card_reading, five_card_reading
import secrets
import random

app = Flask(__name__)
# 正式部署時請設定環境變數 FLASK_SECRET_KEY，避免每次重啟使抽牌階段失效
import os
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'local-demo-change-this-secret')


def draw_selection(route, count):
    # 進入頁面時先洗好一副牌，建立「卡背位置 -> 實際卡牌」的對應。
    if request.method == 'GET':
        deck = [card['number'] for card in cards]
        random.SystemRandom().shuffle(deck)
        session['deck_' + route] = deck
        return None
    deck = session.get('deck_' + route)
    if not isinstance(deck, list) or len(deck) != 36:
        abort(400, '抽牌階段已失效，請重新進入占卜頁面。')
    raw = request.form.get('selected_positions', '')
    try:
        indices = [int(s) for s in raw.split(',')]
    except (ValueError, TypeError):
        abort(400, '請先從卡牌扇形中選牌。')
    if len(indices) != count or len(set(indices)) != count or any(i < 0 or i >= 36 for i in indices):
        abort(400, '選牌數量不正確，請重新進入占卜頁面。')
    by_number = {card['number']: card for card in cards}
    selected = [by_number[deck[i]] for i in indices]
    session.pop('deck_' + route, None)  # 避免同一副牌重複提交
    return selected


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/daily', methods=['GET', 'POST'])
def daily():
    result = draw_selection('daily', 1)
    return render_template('daily.html', card=result[0] if result else None)


@app.route('/yesno', methods=['GET', 'POST'])
def yesno():
    question = request.form.get('question', '').strip() if request.method == 'POST' else ''
    if request.method == 'POST' and not question:
        abort(400, '請先輸入占卜問題。')
    result = draw_selection('yesno', 1)
    card = result[0] if result else None
    return render_template('yesno.html', card=card,
                           answer=yesno_answers[card['number']] if card else None,
                           question=question)


@app.route('/three', methods=['GET', 'POST'])
def three():
    selected = draw_selection('three', 3)
    return render_template('three.html', cards=selected,
                           reading=three_card_reading(selected) if selected else None)


@app.route('/five', methods=['GET', 'POST'])
def five():
    selected = draw_selection('five', 5)
    return render_template('five.html', cards=selected,
                           reading=five_card_reading(selected) if selected else None)


if __name__ == '__main__':
    app.run(debug=True, port=5001)
