
# 雷諾曼卡牌組合解讀系統

# 依據卡牌編號設定解讀傾向
POSITIVE = {1, 2, 9, 16, 17, 18, 24, 25, 30, 31, 33, 35}
CHALLENGING = {6, 7, 8, 10, 11, 14, 21, 23, 36}

# 特定雙牌組合
PAIR_MEANINGS = {
    frozenset((6, 31)): "原本模糊的情況逐漸明朗，困惑有機會獲得釐清。",
    frozenset((31, 33)): "積極的發展可能帶來突破，關鍵答案逐漸浮現。",
    frozenset((24, 25)): "情感與承諾相互連結，適合思考關係的長期發展。",
    frozenset((1, 27)): "重要消息可能透過文字、文件或通知傳達。",
    frozenset((21, 33)): "目前雖有阻礙，但仍可能找到解決問題的關鍵。",
    frozenset((34, 35)): "財務或資源的流動與長期穩定息息相關。",
    frozenset((7, 14)): "情況可能比表面複雜，建議謹慎觀察。",
    frozenset((16, 22)): "新的方向逐漸清晰，但仍需要做出選擇。",
    frozenset((18, 24)): "信任與情感支持可能是關係中的重要力量。",
    frozenset((5, 35)): "持續累積與穩定投入，有助於長期成長。",
}


def card_tone(card):
    """判斷卡牌在此簡化系統中的解讀傾向。"""
    number = card["number"]

    if number in POSITIVE:
        return "positive"

    if number in CHALLENGING:
        return "challenging"

    return "neutral"


def pair_reading(first, second):
    """解讀兩張相鄰卡牌。"""
    key = frozenset((first["number"], second["number"]))

    # 優先使用特定組合規則
    if key in PAIR_MEANINGS:
        return PAIR_MEANINGS[key]

    first_keyword = first["keywords"].split("、")[0]
    second_keyword = second["keywords"].split("、")[0]

    first_tone = card_tone(first)
    second_tone = card_tone(second)

    if first_tone == "challenging" and second_tone == "positive":
        return (
            f"從「{first_keyword}」走向「{second_keyword}」，"
            "暗示困難中可能逐漸出現轉機。"
        )

    if first_tone == "positive" and second_tone == "challenging":
        return (
            f"「{first_keyword}」與「{second_keyword}」同時出現，"
            "提醒你在有利條件下，仍需注意潛在阻礙。"
        )

    if first_tone == "positive" and second_tone == "positive":
        return (
            f"「{first_keyword}」與「{second_keyword}」彼此呼應，"
            "代表兩項有利因素可能相互支持。"
        )

    if first_tone == "challenging" and second_tone == "challenging":
        return (
            f"「{first_keyword}」與「{second_keyword}」相互影響，"
            "顯示目前可能存在需要耐心處理的問題。"
        )

    return (
        f"「{first_keyword}」與「{second_keyword}」相互連結，"
        "建議觀察這兩項因素如何共同影響目前的情況。"
    )


def _keyword(card):
    return card["keywords"].split("、")[0]


def _position(card, position):
    tone = card_tone(card)
    focus = {"positive": "可運用的助力", "challenging": "需要留意的阻礙", "neutral": "值得釐清的因素"}[tone]
    return (f"{position}位置的「{card['name']}」象徵「{_keyword(card)}」，"
            f"在這個位置，它提示你關注{focus}。{card.get('detail', card['meaning'])}")


def _trend(cards):
    tones = [card_tone(c) for c in cards]
    plus, minus = tones.count("positive"), tones.count("challenging")
    if plus > minus:
        return "整組牌偏向出現助力，但好的可能性仍需要透過具體行動來實現。"
    if minus > plus:
        return "整組牌提醒你先處理現有壓力與限制，避免因急著求結果而忽略重要細節。"
    return "整組牌同時包含機會與不確定性，現階段比起急著下結論，更適合觀察變化並保留彈性。"


def three_card_reading(selected_cards):
    """過去／現在／未來：個別位置、相鄰關係、整體脈絡及建議。"""
    if not selected_cards or len(selected_cards) != 3:
        return None
    past, present, future = selected_cards
    first_pair = pair_reading(past, present)
    second_pair = pair_reading(present, future)
    summary = (f"從過去的「{_keyword(past)}」，到目前的「{_keyword(present)}」，"
               f"再走向未來的「{_keyword(future)}」，這組牌呈現出一段逐步轉變的過程。"
               f"過去與現在之間，{first_pair}現在與未來之間，{second_pair}"
               f"{_trend(selected_cards)}")
    advice = (f"先檢視「{past['name']}」所反映的既有背景，再從「{present['name']}」"
              f"所代表的「{_keyword(present)}」著手。面對「{future['name']}」"
              f"可能帶來的「{_keyword(future)}」，可以預先準備替代方案，"
              "並以現實資訊確認下一步，而不是將牌面當作必然結果。")
    return {
        "positions": [_position(past, "過去"), _position(present, "現在"), _position(future, "未來")],
        "past_present": first_pair, "present_future": second_pair,
        "summary": summary, "advice": advice,
    }


def five_card_reading(selected_cards):
    """起因／影響／核心／發展／結果：相鄰與鏡像交互分析。"""
    if not selected_cards or len(selected_cards) != 5:
        return None
    a, b, c, d, e = selected_cards
    left = pair_reading(b, c)
    right = pair_reading(c, d)
    outer = pair_reading(a, e)
    inner = pair_reading(b, d)
    return {
        "positions": [_position(card, label) for card, label in zip(selected_cards, ["起因", "影響", "核心", "發展", "結果"])],
        "core": (f"核心位置的「{c['name']}」將焦點放在「{_keyword(c)}」。"
                 f"它連結前方的「{b['name']}」與後方的「{d['name']}」，"
                 "可作為理解整個牌陣的主要線索。"),
        "neighbors": (f"「{b['name']}」與「{c['name']}」的關係：{left}"
                      f"接著，「{c['name']}」與「{d['name']}」的關係：{right}"
                      "這兩段關係分別對應當前受到的影響，以及後續可以留意的發展方向。"),
        "mirrors": (f"外側的「{a['name']}」與「{e['name']}」相互對照：{outer}"
                    f"內側的「{b['name']}」與「{d['name']}」相互對照：{inner}"
                    "鏡像牌可以協助比較事情的起點、過程與可能走向。"),
        "summary": (f"這組牌由「{a['name']}」開始，以「{c['name']}」為核心，"
                    f"最後走向「{e['name']}」。{_trend(selected_cards)}"
                    f"特別值得留意的是核心牌的「{_keyword(c)}」"
                    f"如何影響結果位置的「{_keyword(e)}」。"),
        "advice": (f"先處理「{b['name']}」提示的「{_keyword(b)}」問題，"
                   f"再圍繞核心牌「{c['name']}」規劃具體行動。"
                   f"若結果牌「{e['name']}」所代表的「{_keyword(e)}」不是你期待的方向，"
                   "可以調整做法、補足資訊，並持續觀察現實中的變化。"),
    }
