import os
import sys
import json
import time
import queue
import socket
import random
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Default Preset Data
DEFAULT_TEAMS = [
    { "id": "team1", "name": "동수칸의 기사단", "captain": "한동숙", "points": 1000, "roster": { "top": None, "jungle": None, "mid": None, "adc": None, "support": None }, "isAi": False, "aiStyle": "balanced" },
    { "id": "team2", "name": "따효니의 백수단", "captain": "따효니", "points": 1000, "roster": { "top": None, "jungle": None, "mid": None, "adc": None, "support": None }, "isAi": False, "aiStyle": "balanced" },
    { "id": "team3", "name": "얍얍의 돌격대", "captain": "얍얍", "points": 1000, "roster": { "top": None, "jungle": None, "mid": None, "adc": None, "support": None }, "isAi": False, "aiStyle": "balanced" },
    { "id": "team4", "name": "삼식의 상점가", "captain": "삼식", "points": 1000, "roster": { "top": None, "jungle": None, "mid": None, "adc": None, "support": None }, "isAi": False, "aiStyle": "balanced" },
    { "id": "team5", "name": "룩삼의 레지스탕스", "captain": "룩삼", "points": 1000, "roster": { "top": None, "jungle": None, "mid": None, "adc": None, "support": None }, "isAi": False, "aiStyle": "balanced" },
    { "id": "team6", "name": "푸린의 헬창들", "captain": "푸린", "points": 1000, "roster": { "top": None, "jungle": None, "mid": None, "adc": None, "support": None }, "isAi": False, "aiStyle": "balanced" }
]

DEFAULT_PLAYERS = [
    { "id": "p1", "name": "얍얍", "role": "top", "tier": "A", "bio": "원조 자낳대 탑 패왕, 강력한 라인전과 이니시", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p2", "name": "룩삼", "role": "top", "tier": "A", "bio": "안정적인 딜탱 밸런스, 뇌대리 최적화 플레이어", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p3", "name": "중력", "role": "top", "tier": "B", "bio": "기복 없는 국밥 챔피언 선호, 한타 집중력 우수", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p4", "name": "푸린", "role": "top", "tier": "S", "bio": "극강의 무력과 캐리력, 피지컬 종결자 탑라이너", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p5", "name": "소우릎", "role": "top", "tier": "S", "bio": "프로 출신, 정교한 라인 관리 및 넓은 시야", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p6", "name": "치킨쿤", "role": "top", "tier": "B", "bio": "팀을 위한 단단한 방패, 든든한 국밥 전문 탑", "status": "idle", "wonBy": None, "price": 0 },

    { "id": "p7", "name": "삼식", "role": "jungle", "tier": "S", "bio": "동선 설계와 오브젝트 컨트롤이 뛰어난 정글사령관", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p8", "name": "남봉", "role": "jungle", "tier": "S", "bio": "미친 갱킹 타이밍과 피지컬, 캐리형 정글러", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p9", "name": "도현", "role": "jungle", "tier": "A", "bio": "뛰어난 교전 능력과 이니시 메이킹 최적화", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p10", "name": "쌍베", "role": "jungle", "tier": "B", "bio": "팀의 웃음 책임자이자 든든한 고기방패 정글", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p11", "name": "재현", "role": "jungle", "tier": "A", "bio": "속도감 있는 동선과 카운터 정글링의 대가", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p12", "name": "물쥐", "role": "jungle", "tier": "B", "bio": "성장 기대치가 높은 캐리형 AP 정글 선호", "status": "idle", "wonBy": None, "price": 0 },

    { "id": "p13", "name": "한동숙", "role": "mid", "tier": "B", "bio": "자낳대 역사상 최고의 미드 탱커, 팀의 정신적 지주", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p14", "name": "눈꽃", "role": "mid", "tier": "S", "bio": "미드 라인전 압살 능력과 넓은 챔프폭 보유", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p15", "name": "네클릿", "role": "mid", "tier": "A", "bio": "베테랑의 관록, 노련한 게임 조율과 로밍 메이킹", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p16", "name": "탬탬버린", "role": "mid", "tier": "C", "bio": "귀여운 플레이 스타일 뒤에 숨겨진 안정적 파밍력", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p17", "name": "도요새", "role": "mid", "tier": "B", "bio": "성장형 메이지 챔피언 선호, 후반 한타 캐리 가능", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p18", "name": "소풍왔니", "role": "mid", "tier": "C", "bio": "미드 유틸 챔피언 스페셜리스트, 탄탄한 어시스트", "status": "idle", "wonBy": None, "price": 0 },

    { "id": "p19", "name": "따효니", "role": "adc", "tier": "A", "bio": "하이리스크 하이리턴의 상징, 미친 딜링 한계 돌파", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p20", "name": "괴물쥐", "role": "adc", "tier": "S", "bio": "압도적인 카이팅과 피지컬, 캐리형 원딜러의 표본", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p21", "name": "러너", "role": "adc", "tier": "B", "bio": "오더가 가능한 오지랖 원딜러, 팀 파이팅 조율", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p22", "name": "류제홍", "role": "adc", "tier": "A", "bio": "FPS 국가대표 출신의 동체시력과 뛰어난 무빙", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p23", "name": "예지", "role": "adc", "tier": "B", "bio": "라인전이 단단하고 한타 포지셔닝이 훌륭한 원딜", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p24", "name": "박잔디", "role": "adc", "tier": "C", "bio": "사리는 생존형 플레이, 서포터 보호 최적화", "status": "idle", "wonBy": None, "price": 0 },

    { "id": "p25", "name": "박옥자누나", "role": "support", "tier": "B", "bio": "안정적인 아군 케어와 오더 보좌 능력이 탁월", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p26", "name": "소람잉", "role": "support", "tier": "A", "bio": "그랩류 메이킹 챔피언 장인, 폭발적인 한타 각 설계", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p27", "name": "여까", "role": "support", "tier": "B", "bio": "안정적인 탱커형 유틸서폿, 아군 딜러 시팅 전문", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p28", "name": "김여뉴", "role": "support", "tier": "A", "bio": "다양한 서폿 이해도, 시야 장악과 라인전 리드 우수", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p29", "name": "러너와이프", "role": "support", "tier": "C", "bio": "힐과 실드로 원딜을 100% 보살피는 헌신적인 서폿", "status": "idle", "wonBy": None, "price": 0 },
    { "id": "p30", "name": "종우", "role": "support", "tier": "B", "bio": "플레이메이킹 서폿 선호, 과감한 이니시에이팅", "status": "idle", "wonBy": None, "price": 0 }
]

# Global Application State
state_lock = threading.Lock()
client_queues = []
auction_id = 0
undo_snapshot = None

state = {
    "settings": {
        "initPoints": 1000,
        "minBid": 5,
        "bidIncrement": 5,
        "timerDuration": 10,
        "voiceEnabled": True,
        "soundEnabled": True,
        "strictReserve": False
    },
    "teams": [dict(t) for t in DEFAULT_TEAMS],
    "players": [dict(p) for p in DEFAULT_PLAYERS],
    "history": [
        { "type": "system", "text": "실시간 경매 서버가 성공적으로 시작되었습니다.", "time": time.strftime("%H:%M:%S") }
    ],
    "currentAuction": {
        "player": None,
        "currentBid": 0,
        "highestBidder": None,
        "timer": 0,
        "status": "idle" # idle, bidding, sold, unsold, paused
    }
}

def save_undo_snapshot():
    global undo_snapshot, state
    undo_snapshot = json.dumps(state)

def restore_undo_snapshot():
    global undo_snapshot, state, auction_id
    if undo_snapshot is None:
        return False
    state = json.loads(undo_snapshot)
    auction_id += 1 # Cancel old timer thread
    if state["currentAuction"]["status"] == "bidding":
        start_timer_thread()
    undo_snapshot = None
    return True

def broadcast_state():
    data_str = json.dumps(state)
    for q in list(client_queues):
        q.put(data_str)

# Timer Thread Management
timer_thread = None

def start_timer_thread():
    global timer_thread, auction_id
    auction_id += 1
    timer_thread = threading.Thread(target=timer_loop, args=(auction_id,))
    timer_thread.daemon = True
    timer_thread.start()

def timer_loop(curr_id):
    global state
    while True:
        time.sleep(1)
        with state_lock:
            if curr_id != auction_id:
                return
            auction = state["currentAuction"]
            if auction["status"] not in ["bidding", "preparing"]:
                return
            
            if auction["timer"] > 0:
                auction["timer"] -= 1
                broadcast_state()
            else:
                if auction["status"] == "preparing":
                    # Transition from preparing to bidding phase
                    auction["status"] = "bidding"
                    auction["timer"] = state["settings"]["timerDuration"]
                    state["history"].append({
                        "type": "system",
                        "text": f"🔥 {auction['player']['name']} 선수의 입찰이 개시되었습니다! (시작 호가: {state['settings']['minBid']}p)",
                        "time": time.strftime("%H:%M:%S")
                    })
                    broadcast_state()
                    trigger_ai_evaluation()
                else:
                    process_expiry()
                    return

def process_expiry():
    global state
    auction = state["currentAuction"]
    player = auction["player"]
    highest_bidder_id = auction["highestBidder"]
    price = auction["currentBid"]
    
    if highest_bidder_id:
        team = next((t for t in state["teams"] if t["id"] == highest_bidder_id), None)
        if team and player:
            team["points"] -= price
            role = player["role"]
            team["roster"][role] = {
                "id": player["id"],
                "name": player["name"],
                "price": price
            }
            
            for p in state["players"]:
                if p["id"] == player["id"]:
                    p["status"] = "sold"
                    p["wonBy"] = team["name"]
                    p["price"] = price
                    
            state["history"].append({
                "type": "sold",
                "text": f"🎉 {player['name']} 선수가 {team['captain']} 감독({team['name']})에게 {price}포인트로 낙찰되었습니다!",
                "time": time.strftime("%H:%M:%S")
            })
            auction["status"] = "sold"
    else:
        if player:
            for p in state["players"]:
                if p["id"] == player["id"]:
                    p["status"] = "unsold"
            
            state["history"].append({
                "type": "unsold",
                "text": f"⚠️ {player['name']} 선수가 유찰되었습니다.",
                "time": time.strftime("%H:%M:%S")
            })
            auction["status"] = "unsold"
            
    broadcast_state()

def handle_bid(team_id, amount=None):
    global state
    auction = state["currentAuction"]
    if auction["status"] != "bidding":
        return False, "현재 입찰 가능한 상태가 아닙니다."
        
    team = next((t for t in state["teams"] if t["id"] == team_id), None)
    if not team:
        return False, "존재하지 않는 팀입니다."
        
    player = auction["player"]
    if not player:
        return False, "경매 대상 선수가 없습니다."
        
    role = player["role"]
    if team["roster"][role] is not None:
        return False, f"이미 {role.upper()} 슬롯이 가득 찼습니다."
        
    if amount is None:
        bid_amount = auction["currentBid"] + state["settings"]["bidIncrement"]
        if auction["currentBid"] == 0:
            bid_amount = state["settings"]["minBid"]
    else:
        bid_amount = amount
        
    if bid_amount <= auction["currentBid"]:
        return False, f"현재 호가({auction['currentBid']}포인트)보다 높은 금액이어야 합니다."
        
    # Check budget
    empty_slots = sum(1 for slot, val in team["roster"].items() if val is None)
    points_after = team["points"] - bid_amount
    
    if points_after < 0:
        return False, f"포인트가 부족합니다. (보유: {team['points']}p / 입찰: {bid_amount}p)"
        
    if state["settings"]["strictReserve"]:
        min_reserve = (empty_slots - 1) * state["settings"]["minBid"]
        if points_after < min_reserve:
            return False, f"남은 슬롯들을 입찰하기 위해선 최소 {min_reserve}포인트가 필요합니다."
            
    # Success
    auction["currentBid"] = bid_amount
    auction["highestBidder"] = team_id
    auction["timer"] = state["settings"]["timerDuration"]
    
    state["history"].append({
        "type": "bid",
        "text": f"🔥 {team['captain']} 감독({team['name']})이 {bid_amount}포인트 입찰!",
        "time": time.strftime("%H:%M:%S")
    })
    
    start_timer_thread()
    broadcast_state()
    return True, "입찰 성공"

# AI Decision Loop Thread
ai_evaluation_event = threading.Event()

def trigger_ai_evaluation():
    ai_evaluation_event.set()

def start_ai_thread():
    t = threading.Thread(target=ai_decision_worker)
    t.daemon = True
    t.start()

def ai_decision_worker():
    global state, auction_id
    tier_values = {
        "S": 350,
        "A": 180,
        "B": 80,
        "C": 30,
        "D": 10
    }
    
    while True:
        ai_evaluation_event.wait()
        ai_evaluation_event.clear()
        
        start_id = auction_id
        
        # Simulated thinking delay (0.5 to 1.3 seconds)
        time.sleep(random.uniform(0.5, 1.3))
        
        with state_lock:
            # If timer restarted or admin acted, skip this round
            if auction_id != start_id:
                continue
                
            auction = state["currentAuction"]
            if auction["status"] != "bidding":
                continue
                
            player = auction["player"]
            if not player:
                continue
                
            role = player["role"]
            current_bid = auction["currentBid"]
            highest_bidder = auction["highestBidder"]
            
            eligible_ai_bids = []
            tier_val = tier_values.get(player["tier"], 50)
            
            for team in state["teams"]:
                if not team.get("isAi", False):
                    continue
                if team["id"] == highest_bidder:
                    continue
                if team["roster"][role] is not None:
                    continue
                    
                style = team.get("aiStyle", "balanced")
                coef = 1.0
                if style == "aggressive":
                    coef = 1.4
                elif style == "frugal":
                    coef = 0.75
                
                empty_slots = sum(1 for slot, val in team["roster"].items() if val is None)
                if empty_slots == 0:
                    continue
                    
                pts = team["points"]
                avg_points = pts / empty_slots
                
                # If they have lots of points relative to remaining positions, they bid aggressively
                # Average starting points = 200 points per slot.
                budget_factor = min(1.6, avg_points / 180.0)
                
                # Maximum amount this AI is willing to spend on this player
                max_valuation = tier_val * coef * budget_factor
                
                # Randomize slightly so they don't always stop at exact mathematical valuations
                max_valuation += random.uniform(-10, 15)
                
                inc = state["settings"]["bidIncrement"]
                min_bid = state["settings"]["minBid"]
                next_bid = current_bid + inc
                if current_bid == 0:
                    next_bid = min_bid
                    
                # Strict points reserve rule
                pts_after = pts - next_bid
                min_reserve = (empty_slots - 1) * min_bid if state["settings"]["strictReserve"] else 0
                
                if pts_after >= min_reserve and next_bid <= max_valuation:
                    eligible_ai_bids.append((team["id"], next_bid))
                    
            if eligible_ai_bids:
                selected_team_id, bid_amt = random.choice(eligible_ai_bids)
                success, msg = handle_bid(selected_team_id, bid_amt)
                if success:
                    trigger_ai_evaluation()

# HTTP Request Handler Subclass
class AuctionHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/events':
            self.handle_sse()
        elif self.path == '/api/state':
            self.handle_get_state()
        else:
            super().do_GET()
            
    def translate_path(self, path):
        clean_path = path.split('?', 1)[0].split('#', 1)[0]
        clean_path = clean_path.replace('\\', '/')
        parts = [p for p in clean_path.split('/') if p and p != '..' and p != '.']
        if not parts:
            parts = ['index.html']
        return os.path.join(os.getcwd(), 'public', *parts)
        
    def handle_sse(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        q = queue.Queue()
        with state_lock:
            client_queues.append(q)
            initial_data = json.dumps(state)
            
        try:
            self.wfile.write(f"data: {initial_data}\n\n".encode('utf-8'))
            self.wfile.flush()
            
            while True:
                data = q.get()
                self.wfile.write(f"data: {data}\n\n".encode('utf-8'))
                self.wfile.flush()
        except (ConnectionError, BrokenPipeError, socket.error):
            pass
        finally:
            with state_lock:
                if q in client_queues:
                    client_queues.remove(q)
                    
    def handle_get_state(self):
        with state_lock:
            self.send_json_response(state)
            
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(post_data) if post_data else {}
        except json.JSONDecodeError:
            self.send_error_response(400, "잘못된 JSON 형식입니다.")
            return
            
        if self.path == '/api/bid':
            self.handle_api_bid(data)
        elif self.path == '/api/admin/control':
            self.handle_api_admin_control(data)
        elif self.path == '/api/admin/settings':
            self.handle_api_admin_settings(data)
        elif self.path == '/api/admin/players':
            self.handle_api_admin_players(data)
        elif self.path == '/api/admin/teams':
            self.handle_api_admin_teams(data)
        else:
            self.send_error_response(404, "API 엔드포인트를 찾을 수 없습니다.")
            
    def handle_api_bid(self, data):
        team_id = data.get("teamId")
        amount = data.get("amount")
        
        if not team_id:
            self.send_error_response(400, "팀 ID가 누락되었습니다.")
            return
            
        with state_lock:
            success, message = handle_bid(team_id, amount)
            
        if success:
            self.send_json_response({"success": True, "message": message})
            trigger_ai_evaluation()
        else:
            self.send_error_response(400, message)
            
    def handle_api_admin_control(self, data):
        global state
        action = data.get("action")
        
        with state_lock:
            auction = state["currentAuction"]
            
            if action == "start":
                player_id = data.get("playerId")
                player = next((p for p in state["players"] if p["id"] == player_id), None)
                if not player:
                    self.send_error_response(400, "선수를 찾을 수 없습니다.")
                    return
                if player["status"] == "sold":
                    self.send_error_response(400, "이미 낙찰된 선수입니다.")
                    return
                    
                # Initialize auction in PREPARING phase
                save_undo_snapshot()
                auction["player"] = player
                auction["currentBid"] = 0
                auction["highestBidder"] = None
                auction["timer"] = 5  # 5 seconds preparation countdown
                auction["status"] = "preparing"
                
                # Mark player status
                for p in state["players"]:
                    if p["id"] == player_id:
                        p["status"] = "auctioning"
                        
                state["history"].append({
                    "type": "start",
                    "text": f"📢 [경매 대기] {player['name']} 선수의 경매가 5초 후 개시됩니다! 포지션: {player['role'].upper()}",
                    "time": time.strftime("%H:%M:%S")
                })
                
                start_timer_thread()
                broadcast_state()
                self.send_json_response({"success": True})
                
            elif action == "pause":
                if auction["status"] in ["bidding", "preparing"]:
                    auction["status"] = "paused"
                    broadcast_state()
                    self.send_json_response({"success": True})
                else:
                    self.send_error_response(400, "경매가 진행 중이 아닙니다.")
                    
            elif action == "resume":
                if auction["status"] == "paused":
                    # Determine whether it was paused during preparing or bidding
                    if auction["currentBid"] == 0 and auction["highestBidder"] is None:
                        auction["status"] = "preparing"
                    else:
                        auction["status"] = "bidding"
                        
                    start_timer_thread()
                    broadcast_state()
                    self.send_json_response({"success": True})
                    if auction["status"] == "bidding":
                        trigger_ai_evaluation()
                else:
                    self.send_error_response(400, "경매가 일시정지 상태가 아닙니다.")
                    
            elif action == "sell":
                if auction["status"] in ["bidding", "paused"]:
                    if auction["highestBidder"]:
                        process_expiry()
                        self.send_json_response({"success": True})
                    else:
                        self.send_error_response(400, "입찰자가 없어 낙찰할 수 없습니다.")
                else:
                    self.send_error_response(400, "경매가 진행 중이 아닙니다.")
                    
            elif action == "unsold":
                if auction["status"] in ["bidding", "paused"]:
                    auction["highestBidder"] = None
                    process_expiry()
                    self.send_json_response({"success": True})
                else:
                    self.send_error_response(400, "경매가 진행 중이 아닙니다.")
                    
            elif action == "undo":
                if restore_undo_snapshot():
                    broadcast_state()
                    self.send_json_response({"success": True})
                else:
                    self.send_error_response(400, "되돌릴 작업 기록이 존재하지 않습니다.")
                    
            elif action == "nominate_unsold":
                player_id = data.get("playerId")
                player = next((p for p in state["players"] if p["id"] == player_id), None)
                if player and player["status"] == "unsold":
                    player["status"] = "idle"
                    state["history"].append({
                        "type": "system",
                        "text": f"🔄 {player['name']} 선수가 재경매 후보로 복귀했습니다.",
                        "time": time.strftime("%H:%M:%S")
                    })
                    broadcast_state()
                    self.send_json_response({"success": True})
                else:
                    self.send_error_response(400, "재경매로 복귀시킬 수 없는 선수입니다.")
            else:
                self.send_error_response(400, "올바르지 않은 명령입니다.")

    def handle_api_admin_settings(self, data):
        global state
        with state_lock:
            settings = state["settings"]
            for key in ["initPoints", "minBid", "bidIncrement", "timerDuration", "voiceEnabled", "soundEnabled", "strictReserve"]:
                if key in data:
                    settings[key] = data[key]
                    
            if "initPoints" in data:
                # Reset points for teams without any roster items
                for team in state["teams"]:
                    has_players = any(val is not None for val in team["roster"].values())
                    if not has_players:
                        team["points"] = data["initPoints"]
                        
            state["history"].append({
                "type": "system",
                "text": "🔧 경매 규칙 설정이 업데이트되었습니다.",
                "time": time.strftime("%H:%M:%S")
            })
            broadcast_state()
            self.send_json_response({"success": True})

    def handle_api_admin_players(self, data):
        global state
        action = data.get("action")
        
        with state_lock:
            if action == "load_presets":
                players_list = data.get("players")
                if players_list:
                    state["players"] = players_list
                    for p in state["players"]:
                        p["status"] = "idle"
                        p["wonBy"] = None
                        p["price"] = 0
                    state["history"].append({
                        "type": "system",
                        "text": f"📋 선수 목록 프리셋({len(players_list)}명)이 리로드되었습니다.",
                        "time": time.strftime("%H:%M:%S")
                    })
                    broadcast_state()
                    self.send_json_response({"success": True})
                else:
                    self.send_error_response(400, "선수 데이터가 유효하지 않습니다.")
                return
                
            elif action == "shuffle":
                # Shuffle only idle players
                idle_players = [p for p in state["players"] if p["status"] == "idle"]
                random.shuffle(idle_players)
                non_idle_players = [p for p in state["players"] if p["status"] != "idle"]
                state["players"] = idle_players + non_idle_players
                
                state["history"].append({
                    "type": "system",
                    "text": "🎲 대기 상태의 선수 순서가 무작위로 셔플되었습니다.",
                    "time": time.strftime("%H:%M:%S")
                })
                broadcast_state()
                self.send_json_response({"success": True})
                return
                
            elif action == "add":
                player = data.get("player")
                if player:
                    p_id = f"p_custom_{int(time.time()*1000)}"
                    player["id"] = p_id
                    player["status"] = "idle"
                    player["wonBy"] = None
                    player["price"] = 0
                    state["players"].append(player)
                    state["history"].append({
                        "type": "system",
                        "text": f"🆕 새 선수 등록: {player['name']} ({player['role'].upper()})",
                        "time": time.strftime("%H:%M:%S")
                    })
                    broadcast_state()
                    self.send_json_response({"success": True, "player": player})
                else:
                    self.send_error_response(400, "선수 정보가 누락되었습니다.")
                return
                
            elif action == "edit":
                player = data.get("player")
                if player:
                    for p in state["players"]:
                        if p["id"] == player["id"]:
                            p["name"] = player["name"]
                            p["role"] = player["role"]
                            p["tier"] = player["tier"]
                            p["bio"] = player.get("bio", "")
                            break
                    broadcast_state()
                    self.send_json_response({"success": True})
                else:
                    self.send_error_response(400, "선수 정보가 누락되었습니다.")
                return
                
            elif action == "delete":
                player_id = data.get("playerId")
                p_obj = next((p for p in state["players"] if p["id"] == player_id), None)
                p_name = p_obj["name"] if p_obj else ""
                state["players"] = [p for p in state["players"] if p["id"] != player_id]
                state["history"].append({
                    "type": "system",
                    "text": f"❌ 선수 제거: {p_name}",
                    "time": time.strftime("%H:%M:%S")
                })
                broadcast_state()
                self.send_json_response({"success": True})
                return
                
            self.send_error_response(400, "잘못된 선수 관리 액션입니다.")

    def handle_api_admin_teams(self, data):
        global state
        action = data.get("action")
        
        with state_lock:
            if action == "edit":
                team = data.get("team")
                if team:
                    for t in state["teams"]:
                        if t["id"] == team["id"]:
                            t["name"] = team["name"]
                            t["captain"] = team["captain"]
                            t["points"] = team["points"]
                            break
                    broadcast_state()
                    self.send_json_response({"success": True})
                else:
                    self.send_error_response(400, "팀 정보가 누락되었습니다.")
                return
                
            elif action == "set_ai":
                team_id = data.get("teamId")
                is_ai = data.get("isAi", False)
                ai_style = data.get("aiStyle", "balanced")
                for t in state["teams"]:
                    if t["id"] == team_id:
                        t["isAi"] = is_ai
                        t["aiStyle"] = ai_style
                        break
                broadcast_state()
                self.send_json_response({"success": True})
                return
                
            self.send_error_response(400, "잘못된 팀 관리 액션입니다.")
            
    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
        
    def send_error_response(self, status, message):
        self.send_json_response({"success": False, "message": message}, status)

def main():
    # Make sure we serve in public directory if called from parent
    os.makedirs('public', exist_ok=True)
    
    # Read port from environment variable, default to 8000
    port = int(os.environ.get('PORT', 8000))
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, AuctionHandler)
    
    # Start AI Decision Thread
    start_ai_thread()
    
    # Find local IP address to print connection guidelines
    hostname = socket.gethostname()
    local_ip = "127.0.0.1"
    try:
        local_ip = socket.gethostbyname(hostname)
    except:
        pass
        
    print("=" * 60)
    print("[INFO] LoL Ja-Na-Dae Auction Simulator Server Started!")
    print(f" - Local Host: http://localhost:{port}")
    print(f" - LAN Host  : http://{local_ip}:{port}")
    print("=" * 60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
        sys.exit(0)

if __name__ == '__main__':
    main()
