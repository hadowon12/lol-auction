// 클라이언트 전역 상태
let currentRole = 'viewer'; // viewer, captain, admin
let myTeamId = null; // 감독으로 접속 시 선택된 팀 ID
let localState = null; // 서버로부터 전달받은 최신 상태
let eventSource = null;

// Web Audio API 오디오 합성용 컨텍스트
let audioCtx = null;
let rouletteInterval = null;
let isRouletteRunning = false;

// 이전 상태 캐시 (사운드 및 음성 실시간 중계 트리거 감지용)
let lastBidValue = 0;
let lastHighestBidder = null;
let lastTimerValue = 0;
let lastAuctionStatus = 'idle';
let lastActivePlayerId = null;

// 한국어 TTS 아나운서 목소리 선택용 캐시
let koreanVoice = null;
function initTTSVoice() {
  if (typeof speechSynthesis === 'undefined') return;
  const voices = speechSynthesis.getVoices();
  koreanVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KO')) || null;
}
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = initTTSVoice;
  initTTSVoice();
}

// 오디오 초기화
function initAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx && AudioCtx) {
    audioCtx = new AudioCtx();
  }
}

// 효과음 합성 재생 (Web Audio API)
function playSound(type) {
  if (!localState || !localState.settings.soundEnabled) return;
  initAudio();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'tick') {
    // 타이머 긴박 째깍 소리 (짧은 하이톤 비프)
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'bid') {
    // 입찰 효과음 (상승하는 신디사이저톤)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18); // E5
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'buzzer') {
    // 유찰 또는 카운트종료 버저음 (낮고 거친 소리)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.45);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.45);
    osc.start(now);
    osc.stop(now + 0.45);
  } else if (type === 'sold') {
    // 낙찰 팡파레음 (도미솔도 멜로디 상승 아르페지오)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(261.63, now); // 도
    osc.frequency.setValueAtTime(329.63, now + 0.08); // 미
    osc.frequency.setValueAtTime(392.00, now + 0.16); // 솔
    osc.frequency.setValueAtTime(523.25, now + 0.24); // 높은도
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.15, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  }
}

// 한국어 아나운서 TTS 입찰 정보 중계
function speakText(text) {
  if (!localState || !localState.settings.voiceEnabled) return;
  if (typeof speechSynthesis === 'undefined') return;
  
  // 현재 말하는 중이면 중지시켜 밀림 현상 방지
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  if (koreanVoice) utterance.voice = koreanVoice;
  utterance.rate = 1.1; // 약간 빠르게 아나운싱
  utterance.pitch = 1.0;
  speechSynthesis.speak(utterance);
}

// ----------------------------------------------------
// 게이트 역할 선택 및 입장 핸들링
// ----------------------------------------------------

// 1. 게이트 화면 초기 로드 시 감독 선택용 옵션들 채우기
window.addEventListener('DOMContentLoaded', () => {
  // 프리셋에서 팀 목록 가져오기
  const select = document.getElementById('captain-team-select');
  select.innerHTML = '';
  
  // window.PRESETS.teams 구조가 존재할 경우 채워줌
  if (window.PRESETS && window.PRESETS.teams) {
    window.PRESETS.teams.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = `${team.captain} 감독 (${team.name})`;
      select.appendChild(opt);
    });
  }
});

// 2. 역할 전환 표시
function showCaptainSelection() {
  document.getElementById('admin-login-panel').style.display = 'none';
  const panel = document.getElementById('captain-select-panel');
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
}

function showAdminLogin() {
  document.getElementById('captain-select-panel').style.display = 'none';
  const panel = document.getElementById('admin-login-panel');
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  document.getElementById('admin-password').focus();
}

// 3. 역할 결정 및 입장
function selectRole(role) {
  currentRole = role;
  myTeamId = null;
  enterApp();
}

function enterAsCaptain() {
  const select = document.getElementById('captain-team-select');
  currentRole = 'captain';
  myTeamId = select.value;
  enterApp();
}

function enterAsAdmin() {
  const password = document.getElementById('admin-password').value;
  if (password === 'admin' || password === '') {
    currentRole = 'admin';
    myTeamId = null;
    enterApp();
  } else {
    alert('비밀번호가 올바르지 않습니다. (기본 비밀번호는 빈 칸이거나 admin 입니다.)');
  }
}

// 4. 앱 화면 활성화 및 실시간 스트림 연결
function enterApp() {
  // 게이트 감추기, 앱 레이아웃 표시
  document.getElementById('gate-screen').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';
  
  // 역할 배지 업데이트
  const indicator = document.getElementById('role-indicator');
  indicator.className = `role-badge ${currentRole}`;
  
  if (currentRole === 'admin') {
    indicator.textContent = '주최자';
    // 관리자 전용 탭 활성화
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
  } else if (currentRole === 'captain') {
    indicator.textContent = '감독';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  } else {
    indicator.textContent = '관전자';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
  
  // 첫 페이지 탭 세팅
  switchTab('auction');
  
  // SSE 연결 개시
  connectSSE();
}

// 5. 나가기 버튼
function exitToGate() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  document.getElementById('app-layout').style.display = 'none';
  document.getElementById('gate-screen').style.display = 'flex';
  
  // 관리자 폼 초기화
  document.getElementById('admin-login-panel').style.display = 'none';
  document.getElementById('captain-select-panel').style.display = 'none';
  document.getElementById('admin-password').value = '';
}

// 6. 탭 전환
function switchTab(tabName) {
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
  
  // 현재 탭 활성화
  const targetBtn = Array.from(document.querySelectorAll('.nav-tab')).find(btn => btn.getAttribute('onclick').includes(tabName));
  if (targetBtn) targetBtn.classList.add('active');
  
  const targetScreen = document.getElementById(`tab-${tabName}`);
  if (targetScreen) targetScreen.classList.add('active');

  // 만약 관리자 탭이 열릴 경우 최신 리스트 동기화용 UI 강제 업데이트 호출 가능
  if (tabName === 'players' && localState) {
    renderPlayersTab();
  } else if (tabName === 'teams' && localState) {
    renderTeamsTab();
  } else if (tabName === 'settings' && localState) {
    renderSettingsTab();
  }
}

// ----------------------------------------------------
// 실시간 SSE 스트림 연동
// ----------------------------------------------------
function connectSSE() {
  if (eventSource) eventSource.close();
  
  eventSource = new EventSource('/events');
  
  eventSource.onmessage = function(event) {
    const newState = JSON.parse(event.data);
    handleStateUpdate(newState);
  };
  
  eventSource.onerror = function() {
    console.error("실시간 서버 연결 실패. 재시도 중...");
    setTimeout(connectSSE, 2000); // 2초 뒤 재연동 시도
  };
}

// ----------------------------------------------------
// 서버 상태 업데이트 핸들링 (핵심 로직)
// ----------------------------------------------------
function handleStateUpdate(state) {
  localState = state;
  const auction = state.currentAuction;
  
  // 1. 이벤트 사운드 및 TTS 트리거 감지
  
  // 입찰가 갱신 감지
  if (auction.status === 'bidding' && auction.currentBid > lastBidValue) {
    playSound('bid');
    
    // TTS 알림
    if (auction.highestBidder) {
      const team = state.teams.find(t => t.id === auction.highestBidder);
      if (team) {
        speakText(`${team.captain} 감독, ${auction.currentBid}포인트!`);
      }
    }
  }
  
  // 타이머 째깍소리 감지 (카운트다운 5초 이하)
  if (auction.status === 'bidding' && auction.timer <= 5 && auction.timer !== lastTimerValue && auction.timer > 0) {
    playSound('tick');
  }
  
  // 선수 무작위 추첨 감지 (4초 룰렛)
  if (auction.status === 'drawing' && lastAuctionStatus !== 'drawing') {
    if (auction.player) {
      startRouletteAnimation(auction.player, state.players);
    }
  }
  
  // 신규 선수 경매 개시 준비 감지 (5초 대기 텀)
  if (auction.status === 'preparing' && lastAuctionStatus !== 'preparing') {
    // 만약 룰렛 연동 없이 관리자가 강제 노미네이트한 경우 대비 룰렛 정지 보장
    if (isRouletteRunning) {
      stopRouletteAnimation(auction.player);
    }
    playSound('bid');
    if (auction.player) {
      speakText(`${auction.player.name} 선수의 경매가 준비 중입니다. 포지션은 ${roleToKorean(auction.player.role)}입니다. 잠시 후 입찰이 시작됩니다.`);
    }
  }
  
  // 경매 준비에서 입찰 개시로 전환 감지
  if (auction.status === 'bidding' && lastAuctionStatus === 'preparing') {
    playSound('sold');
    speakText("입찰을 개시합니다!");
  }
  
  // 신규 선수 경매 개시 감지 (준비를 거치지 않고 기동 시 호환성 유지)
  if (auction.status === 'bidding' && lastAuctionStatus !== 'bidding' && lastAuctionStatus !== 'preparing') {
    if (auction.player) {
      speakText(`${auction.player.name} 선수의 경매가 시작되었습니다. 포지션은 ${roleToKorean(auction.player.role)}입니다.`);
    }
  }
  
  // 낙찰 감지
  if (auction.status === 'sold' && lastAuctionStatus !== 'sold') {
    playSound('sold');
    
    // 낙찰 팝업 오버레이 표시
    if (auction.player) {
      const team = state.teams.find(t => t.id === auction.highestBidder);
      const capName = team ? team.captain : "알 수 없음";
      const teamName = team ? team.name : "알 수 없음";
      
      document.getElementById('sold-p-name').textContent = auction.player.name;
      document.getElementById('sold-t-name').textContent = `${capName} 감독 (${teamName})`;
      document.getElementById('sold-price').textContent = `${auction.currentBid}p`;
      document.getElementById('sold-overlay').style.display = 'flex';
      
      speakText(`${auction.player.name} 선수, ${capName} 감독에게 ${auction.currentBid}포인트 낙찰 완료!`);
      
      // 4초 후 오버레이 자동 닫기
      setTimeout(closeSoldOverlay, 4000);
    }
  }
  
  // 유찰 감지
  if (auction.status === 'unsold' && lastAuctionStatus !== 'unsold') {
    playSound('buzzer');
    if (auction.player) {
      speakText(`${auction.player.name} 선수, 유찰되었습니다.`);
    }
  }

  // 캐시 업데이트
  lastBidValue = auction.currentBid;
  lastHighestBidder = auction.highestBidder;
  lastTimerValue = auction.timer;
  lastAuctionStatus = auction.status;
  lastActivePlayerId = auction.player ? auction.player.id : null;
  
  // 2. 대시보드 뷰 렌더링
  renderAuctionBoard();
  renderDetailedRosters();
  
  // 관리자 모드인 경우 하위 활성화 탭 갱신
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab) {
    const text = activeTab.textContent;
    if (text === '선수 리스트') renderPlayersTab();
    if (text === '팀 설정(AI)') renderTeamsTab();
    if (text === '경매 규칙') renderSettingsTab();
  }
}

// 한국어 라인 포지션 헬퍼
function roleToKorean(role) {
  const map = { top: "탑", jungle: "정글", mid: "미드", adc: "원딜", support: "서포터" };
  return map[role] || role;
}

// 낙찰창 수동 닫기
function closeSoldOverlay() {
  document.getElementById('sold-overlay').style.display = 'none';
}

// ----------------------------------------------------
// 렌더링 함수군 (DOM 업데이트)
// ----------------------------------------------------

// 1. 메인 경매 보드 탭 렌더링
function renderAuctionBoard() {
  const auction = localState.currentAuction;
  
  // (A) 선수 카드 업데이트
  const apCard = document.getElementById('active-player-card');
  const apName = document.getElementById('ap-name');
  const apAvatarText = document.getElementById('ap-avatar-text');
  const apRole = document.getElementById('ap-role');
  const apTier = document.getElementById('ap-tier');
  const apBio = document.getElementById('ap-bio');
  
  if (isRouletteRunning) {
    // 룰렛 추첨 애니메이션 진행 중일 때는 타이머 갱신으로 인한 카드 리렌더링을 차단합니다.
  } else {
    if (auction.player) {
      apName.textContent = auction.player.name;
      apAvatarText.textContent = auction.player.name.charAt(0);
      apRole.textContent = auction.player.role.toUpperCase();
      apTier.textContent = `${auction.player.tier} Class`;
      apTier.className = `player-tier ${auction.player.tier}`;
      apTier.style.display = 'inline-block';
      apBio.textContent = auction.player.bio || "선수 소개가 등록되어 있지 않습니다.";
    } else {
      apName.textContent = "경매 대기 중...";
      apAvatarText.textContent = "?";
      apRole.textContent = "ROLE";
      apTier.style.display = 'none';
      apBio.textContent = "진행 중인 선수가 없습니다. 관리자가 다음 선수를 대기열에서 기동하기를 기다리십시오.";
    }
  }
  
  // (B) 호가 정보
  const apCurrentBid = document.getElementById('ap-current-bid');
  const apHighestBidder = document.getElementById('ap-highest-bidder');
  
  if (auction.status === 'drawing') {
    apCurrentBid.textContent = "추첨 진행 중";
    apHighestBidder.textContent = "선수를 임의 추첨하고 있습니다.";
    apHighestBidder.style.color = 'var(--blue)';
  } else if (auction.status === 'preparing') {
    apCurrentBid.textContent = "입찰 대기";
    apHighestBidder.textContent = "잠시 후 입찰이 시작됩니다.";
    apHighestBidder.style.color = 'var(--gold)';
  } else {
    apCurrentBid.textContent = `${auction.currentBid}p`;
    if (auction.highestBidder) {
      const team = localState.teams.find(t => t.id === auction.highestBidder);
      if (team) {
        apHighestBidder.textContent = `${team.captain} 감독 (${team.name})`;
        apHighestBidder.style.color = 'var(--blue)';
      } else {
        apHighestBidder.textContent = "알 수 없는 팀";
      }
    } else {
      apHighestBidder.textContent = "입찰 내역 없음";
      apHighestBidder.style.color = 'var(--text-secondary)';
    }
  }
  
  // (C) 타이머
  const timerVal = document.getElementById('timer-val');
  const timerBox = document.getElementById('timer-box');
  
  timerVal.textContent = auction.timer;
  
  if (auction.status === 'bidding' && auction.timer <= 3) {
    timerBox.classList.add('pulsing');
  } else {
    timerBox.classList.remove('pulsing');
  }
  
  // (D) 감독용 입찰 제어 버튼 활성화/비활성화
  const capControls = document.getElementById('captain-controls');
  if (currentRole === 'captain' && myTeamId) {
    capControls.style.display = 'block';
    
    const myTeam = localState.teams.find(t => t.id === myTeamId);
    const bidBtn = document.getElementById('bid-action-btn');
    const myPointsText = document.getElementById('captain-my-points');
    
    if (myTeam) {
      myPointsText.textContent = `나의 가용 포인트: ${myTeam.points}p`;
      
      // 다음 호가 계산
      let nextBidAmount = auction.currentBid + localState.settings.bidIncrement;
      if (auction.currentBid === 0) {
        nextBidAmount = localState.settings.minBid;
      }
      
      bidBtn.textContent = `입찰 버튼 클릭 (+${localState.settings.bidIncrement}p / ${nextBidAmount}p 입찰)`;
      
      // 유효성 체크
      let disabled = false;
      let reason = "";
      
      if (auction.status === 'drawing') {
        disabled = true;
        reason = "선수 추첨 진행 중...";
      } else if (auction.status === 'preparing') {
        disabled = true;
        reason = "경매 대기 중 (5초 후 개시)";
      } else if (auction.status !== 'bidding') {
        disabled = true;
        reason = "경매가 활성 상태가 아닙니다.";
      } else if (auction.highestBidder === myTeamId) {
        disabled = true;
        reason = "현재 최고 입찰 상태입니다.";
      } else if (auction.player && myTeam.roster[auction.player.role] !== null) {
        disabled = true;
        reason = `이미 ${roleToKorean(auction.player.role)} 라인 포지션을 영입했습니다.`;
      } else if (myTeam.points < nextBidAmount) {
        disabled = true;
        reason = "포인트가 부족합니다.";
      } else if (localState.settings.strictReserve) {
        // 포인트 보존 체크
        const emptySlotsCount = Object.values(myTeam.roster).filter(val => val === null).length;
        const requiredReserve = (emptySlotsCount - 1) * localState.settings.minBid;
        if (myTeam.points - nextBidAmount < requiredReserve) {
          disabled = true;
          reason = `포인트 부족 (남은 슬롯용 예약분 ${requiredReserve}p 유지 필요)`;
        }
      }
      
      bidBtn.disabled = disabled;
      if (disabled && reason) {
        bidBtn.textContent = reason;
      }
    }
  } else {
    capControls.style.display = 'none';
  }
  
  // (E) 관리자 제어 패널
  const adminControls = document.getElementById('admin-controls');
  if (currentRole === 'admin') {
    adminControls.style.display = 'block';
  } else {
    adminControls.style.display = 'none';
  }
  
  // (F) 입찰 히스토리 로그
  const feed = document.getElementById('history-feed');
  let feedHtml = '';
  localState.history.slice().reverse().forEach(item => {
    feedHtml += `
      <div class="history-item ${item.type || 'system'}">
        <span>${item.text}</span>
        <span class="hist-time">${item.time}</span>
      </div>
    `;
  });
  feed.innerHTML = feedHtml;
  
  // (G) 우측 감독별 로스터 스냅샷
  const teamsList = document.getElementById('teams-list');
  let teamsHtml = '';
  localState.teams.forEach(team => {
    const isLeading = auction.status === 'bidding' && auction.highestBidder === team.id;
    const emptySlots = Object.values(team.roster).filter(val => val === null).length;
    const avgVal = emptySlots > 0 ? Math.floor(team.points / emptySlots) : 0;
    
    teamsHtml += `
      <div class="team-card ${isLeading ? 'leading' : ''}">
        <div class="team-header">
          <div class="team-name-info">
            <span class="team-title">${team.name}</span>
            <span class="team-captain-name">${team.captain} 감독 ${team.isAi ? '<span style="color: var(--blue); font-size: 0.7rem;">[AI]</span>' : ''}</span>
          </div>
          <div class="team-points-display">
            <div class="team-pts-val">${team.points}p</div>
            <div class="team-avg-val">평균 슬롯가: ${avgVal}p</div>
          </div>
        </div>
        
        <div class="roster-slots">
          ${renderRosterSlotHtml(team.roster.top, "탑")}
          ${renderRosterSlotHtml(team.roster.jungle, "정글")}
          ${renderRosterSlotHtml(team.roster.mid, "미드")}
          ${renderRosterSlotHtml(team.roster.adc, "원딜")}
          ${renderRosterSlotHtml(team.roster.support, "서폿")}
        </div>
      </div>
    `;
  });
  teamsList.innerHTML = teamsHtml;
}

function renderRosterSlotHtml(slotData, roleName) {
  if (slotData) {
    return `
      <div class="roster-slot filled">
        <span class="slot-role-icon" style="color: var(--gold);">${roleName}</span>
        <span class="slot-player-name">${slotData.name}</span>
        <span class="slot-price-label">${slotData.price}p</span>
      </div>
    `;
  } else {
    return `
      <div class="roster-slot">
        <span class="slot-role-icon">${roleName}</span>
        <span style="color: rgba(255,255,255,0.15); font-size: 1.1rem;">-</span>
      </div>
    `;
  }
}

// 2. 전체 팀 로스터 상세 현황 탭 렌더링
function renderDetailedRosters() {
  const container = document.getElementById('detailed-rosters-grid');
  if (!localState) return;
  
  let html = '';
  localState.teams.forEach(team => {
    const emptySlots = Object.values(team.roster).filter(val => val === null).length;
    const avgVal = emptySlots > 0 ? Math.floor(team.points / emptySlots) : 0;
    
    html += `
      <div class="glass-panel" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid rgba(200, 170, 110, 0.2); padding-bottom: 12px; margin-bottom: 15px;">
          <div>
            <h3 style="font-size: 1.25rem; color: white;">${team.name}</h3>
            <p style="color: var(--gold); font-size: 0.9rem; font-weight: 700; margin-top: 4px;">감독: ${team.captain} ${team.isAi ? '(자동 AI 입찰 진행 중)' : ''}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-title); font-size: 1.6rem; font-weight: 900; color: var(--gold);">${team.points}p</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">남은 슬롯 평균 자본: ${avgVal}p</div>
          </div>
        </div>
        
        <table class="game-table" style="width: 100%;">
          <thead>
            <tr>
              <th>포지션</th>
              <th>영입 선수</th>
              <th>영입 단가</th>
            </tr>
          </thead>
          <tbody>
            ${renderDetailedRow(team.roster.top, "TOP (탑)")}
            ${renderDetailedRow(team.roster.jungle, "JUNGLE (정글)")}
            ${renderDetailedRow(team.roster.mid, "MID (미드)")}
            ${renderDetailedRow(team.roster.adc, "ADC (원딜)")}
            ${renderDetailedRow(team.roster.support, "SUPPORT (서폿)")}
          </tbody>
        </table>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderDetailedRow(slotData, positionName) {
  if (slotData) {
    return `
      <tr>
        <td style="color: var(--gold); font-weight: bold;">${positionName}</td>
        <td style="font-weight: bold; color: white;">${slotData.name}</td>
        <td style="font-family: var(--font-title); font-weight: 700; color: var(--gold);">${slotData.price}포인트</td>
      </tr>
    `;
  } else {
    return `
      <tr>
        <td style="color: var(--text-secondary);">${positionName}</td>
        <td style="color: rgba(255,255,255,0.25); font-style: italic;">공석 (영입 대상)</td>
        <td style="color: rgba(255,255,255,0.25);">-</td>
      </tr>
    `;
  }
}

// 3. 관리자용 선수 관리 탭 렌더링
function renderPlayersTab() {
  const tbody = document.getElementById('player-table-body');
  const nominateSelect = document.getElementById('nominate-select');
  
  tbody.innerHTML = '';
  nominateSelect.innerHTML = '';
  
  // (A) 선수 데이터 테이블 작성
  localState.players.forEach(p => {
    const row = document.createElement('tr');
    
    let statusBadgeClass = `badge-status ${p.status}`;
    let statusText = p.status.toUpperCase();
    if (p.status === 'idle') statusText = '경매 대기';
    if (p.status === 'auctioning') statusText = '진행 중';
    if (p.status === 'sold') statusText = '낙찰 완료';
    if (p.status === 'unsold') statusText = '유찰됨';
    
    let wonDetails = '-';
    if (p.status === 'sold') {
      wonDetails = `${p.wonBy} (${p.price}p)`;
    }
    
    // 조작 액션 버튼
    let actionBtnHtml = '';
    if (p.status === 'idle') {
      actionBtnHtml = `
        <button class="btn btn-blue" style="padding: 4px 8px; font-size: 0.75rem;" onclick="adminDirectStart('${p.id}')">경매 개시</button>
        <button class="btn" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editPlayer('${p.id}')">수정</button>
        <button class="btn btn-red" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deletePlayer('${p.id}')">삭제</button>
      `;
    } else if (p.status === 'unsold') {
      actionBtnHtml = `
        <button class="btn btn-blue" style="padding: 4px 8px; font-size: 0.75rem;" onclick="reNominateUnsold('${p.id}')">재경매 복귀</button>
        <button class="btn btn-red" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deletePlayer('${p.id}')">삭제</button>
      `;
    } else {
      actionBtnHtml = `<span style="font-size:0.8rem; color:var(--text-secondary);">해제 불가</span>`;
    }
    
    row.innerHTML = `
      <td style="font-weight:bold; color:white;">${p.name}</td>
      <td style="text-transform:uppercase;">${p.role}</td>
      <td><span class="player-tier ${p.tier}" style="font-size:0.75rem; padding: 1px 6px;">${p.tier}</span></td>
      <td style="font-size:0.8rem; color:var(--text-secondary); max-width: 200px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${p.bio || ''}">${p.bio || ''}</td>
      <td><span class="${statusBadgeClass}">${statusText}</span></td>
      <td style="font-weight:700; color:var(--gold);">${wonDetails}</td>
      <td>
        <div style="display:flex; gap:6px;">
          ${actionBtnHtml}
        </div>
      </td>
    `;
    tbody.appendChild(row);
    
    // (B) 경매 대기열 바로올리기 콤보박스 채우기 (경매 대기중인 선수만)
    if (p.status === 'idle') {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.role.toUpperCase()} | ${p.tier}급)`;
      nominateSelect.appendChild(opt);
    }
  });
  
  if (nominateSelect.children.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = "-- 대기 중인 선수가 없습니다 --";
    nominateSelect.appendChild(opt);
  }
}

// 4. 관리자용 팀 & AI 감독 탭 렌더링
function renderTeamsTab() {
  const container = document.getElementById('teams-config-container');
  container.innerHTML = '';
  
  localState.teams.forEach(team => {
    const div = document.createElement('div');
    div.className = 'glass-panel';
    div.style.padding = '20px';
    
    div.innerHTML = `
      <h3 style="color:var(--text-light); border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px; margin-bottom:15px; font-size:1.1rem;">
        ${team.name} 편집
      </h3>
      
      <div class="form-group">
        <label>팀 명칭</label>
        <input type="text" id="t-name-${team.id}" class="input-field" value="${team.name}">
      </div>

      <div class="form-group">
        <label>감독명</label>
        <input type="text" id="t-cap-${team.id}" class="input-field" value="${team.captain}">
      </div>

      <div class="form-group">
        <label>보유 포인트 수정</label>
        <input type="number" id="t-pts-${team.id}" class="input-field" value="${team.points}" min="0">
      </div>
      
      <button class="btn btn-blue" style="width:100%; margin-bottom:15px;" onclick="saveTeamInfo('${team.id}')">정보 업데이트</button>
      
      <!-- AI 입찰 시뮬레이터 구성 -->
      <div class="team-ai-config">
        <label class="checkbox-label" style="font-size:0.8rem; font-weight:700;">
          <input type="checkbox" id="t-ai-enable-${team.id}" ${team.isAi ? 'checked' : ''} onchange="toggleTeamAi('${team.id}')">
          AI 자동 입찰 활성화
        </label>
        
        <select id="t-ai-style-${team.id}" onchange="toggleTeamAi('${team.id}')" style="font-size:0.75rem;">
          <option value="balanced" ${team.aiStyle === 'balanced' ? 'selected' : ''}>균형형 (Balanced)</option>
          <option value="aggressive" ${team.aiStyle === 'aggressive' ? 'selected' : ''}>공격형 (Aggressive)</option>
          <option value="frugal" ${team.aiStyle === 'frugal' ? 'selected' : ''}>가성비 지향 (Frugal)</option>
        </select>
      </div>
    `;
    container.appendChild(div);
  });
}

// 5. 관리자용 경매 규칙 설정 탭 렌더링
function renderSettingsTab() {
  document.getElementById('set-init-points').value = localState.settings.initPoints;
  document.getElementById('set-min-bid').value = localState.settings.minBid;
  document.getElementById('set-bid-increment').value = localState.settings.bidIncrement;
  document.getElementById('set-timer-duration').value = localState.settings.timerDuration;
  document.getElementById('set-strict-reserve').checked = localState.settings.strictReserve;
  
  document.getElementById('set-audio-enabled').checked = localState.settings.soundEnabled;
  document.getElementById('set-voice-enabled').checked = localState.settings.voiceEnabled;
}

// ----------------------------------------------------
// 통신 및 제어 함수군 (API 호출)
// ----------------------------------------------------

// 1. 감독 입찰 전송
async function submitBid() {
  if (!myTeamId) return;
  initAudio(); // 첫 클릭 시 브라우저 오디오 맥 활성화
  
  try {
    const res = await fetch('/api/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: myTeamId })
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.message || '입찰에 실패했습니다.');
    }
  } catch (err) {
    console.error(err);
    alert('입찰 중 서버 에러가 발생했습니다.');
  }
}

// 2. 관리자 동작 통제 API 호출
async function adminControl(action, payload = {}) {
  initAudio();
  try {
    const res = await fetch('/api/admin/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, ...payload })
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.message || '요청 실패');
    }
  } catch (err) {
    console.error(err);
  }
}

// 특정 선수 즉시 경매 시작
function adminDirectStart(playerId) {
  adminControl('start', { playerId: playerId });
  // 경매 보드 탭으로 복귀시켜 상태를 바로 중계
  switchTab('auction');
}

// 유찰된 선수 재경매 대기 복귀
function reNominateUnsold(playerId) {
  adminControl('nominate_unsold', { playerId: playerId });
}

// 콤보박스에 선택된 선수 경매 시작
function adminNominateSelected() {
  const select = document.getElementById('nominate-select');
  const playerId = select.value;
  if (playerId && !playerId.startsWith('--')) {
    adminDirectStart(playerId);
  } else {
    alert('올릴 유효한 선수를 선택하세요.');
  }
}

// 3. 관리자 선수 편집 추가 폼 전송
async function handlePlayerSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit-player-id').value;
  const name = document.getElementById('player-name').value;
  const role = document.getElementById('player-role').value;
  const tier = document.getElementById('player-tier').value;
  const bio = document.getElementById('player-bio').value;
  
  const action = id ? 'edit' : 'add';
  const playerPayload = { name, role, tier, bio };
  if (id) playerPayload.id = id;
  
  try {
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, player: playerPayload })
    });
    const data = await res.json();
    if (data.success) {
      clearPlayerForm();
      // 리스트 갱신
      renderPlayersTab();
    } else {
      alert(data.message || '선수 정보 저장 실패');
    }
  } catch (err) {
    console.error(err);
  }
}

function editPlayer(playerId) {
  const player = localState.players.find(p => p.id === playerId);
  if (player) {
    document.getElementById('edit-player-id').value = player.id;
    document.getElementById('player-name').value = player.name;
    document.getElementById('player-role').value = player.role;
    document.getElementById('player-tier').value = player.tier;
    document.getElementById('player-bio').value = player.bio || "";
    document.getElementById('player-form-title').textContent = "선수 정보 수정";
  }
}

async function deletePlayer(playerId) {
  if (!confirm('정말로 이 선수를 삭제하시겠습니까?')) return;
  try {
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', playerId: playerId })
    });
    const data = await res.json();
    if (!data.success) alert(data.message);
  } catch (err) {
    console.error(err);
  }
}

function clearPlayerForm() {
  document.getElementById('edit-player-id').value = '';
  document.getElementById('player-form').reset();
  document.getElementById('player-form-title').textContent = "선수 추가 / 등록";
}

// 프리셋 리로드 전송
async function adminLoadPresets() {
  if (!confirm('현재 선수 리스트를 지우고 기본 프리셋(30명)으로 복구하시겠습니까?')) return;
  
  // presets.js 파일에 선언된 window.PRESETS.players 를 서버로 리로드 전송함
  if (!window.PRESETS || !window.PRESETS.players) {
    alert('기본 프리셋 데이터를 찾을 수 없습니다.');
    return;
  }
  
  try {
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load_presets', players: window.PRESETS.players })
    });
    const data = await res.json();
    if (!data.success) alert(data.message);
  } catch (err) {
    console.error(err);
  }
}

// 선수 리스트 랜덤 셔플 전송
async function adminShufflePlayers() {
  if (!confirm('현재 경매 대기 중인 모든 선수들의 순서를 임의로 섞으시겠습니까?')) return;
  try {
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shuffle' })
    });
    const data = await res.json();
    if (data.success) {
      alert('선수 순서가 무작위로 셔플되었습니다.');
    } else {
      alert(data.message || '셔플 실패');
    }
  } catch (err) {
    console.error(err);
  }
}

// 4. 팀 정보 개별 업데이트 전송
async function saveTeamInfo(teamId) {
  const name = document.getElementById(`t-name-${teamId}`).value;
  const captain = document.getElementById(`t-cap-${teamId}`).value;
  const points = parseInt(document.getElementById(`t-pts-${teamId}`).value, 10);
  
  try {
    const res = await fetch('/api/admin/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit',
        team: { id: teamId, name, captain, points }
      })
    });
    const data = await res.json();
    if (data.success) {
      alert(`${captain} 감독의 팀 설정이 업데이트되었습니다.`);
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
  }
}

// AI 토글 API 전송
async function toggleTeamAi(teamId) {
  const isAi = document.getElementById(`t-ai-enable-${teamId}`).checked;
  const aiStyle = document.getElementById(`t-ai-style-${teamId}`).value;
  
  try {
    await fetch('/api/admin/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_ai',
        teamId: teamId,
        isAi: isAi,
        aiStyle: aiStyle
      })
    });
  } catch (err) {
    console.error(err);
  }
}

// 5. 경매 룰 설정 전송
async function adminSaveSettings() {
  const initPoints = parseInt(document.getElementById('set-init-points').value, 10);
  const minBid = parseInt(document.getElementById('set-min-bid').value, 10);
  const bidIncrement = parseInt(document.getElementById('set-bid-increment').value, 10);
  const timerDuration = parseInt(document.getElementById('set-timer-duration').value, 10);
  const strictReserve = document.getElementById('set-strict-reserve').checked;
  
  const soundEnabled = document.getElementById('set-audio-enabled').checked;
  const voiceEnabled = document.getElementById('set-voice-enabled').checked;
  
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initPoints, minBid, bidIncrement, timerDuration, strictReserve,
        soundEnabled, voiceEnabled
      })
    });
    const data = await res.json();
    if (data.success) {
      alert('경매 규칙 및 환경설정이 저장되었습니다.');
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
  }
}

// 전체 초기화 전송
async function adminResetAll() {
  if (!confirm('🚨 경고: 정말로 모든 로스터와 진행사항을 완전히 리셋하시겠습니까?\n이 작업은 복구할 수 없으며 이전 스냅샷으로 되돌리기(Undo)만 가능합니다.')) return;
  
  try {
    const res = await fetch('/api/admin/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'undo' }) // First save undo then reset
    });
  } catch(e){}
  
  try {
    const res = await fetch('/api/admin/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    });
    const data = await res.json();
    if (data.success) {
      alert('성공적으로 경매판이 전체 리셋되었습니다.');
      switchTab('auction');
    }
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// 선수 무작위 룰렛 추첨 기능 (추가됨)
// ----------------------------------------------------

function adminStartRandomDraw() {
  adminControl('draw_random');
  switchTab('auction');
}

function startRouletteAnimation(targetPlayer, allPlayers) {
  if (isRouletteRunning) return;
  isRouletteRunning = true;
  
  const apName = document.getElementById('ap-name');
  const apAvatarText = document.getElementById('ap-avatar-text');
  const apRole = document.getElementById('ap-role');
  const apTier = document.getElementById('ap-tier');
  const apBio = document.getElementById('ap-bio');
  
  apTier.style.display = 'none';
  apBio.textContent = "다음 경매 대상 선수를 무작위로 추첨하는 중입니다...";
  
  // 대기 상태의 선수 필터링
  let idlePlayers = allPlayers.filter(p => p.status === 'idle' || p.id === targetPlayer.id);
  if (idlePlayers.length < 5) {
    // 풀이 작을 경우 전체 선수 풀 사용
    idlePlayers = allPlayers;
  }
  
  let spinCount = 0;
  let speed = 40; // 시작 속도 (매우 빠름, ms 단위)
  
  function spin() {
    if (!isRouletteRunning) return;
    
    spinCount++;
    const randomPlayer = idlePlayers[Math.floor(Math.random() * idlePlayers.length)];
    
    apName.textContent = randomPlayer.name;
    apAvatarText.textContent = randomPlayer.name.charAt(0);
    apRole.textContent = randomPlayer.role.toUpperCase();
    
    // 회전 효과음 출력
    playSound('tick');
    
    // 점진적 감속 제어
    // 3.8초(3800ms) 전후로 멈춰서 최종 타겟을 동기화하여 표시함
    if (spinCount > 25) {
      speed += 25; // 극감속 구간
    } else {
      speed += 3;  // 미세감속 구간
    }
    
    if (speed > 420 || spinCount > 35) {
      stopRouletteAnimation(targetPlayer);
    } else {
      rouletteInterval = setTimeout(spin, speed);
    }
  }
  
  if (rouletteInterval) clearTimeout(rouletteInterval);
  spin();
}

function stopRouletteAnimation(targetPlayer) {
  isRouletteRunning = false;
  if (rouletteInterval) clearTimeout(rouletteInterval);
  
  const apName = document.getElementById('ap-name');
  const apAvatarText = document.getElementById('ap-avatar-text');
  const apRole = document.getElementById('ap-role');
  const apTier = document.getElementById('ap-tier');
  const apBio = document.getElementById('ap-bio');
  
  if (targetPlayer) {
    apName.textContent = targetPlayer.name;
    apAvatarText.textContent = targetPlayer.name.charAt(0);
    apRole.textContent = targetPlayer.role.toUpperCase();
    apTier.textContent = `${targetPlayer.tier} Class`;
    apTier.className = `player-tier ${targetPlayer.tier}`;
    apTier.style.display = 'inline-block';
    apBio.textContent = targetPlayer.bio || "선수 소개가 등록되어 있지 않습니다.";
    
    // 추첨 완료 팡파레 효과음
    playSound('sold');
  }
}

