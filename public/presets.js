window.PRESETS = {
  teams: [
    { id: "team1", name: "동수칸의 기사단", captain: "한동숙", points: 1000, roster: { top: null, jungle: null, mid: null, adc: null, support: null } },
    { id: "team2", name: "따효니의 백수단", captain: "따효니", points: 1000, roster: { top: null, jungle: null, mid: null, adc: null, support: null } },
    { id: "team3", name: "얍얍의 돌격대", captain: "얍얍", points: 1000, roster: { top: null, jungle: null, mid: null, adc: null, support: null } },
    { id: "team4", name: "삼식의 상점가", captain: "삼식", points: 1000, roster: { top: null, jungle: null, mid: null, adc: null, support: null } },
    { id: "team5", name: "룩삼의 레지스탕스", captain: "룩삼", points: 1000, roster: { top: null, jungle: null, mid: null, adc: null, support: null } },
    { id: "team6", name: "푸린의 헬창들", captain: "푸린", points: 1000, roster: { top: null, jungle: null, mid: null, adc: null, support: null } }
  ],
  players: [
    // 탑 (Top)
    { id: "p1", name: "얍얍", role: "top", tier: "A", bio: "원조 자낳대 탑 패왕, 강력한 라인전과 이니시", status: "idle" },
    { id: "p2", name: "룩삼", role: "top", tier: "A", bio: "안정적인 딜탱 밸런스, 뇌대리 최적화 플레이어", status: "idle" },
    { id: "p3", name: "중력", role: "top", tier: "B", bio: "기복 없는 국밥 챔피언 선호, 한타 집중력 우수", status: "idle" },
    { id: "p4", name: "푸린", role: "top", tier: "S", bio: "극강의 무력과 캐리력, 피지컬 종결자 탑라이너", status: "idle" },
    { id: "p5", name: "소우릎", role: "top", tier: "S", bio: "프로 출신, 정교한 라인 관리 및 넓은 시야", status: "idle" },
    { id: "p6", name: "치킨쿤", role: "top", tier: "B", bio: "팀을 위한 단단한 방패, 든든한 국밥 전문 탑", status: "idle" },

    // 정글 (Jungle)
    { id: "p7", name: "삼식", role: "jungle", tier: "S", bio: "동선 설계와 오브젝트 컨트롤이 뛰어난 정글사령관", status: "idle" },
    { id: "p8", name: "남봉", role: "jungle", tier: "S", bio: "미친 갱킹 타이밍과 피지컬, 캐리형 정글러", status: "idle" },
    { id: "p9", name: "도현", role: "jungle", tier: "A", bio: "뛰어난 교전 능력과 이니시 메이킹 최적화", status: "idle" },
    { id: "p10", name: "쌍베", role: "jungle", tier: "B", bio: "팀의 웃음 책임자이자 든든한 고기방패 정글", status: "idle" },
    { id: "p11", name: "재현", role: "jungle", tier: "A", bio: "속도감 있는 동선과 카운터 정글링의 대가", status: "idle" },
    { id: "p12", name: "물쥐", role: "jungle", tier: "B", bio: "성장 기대치가 높은 캐리형 AP 정글 선호", status: "idle" },

    // 미드 (Mid)
    { id: "p13", name: "한동숙", role: "mid", tier: "B", bio: "자낳대 역사상 최고의 미드 탱커, 팀의 정신적 지주", status: "idle" },
    { id: "p14", name: "눈꽃", role: "mid", tier: "S", bio: "미드 라인전 압살 능력과 넓은 챔프폭 보유", status: "idle" },
    { id: "p15", name: "네클릿", role: "mid", tier: "A", bio: "베테랑의 관록, 노련한 게임 조율과 로밍 메이킹", status: "idle" },
    { id: "p16", name: "탬탬버린", role: "mid", tier: "C", bio: "귀여운 플레이 스타일 뒤에 숨겨진 안정적 파밍력", status: "idle" },
    { id: "p17", name: "도요새", role: "mid", tier: "B", bio: "성장형 메이지 챔피언 선호, 후반 한타 캐리 가능", status: "idle" },
    { id: "p18", name: "소풍왔니", role: "mid", tier: "C", bio: "미드 유틸 챔피언 스페셜리스트, 탄탄한 어시스트", status: "idle" },

    // 원딜 (ADC)
    { id: "p19", name: "따효니", role: "adc", tier: "A", bio: "하이리스크 하이리턴의 상징, 미친 딜링 한계 돌파", status: "idle" },
    { id: "p20", name: "괴물쥐", role: "adc", tier: "S", bio: "압도적인 카이팅과 피지컬, 캐리형 원딜러의 표본", status: "idle" },
    { id: "p21", name: "러너", role: "adc", tier: "B", bio: "오더가 가능한 오지랖 원딜러, 팀 파이팅 조율", status: "idle" },
    { id: "p22", name: "류제홍", role: "adc", tier: "A", bio: " FPS 국가대표 출신의 동체시력과 뛰어난 무빙", status: "idle" },
    { id: "p23", name: "예지", role: "adc", tier: "B", bio: "라인전이 단단하고 한타 포지셔닝이 훌륭한 원딜", status: "idle" },
    { id: "p24", name: "박잔디", role: "adc", tier: "C", bio: "사리는 생존형 플레이, 서포터 보호 최적화", status: "idle" },

    // 서포터 (Support)
    { id: "p25", name: "박옥자누나", role: "support", tier: "B", bio: "안정적인 아군 케어와 오더 보좌 능력이 탁월", status: "idle" },
    { id: "p26", name: "소람잉", role: "support", tier: "A", bio: "그랩류 메이킹 챔피언 장인, 폭발적인 한타 각 설계", status: "idle" },
    { id: "p27", name: "여까", role: "support", tier: "B", bio: "안정적인 탱커형 유틸서폿, 아군 딜러 시팅 전문", status: "idle" },
    { id: "p28", name: "김여뉴", role: "support", tier: "A", bio: "다양한 서폿 이해도, 시야 장악과 라인전 리드 우수", status: "idle" },
    { id: "p29", name: "러너와이프", role: "support", tier: "C", bio: "힐과 실드로 원딜을 100% 보살피는 헌신적인 서폿", status: "idle" },
    { id: "p30", name: "종우", role: "support", tier: "B", bio: "플레이메이킹 서폿 선호, 과감한 이니시에이팅", status: "idle" }
  ]
};
