/**
 * 자동 생성된 픽스처입니다. 손으로 고치지 마세요.
 * 생성기: `npm run gen:records` (scripts/gen-records-fixture.mjs)
 *
 * 이름과 학번은 전부 가공값입니다. 구 프로젝트 시드에는 실명과 실제 학번이
 * 들어 있어 공개 저장소에 옮길 수 없습니다. 구성(인원·역할 분포·기수 체계)만
 * 참고했습니다. 학번의 5번째 자리 9 는 합성값 표식입니다.
 *
 * 타율·출루율·장타율·OPS·ERA·WHIP 는 안타·타수·이닝에서 실제로 계산한 값이라
 * 화면에서 숫자가 서로 어긋나지 않습니다.
 */

import type { RosterEntry } from '@/types/roster'

/*
 * 2026 명단에 **동명이인이 한 쌍 있다**(임승우 · 46번과 53번). 실수가 아니다.
 *
 * 기록 화면은 외부 리그 API 가 이름만 주기 때문에 로스터를 이름으로 뒤져
 * 등번호를 붙인다(§9.2). 구 구현은 이름이 겹치면 먼저 찾은 사람의 번호를 그냥
 * 찍어서 화면에 남의 등번호가 나왔다(§12-17). 지금은 겹치면 붙이지 않는데,
 * **명단에 동명이인이 없으면 그 경로가 한 번도 실행되지 않는다.**
 */
export const ROSTER_BY_YEAR: Record<number, RosterEntry[]> = {
  "2025": [
    {
      "id": 2025000,
      "year": 2025,
      "number": "0",
      "name": "정유찬",
      "studentId": "2022900041",
      "generation": 21,
      "userId": null,
      "role": "roster_headcoach"
    },
    {
      "id": 2025001,
      "year": 2025,
      "number": "1",
      "name": "조은우",
      "studentId": "2022900042",
      "generation": 39,
      "userId": null,
      "role": "roster_president"
    },
    {
      "id": 2025002,
      "year": 2025,
      "number": "20",
      "name": "김민준",
      "studentId": "2024900002",
      "generation": 43,
      "userId": 3,
      "role": "roster_player"
    },
    {
      "id": 2025003,
      "year": 2025,
      "number": "46",
      "name": "한승우",
      "studentId": "2021900044",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025004,
      "year": 2025,
      "number": "85",
      "name": "권유찬",
      "studentId": "2023900045",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025005,
      "year": 2025,
      "number": "63",
      "name": "조준혁",
      "studentId": "2021900046",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025006,
      "year": 2025,
      "number": "94",
      "name": "류시윤",
      "studentId": "2023900047",
      "generation": 40,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025007,
      "year": 2025,
      "number": "4",
      "name": "류재원",
      "studentId": "2022900048",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025008,
      "year": 2025,
      "number": "45",
      "name": "임예준",
      "studentId": "2025900049",
      "generation": 41,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025009,
      "year": 2025,
      "number": "35",
      "name": "안지환",
      "studentId": "2021900050",
      "generation": 41,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025010,
      "year": 2025,
      "number": "69",
      "name": "오수현",
      "studentId": "2025900051",
      "generation": 40,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025011,
      "year": 2025,
      "number": "5",
      "name": "신연우",
      "studentId": "2023900052",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025012,
      "year": 2025,
      "number": "74",
      "name": "이재원",
      "studentId": "2022900053",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025013,
      "year": 2025,
      "number": "39",
      "name": "안우진",
      "studentId": "2022900054",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025014,
      "year": 2025,
      "number": "21",
      "name": "임이준",
      "studentId": "2025900055",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025015,
      "year": 2025,
      "number": "83",
      "name": "서태윤",
      "studentId": "2021900056",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025016,
      "year": 2025,
      "number": "81",
      "name": "안승우",
      "studentId": "2024900057",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025017,
      "year": 2025,
      "number": "23",
      "name": "권시우",
      "studentId": "2022900058",
      "generation": 40,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025018,
      "year": 2025,
      "number": "96",
      "name": "장승현",
      "studentId": "2025900059",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025019,
      "year": 2025,
      "number": "79",
      "name": "류성민",
      "studentId": "2022900060",
      "generation": 41,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025020,
      "year": 2025,
      "number": "3",
      "name": "조주원",
      "studentId": "2023900061",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025021,
      "year": 2025,
      "number": "91",
      "name": "안수현",
      "studentId": "2025900062",
      "generation": 44,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025022,
      "year": 2025,
      "number": "87",
      "name": "강도윤",
      "studentId": "2024900063",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025023,
      "year": 2025,
      "number": "19",
      "name": "전승우",
      "studentId": "2025900064",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025024,
      "year": 2025,
      "number": "95",
      "name": "윤연우",
      "studentId": "2021900065",
      "generation": 41,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025025,
      "year": 2025,
      "number": "37",
      "name": "장주원",
      "studentId": "2025900066",
      "generation": 40,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025026,
      "year": 2025,
      "number": "8",
      "name": "안태윤",
      "studentId": "2023900067",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025027,
      "year": 2025,
      "number": "27",
      "name": "박연우",
      "studentId": "2022900068",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2025028,
      "year": 2025,
      "number": "M",
      "name": "조한결",
      "studentId": "2021900069",
      "generation": 42,
      "userId": null,
      "role": "roster_manager"
    },
    {
      "id": 2025029,
      "year": 2025,
      "number": "M",
      "name": "정승우",
      "studentId": "2025900070",
      "generation": 42,
      "userId": null,
      "role": "roster_manager"
    },
    {
      "id": 2025030,
      "year": 2025,
      "number": "42",
      "name": "한도현",
      "studentId": "2025900071",
      "generation": 33,
      "userId": null,
      "role": "roster_retired"
    },
    {
      "id": 2025031,
      "year": 2025,
      "number": "13",
      "name": "박윤호",
      "studentId": "2025900072",
      "generation": 31,
      "userId": null,
      "role": "roster_retired"
    }
  ],
  "2026": [
    {
      "id": 2026000,
      "year": 2026,
      "number": "0",
      "name": "최우진",
      "studentId": "2008900005",
      "generation": 22,
      "userId": 6,
      "role": "roster_headcoach"
    },
    {
      "id": 2026001,
      "year": 2026,
      "number": "1",
      "name": "박도윤",
      "studentId": "2022900004",
      "generation": 42,
      "userId": 5,
      "role": "roster_president"
    },
    {
      "id": 2026002,
      "year": 2026,
      "number": "16",
      "name": "김민준",
      "studentId": "2024900002",
      "generation": 41,
      "userId": 3,
      "role": "roster_player"
    },
    {
      "id": 2026003,
      "year": 2026,
      "number": "46",
      "name": "임승우",
      "studentId": "2022900006",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026004,
      "year": 2026,
      "number": "30",
      "name": "전태윤",
      "studentId": "2022900005",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026005,
      "year": 2026,
      "number": "43",
      "name": "윤시우",
      "studentId": "2024900006",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026006,
      "year": 2026,
      "number": "35",
      "name": "황이준",
      "studentId": "2022900007",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026007,
      "year": 2026,
      "number": "13",
      "name": "권준혁",
      "studentId": "2022900008",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026008,
      "year": 2026,
      "number": "76",
      "name": "강선우",
      "studentId": "2025900009",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026009,
      "year": 2026,
      "number": "6",
      "name": "신서준",
      "studentId": "2024900010",
      "generation": 44,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026010,
      "year": 2026,
      "number": "10",
      "name": "김준혁",
      "studentId": "2023900011",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026011,
      "year": 2026,
      "number": "68",
      "name": "류예준",
      "studentId": "2023900012",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026012,
      "year": 2026,
      "number": "7",
      "name": "최주원",
      "studentId": "2025900013",
      "generation": 40,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026013,
      "year": 2026,
      "number": "44",
      "name": "윤예준",
      "studentId": "2026900014",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026014,
      "year": 2026,
      "number": "39",
      "name": "류우진",
      "studentId": "2022900015",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026015,
      "year": 2026,
      "number": "50",
      "name": "한선우",
      "studentId": "2025900016",
      "generation": 41,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026016,
      "year": 2026,
      "number": "3",
      "name": "윤승현",
      "studentId": "2024900017",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026017,
      "year": 2026,
      "number": "47",
      "name": "윤시윤",
      "studentId": "2026900018",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026018,
      "year": 2026,
      "number": "51",
      "name": "최태민",
      "studentId": "2022900019",
      "generation": 41,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026019,
      "year": 2026,
      "number": "99",
      "name": "권민재",
      "studentId": "2023900020",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026020,
      "year": 2026,
      "number": "17",
      "name": "황동현",
      "studentId": "2026900021",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026021,
      "year": 2026,
      "number": "57",
      "name": "박준혁",
      "studentId": "2024900022",
      "generation": 40,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026022,
      "year": 2026,
      "number": "88",
      "name": "강시우",
      "studentId": "2022900023",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026023,
      "year": 2026,
      "number": "26",
      "name": "강건우",
      "studentId": "2022900024",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026024,
      "year": 2026,
      "number": "53",
      "name": "임승우",
      "studentId": "2024900025",
      "generation": 40,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026025,
      "year": 2026,
      "number": "64",
      "name": "신재희",
      "studentId": "2022900026",
      "generation": 43,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026026,
      "year": 2026,
      "number": "14",
      "name": "류가온",
      "studentId": "2022900027",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026027,
      "year": 2026,
      "number": "86",
      "name": "권태윤",
      "studentId": "2023900028",
      "generation": 38,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026028,
      "year": 2026,
      "number": "12",
      "name": "장재희",
      "studentId": "2026900029",
      "generation": 41,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026029,
      "year": 2026,
      "number": "79",
      "name": "최승현",
      "studentId": "2023900030",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026030,
      "year": 2026,
      "number": "81",
      "name": "전하준",
      "studentId": "2025900031",
      "generation": 39,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026031,
      "year": 2026,
      "number": "32",
      "name": "서민준",
      "studentId": "2023900032",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026032,
      "year": 2026,
      "number": "63",
      "name": "윤지환",
      "studentId": "2023900033",
      "generation": 42,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026033,
      "year": 2026,
      "number": "60",
      "name": "장서준",
      "studentId": "2022900034",
      "generation": 41,
      "userId": null,
      "role": "roster_player"
    },
    {
      "id": 2026034,
      "year": 2026,
      "number": "M",
      "name": "이서준",
      "studentId": "2023900003",
      "generation": 43,
      "userId": 4,
      "role": "roster_manager"
    },
    {
      "id": 2026035,
      "year": 2026,
      "number": "M",
      "name": "조가온",
      "studentId": "2024900036",
      "generation": 44,
      "userId": null,
      "role": "roster_manager"
    },
    {
      "id": 2026036,
      "year": 2026,
      "number": "M",
      "name": "한태민",
      "studentId": "2026900037",
      "generation": 41,
      "userId": null,
      "role": "roster_manager"
    },
    {
      "id": 2026037,
      "year": 2026,
      "number": "20",
      "name": "김동현",
      "studentId": "2025900038",
      "generation": 32,
      "userId": null,
      "role": "roster_retired"
    },
    {
      "id": 2026038,
      "year": 2026,
      "number": "49",
      "name": "황성민",
      "studentId": "2023900039",
      "generation": 31,
      "userId": null,
      "role": "roster_retired"
    },
    {
      "id": 2026039,
      "year": 2026,
      "number": "93",
      "name": "최지환",
      "studentId": "2025900040",
      "generation": 34,
      "userId": null,
      "role": "roster_retired"
    }
  ]
}

export const ROSTER_YEARS = [2026, 2025]
export const ACTIVE_ROSTER_YEAR = 2026
