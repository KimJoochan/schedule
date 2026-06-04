const express = require('express');
const pool = require('./db'); // ⭐ 위에서 만든 DB 풀 임포트
const axios = require('axios');
const session = require('express-session');
const crypto = require('crypto');
const QRCode = require('qrcode'); // npm install qrcode 필요

const app = express();
const PORT = 3000;

const activeNonces = new Map();

app.use(session({
    secret: 'your_permanent_secret_key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // 💡 사용자가 활동할 때마다 세션 쿠키 만료 시간을 새로 갱신!
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 12 // 12시간 설정
    }
}));

app.use(express.json()); // ⭐ JSON 타입의 body 파싱을 활성화하고, req.body에 단일 객체를 살피드림

// 1. 템플릿 엔진을 ejs로 설정합니다.
app.set('view engine', 'ejs');
// 2. views 폴더 위치를 지정합니다. (기본값이 views라 생략 가능하지만 명시해두면 좋습니다)
app.set('views', './views');

app.get('/', (req, res) => {
  res.redirect('/qr_scan');
});

app.get('/qr_scan', (req, res) => {
  // 서버에서 템플릿으로 보낼 데이터 객체
  if (!req.session.accessToken) {
    return res.redirect('/login'); 
  }
  const data = {
    title: "Docker & Node.js 서버",
    message: "Docker로 실행된 Node.js 서버입니다!"
  };
  
  // views/index.ejs 파일을 렌더링하며 data를 넘겨줍니다. (.ejs 확장자는 생략 가능)
  res.render('qr_scan', data);
});

app.get('/qr_display', (req, res) => {
  // if (!req.session.accessToken) {
  //   return res.redirect('/login'); 
  // }
  const data = {
    title: "Docker & Node.js 서버",
    message: "Docker로 실행된 Node.js 서버입니다!"
  };
  
  // views/index.ejs 파일을 렌더링하며 data를 넘겨줍니다. (.ejs 확장자는 생략 가능)
  res.render('qr_display', data);
})
app.get('/my_status_yet', async(req, res) => {
  const { idx } = req.query;  // 세션에 토큰이 없다면 로그인 안 한 사용자이므로 로그인 페이지로 튕겨버림
  if (!idx) {
    return res.status(400).send("<script>alert('올바르지 않은 접근입니다. 교육 식별자(idx)가 누락되었습니다.'); history.back();</script>");
  }
  let education_info_sql = "select * from educations where idx = ?";
  let education_info_params = [idx];
  let education_res = await pool.query(education_info_sql, education_info_params);
  let education_info = education_res[0];
  let page_data = {
    education_info: education_info
  };

  return res.render('my_status_yet', page_data);
})
app.get('/my_status', async(req, res) => {
  // 서버에서 템플릿으로 보낼 데이터 객체
  if (!req.session.accessToken) {
    return res.redirect('/login'); 
  }
    
  const { idx } = req.query;  // 세션에 토큰이 없다면 로그인 안 한 사용자이므로 로그인 페이지로 튕겨버림
  if (!idx) {
    return res.status(400).send("<script>alert('올바르지 않은 접근입니다. 교육 식별자(idx)가 누락되었습니다.'); history.back();</script>");
  }

  let accessToken = req.session.accessToken;
  if (!accessToken) {
    return res.status(401).json({ error: "인증 토큰이 없습니다. 로그인이 필요합니다." });
  }
  // 🔥 원래 프론트에서 하려던 fetch 요청을 백엔드(Node.js)에서 대신 수행합니다.
  const response = await axios.get('https://api.ziongroup.net/api/auth/v3_0/me?properties=NAME,NEW_NO,ORGANIZATION,ORGANIZATION_PATH,ORGANIZATION_WITH_DUTY ', {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${ accessToken }`
    }
  });
  let data = response.data.data;
  const usre_id =data.id;

  let sql = "select * from educations_sheet where education_idx = ? and user_social_id = ?";
  let params = [idx, usre_id];
  
  let result = await pool.query(sql, params);
  let education_sheet = null;
  if (result.length > 0) {
    education_sheet = result[0];
  }else{
    return res.redirect('/my_status_yet?idx='+idx); 
  }

  let education_info_sql = "select * from educations where idx = ?";
  let education_info_params = [idx];
  let education_res = await pool.query(education_info_sql, education_info_params);
  let education_info = education_res[0];

  let page_data = {
    education_sheet: education_sheet[0],
    education_info: education_info[0]
  };

  console.log(page_data);
  
  // views/index.ejs 파일을 렌더링하며 data를 넘겨줍니다. (.ejs 확장자는 생략 가능)
  res.render('my_status', page_data);
})

app.get('/login_back', async (req, res) => {
  // 서버에서 템플릿으로 보낼 데이터 객체
  const authorizationCode = req.query.code;
  const state = req.query.state;
  
  if (!authorizationCode) {
    return res.status(400).send("인가 코드가 없습니다.");
  }
  try {
    // 🔥 카카오 토큰 발급 요청 API 주소
    const tokenUrl = "https://auth.ziongroup.net/oauth/token";
    const dynamicRedirectUri = `${req.protocol}://${req.get('host')}/login_back`;
    
    // 명세서에 맞는 파라미터 구성 (보통 POST 요청 시 x-www-form-urlencoded 형태로 보냅니다)
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "162bff30e9424707bc47926f18bea77a",              // 내 REST API 키
      redirect_uri: dynamicRedirectUri, // 앞서 사용한 것과 '완벽히 일치'해야 함
      code: authorizationCode                       // 방금 받은 교환권!
    });

    // 카카오 서버에 진짜 토큰 요청하기
    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        "Content-type": "application/x-www-form-urlencoded;charset=utf-8"
      }
    });

    // 🌟 드디어 발급된 진짜 열쇠들! (access_token, refresh_token 등)
    const { access_token, refresh_token } = response.data;
    // 이 토큰을 사용해서 사용자의 닉네임, 프로필 사진 등을 카카오에 요청할 수 있게 됩니다.
    req.session.accessToken = access_token; 
    // 2. 명시적으로 세션 저장소(Memory 또는 DB)에 기록을 완료하라고 명령
    req.session.save((err) => {
        if (err) {
            console.error("세션 저장 중 오류 발생:", err);
            return res.status(500).send("로그인 처리 중 에러가 발생했습니다.");
        }
        
        // 3. 디스크/메모리에 쓰기가 완벽히 끝난 시점에만 리다이렉트 실행
        // 이제 새로고침(F5)을 하거나 이동을 해도 세션이 완벽히 보존됩니다.
        res.redirect('/qr_scan');
    });

  } catch (error) {
    console.error("토큰 발급 중 에러 발생:", error.response ? error.response.data : error.message);
    res.status(500).send("토큰을 받아오지 못했습니다.");
  }
});

app.get('/login', (req, res) => {
  // 세션에 토큰이 없다면 로그인 안 한 사용자이므로 로그인 페이지로 튕겨버림
  if (req.session.accessToken) {
    return res.redirect('/qr_scan'); 
  }
  res.render('login');
});

app.get('/dashboard', (req, res) => {
  // 세션에 토큰이 없다면 로그인 안 한 사용자이므로 로그인 페이지로 튕겨버림
  if (!req.session.accessToken) {
    return res.redirect('/'); 
  }
  res.render('dashboard', { token: req.session.accessToken });
});

app.get('/admin_qr_view', async (req, res) => {
  
  const { idx } = req.query;  // 세션에 토큰이 없다면 로그인 안 한 사용자이므로 로그인 페이지로 튕겨버림
  if (!idx) {
    return res.status(400).send("<script>alert('올바르지 않은 접근입니다. 교육 식별자(idx)가 누락되었습니다.'); history.back();</script>");
  }

  // 2. 고유 식별자(idx)에 맞는 교육 마스터 정보 단건 조회 SQL
  const selectSql = `
    SELECT idx, title 
    FROM educations 
    WHERE idx = ? AND is_deleted = 'n'
  `;
  try {
    // 3. 쿼리문 실행 (단건 조회이므로 rows[0]을 낚아채기 위해 구조분해 배치를 씁니다)
    const [rows] = await pool.query(selectSql, [parseInt(idx, 10)]);

    // 만약 DB에 해당 idx를 가진 교육 데이터가 없다면 방어 처리
    if (rows.length === 0) {
      return res.status(444).send("<script>alert('존재하지 않거나 삭제된 교육 과정입니다.'); history.back();</script>");
    }

    // 데이터가 정상적으로 존재하면 첫 번째 로우 데이터를 row 변수에 담음
    const eduRow = rows[0];

    // 4. 조금 전 작성한 듀얼 QR 화면(EJS)을 호출하며 조회된 데이터를 주입합니다.
    res.render('admin_qr_view', { 
      token: req.session.accessToken,
      row: eduRow // 📂 EJS 템플릿의 <%= row.title %> 과 <%= row.id %> 로 매핑됩니다.
    });

  } catch (error) {
    console.error("QR 화면 조회 중 DB 에러 발생:", error);
    return res.status(500).send("데이터베이스 연산 중 오류가 발생했습니다.");
  }
  
})

app.get('/admin', (req, res) => {
  // 세션에 토큰이 없다면 로그인 안 한 사용자이므로 로그인 페이지로 튕겨버림
  // if (!req.session.accessToken) {
  //   return res.redirect('/'); 
  // }
  res.render('admin', { token: req.session.accessToken });
});

app.get('/admin_edu_list', async(req, res) => {
  // 세션에 토큰이 없다면 로그인 안 한 사용자이므로 로그인 페이지로 튕겨버림
  // if (!req.session.accessToken) {
  //   return res.redirect('/'); 
  // }
  try {
    const selectSql = "SELECT *, DATE_FORMAT(edu_date, '%Y-%m-%d') AS edu_date, DATE_FORMAT(start_time, '%H:%i') AS start_time, DATE_FORMAT(end_time, '%H:%i') AS end_time, (select count(idx) from educations_sheet as b where a.idx = b.education_idx) as attence_cnt FROM educations as a WHERE is_deleted = 'n' ORDER BY regdate DESC;";
    // 2. DB에서 리스트 데이터 조회 (배열 구조분해할당으로 rows만 파싱)
    const [eduList] = await pool.query(selectSql);

    // 3. 뷰 파일(EJS)을 렌더링하면서 조회한 리스트 배열을 객체에 담아 함께 던집니다.
    res.render('admin_edu_list', { 
      list: eduList // 📂 이 이름으로 EJS에서 접근합니다.
    });

  } catch (error) {
    console.error("리스트 조회 중 DB 에러 발생:", error);
    return res.status(500).send("데이터베이스 조회 오류가 발생했습니다.");
  }
});

app.get('/admin_people_list', async(req, res) => {
  // 세션에 토큰이 없다면 로그인 안 한 사용자이므로 로그인 페이지로 튕겨버림
  // if (!req.session.accessToken) {
  //   return res.redirect('/'); 
  // }
  try{
    const {idx} = req.query;
    if(!idx){
      return res.status(400).send("<script>alert('올바르지 않은 접근입니다. 교육 식별자(idx)가 누락되었습니다.'); history.back();</script>");
    }
    const selectPeopleSql = "SELECT *, DATE_FORMAT(regdate, '%Y-%m-%d') AS regdate FROM educations_sheet WHERE education_idx = ? ORDER BY regdate DESC;";
    // 2. DB에서 리스트 데이터 조회 (배열 구조분해할당으로 rows만 파싱)
    const [peopleList] = await pool.query(selectPeopleSql, [idx]);

    const selectSql = `
      SELECT idx, title 
      FROM educations 
      WHERE idx = ? AND is_deleted = 'n'
    `;
    // 3. 쿼리문 실행 (단건 조회이므로 rows[0]을 낚아채기 위해 구조분해 배치를 씁니다)
    const [rows] = await pool.query(selectSql, [parseInt(idx, 10)]);

    // 3. 뷰 파일(EJS)을 렌더링하면서 조회한 리스트 배열을 객체에 담아 함께 던집니다.
    res.render('admin_people_list', { 
      list: peopleList, // 📂 이 이름으로 EJS에서 접근합니다.
      info : rows[0]
    });
  }catch(error){
    console.error("리스트 조회 중 DB 에러 발생:", error);
    return res.status(500).send("데이터베이스 조회 오류가 발생했습니다.");
  }
});

app.get('/api/qrcode', async (req, res) => {
    try {
        // 기존 TS의 theme_id를 우리 DB 구조에 맞게 idx(교육 번호)로 명칭을 맞추거나 그대로 씁니다.
        const { idx } = req.query;

        if (!idx) {
            return res.status(400).json({ message: "유효한 교육 식별자(idx)가 필요합니다." });
        }

        const nonce = crypto.randomBytes(16).toString('hex');
        const ttlSeconds = 180; // 3분 (180초)

        // 발급된 nonce와 만료 시간을 서버 저장소에 기록
        const expireTime = Date.now() + (ttlSeconds * 1000);
        activeNonces.set(nonce, expireTime);
        
        const baseTunnelUrl = "https://splendid-earwig-31.loca.lt";
        // QR에 담을 데이터 (URL 파라미터 형태)
        const qrPayload = new URLSearchParams({
            idx: idx,
            nonce: nonce
        }).toString(); 

        const qrTargetUrl = `${baseTunnelUrl}/attendance/scan?${qrPayload}`;

        const qrCodeImage = await QRCode.toDataURL(qrTargetUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300
        });

        res.status(200).json({
            success: true,
            data: {
                qrImage: qrCodeImage,
                nonce: nonce,
                ttl: ttlSeconds
            }
        });

    } catch (error) {
        console.error("QR 코드 생성 오류:", error);
        res.status(500).json({ message: "서버 내부 오류로 QR 생성에 실패했습니다." });
    }
});

// ==========================================
// 2. QR 코드 스캔 검증 및 DB 출결 처리 엔드포인트
// ==========================================
app.post('/api/verify', async (req, res) => {
    try {
        // 스캐너에서 읽은 데이터 수신 (user_idx는 스캔한 사람의 고유번호라고 가정)
        const { idx, nonce, user_idx } = req.body;

        if (!idx || !nonce) {
            return res.status(400).json({ message: "잘못된 QR 데이터입니다." });
        }

        // 1차: 저장소에 해당 nonce가 존재하는지 확인
        if (!activeNonces.has(nonce)) {
            return res.status(400).json({ message: "만료되었거나 유효하지 않은 QR 코드입니다." });
        }

        // 2차: 만료 시간 체크
        const expireTime = activeNonces.get(nonce);
        const currentTime = Date.now();

        if (currentTime > expireTime) {
            activeNonces.delete(nonce); // 찌꺼기 삭제
            return res.status(400).json({ message: "만료된 QR 코드입니다. 화면을 갱신해 다시 스캔해주세요." });
        }

        // 💡 검증 성공! (1회용 폐기)
        activeNonces.delete(nonce);
        let accessToken = req.session.accessToken;
        if (!accessToken) {
          return res.status(401).json({ error: "인증 토큰이 없습니다. 로그인이 필요합니다." });
        }
        // 🔥 원래 프론트에서 하려던 fetch 요청을 백엔드(Node.js)에서 대신 수행합니다.
        const response = await axios.get('https://api.ziongroup.net/api/auth/v3_0/me?properties=NAME,NEW_NO,ORGANIZATION,ORGANIZATION_PATH,ORGANIZATION_WITH_DUTY ', {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${ accessToken }`
          }
        });
        console.dir(response.data, { depth: null, colors: true });
        let data = response.data.data;
        const usre_id =data.id;
        const user_name =data.properties.name;
        const user_number =data.properties.newNo;
        let sosuck_list = [];
        for(let item of data.properties.organizationPaths){
          sosuck_list.push(item.name);
        }
        let sosuck_str = sosuck_list.join(" > ");

        let grade_str = "";
        for(let el of data.properties.organizationWithDuties){
          if(el.organization.type == "CELL"){
            if(el.duty.positionName){
              grade_str = el.duty.positionName;
              break;
            }
          }
        }

        const checkSql = `
            SELECT COUNT(*) AS cnt 
            FROM educations_sheet 
            WHERE education_idx = ? AND user_social_id = ?
        `;
        const [rows] = await pool.query(checkSql, [idx, usre_id]);

        // 이미 데이터가 존재한다면 (count가 0보다 크다면) 즉시 거절(400 Bad Request)
        if (rows[0].cnt > 0) {
          return res.status(200).json({
            success: false,
            message: "이미 출석 인증이 완료된 사용자입니다."
          });
        }
        
        // ---------------------------------------------------------
        // 🔥 [추가된 비즈니스 로직] DB에 실제 출결 기록 INSERT
        // ---------------------------------------------------------
        // 실제 출결 테이블(attendance)에 교육번호(idx)와 회원번호(user_idx)를 기록합니다.
        const insertSql = `
            INSERT INTO educations_sheet (education_idx, user_social_id, user_social_church, user_social_major, user_social_minor, user_social_grade, user_social_name, user_social_number, user_social_goyuck, user_sosuck)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(insertSql, [idx, usre_id, sosuck_list[2], sosuck_list[3], sosuck_list[4], grade_str, user_name, user_number, sosuck_list[5], sosuck_str]);

        // 실제 출결 테이블(attendance)에 교육번호(idx)와 회원번호(user_idx)를 기록합니다.

        res.status(200).json({ 
            success: true, 
            message: "정상적으로 출석 인증되었습니다.",
            idx: idx
        });

    } catch (error) {
        // 중복 출석(DB Unique Key 에러) 방어 등
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(200).json({ message: "이미 출석 처리된 사용자입니다." });
        }
        console.error("QR 검증 및 DB 연동 오류:", error);
        res.status(500).json({ message: "검증 중 오류가 발생했습니다." });
    }
});

app.post('/api/create_education', async (req, res)=>{
  // 프론트엔드 fetch에서 보낸 JSON 데이터 해체 분할 (PHP의 $_POST 역할)
  const { title, location, start_time, end_time, stat_base_type, stat_range_min, total_people } = req.body;
  // 1. 날짜 데이터 추출 (start_time인 '2026-06-03 09:00:00'에서 앞 10자리 '2026-06-03'만 복사)
  const edu_date = start_time.substring(0, 10);

  try {
    // ---------------------------------------------------------
    // 2. [중복 방지 검증] 같은 날, 같은 제목의 교육이 있는지 확인
    // ---------------------------------------------------------
    const checkSql = `
      SELECT idx FROM educations where edu_date = ? AND title = ? and is_deleted = 'n'
    `;
    // mysql2/promise는 결과가 항상 [rows, fields] 배열 구조로 반환되므로 구조분해할당을 씁니다.
    const [existingEdu] = await pool.query(checkSql, [edu_date, title]);

    if (existingEdu.length > 0) {
      // 중복된 데이터가 발견되면 400 에러와 함께 종료 (PHP의 exit; 과 동일 효과)
      return res.status(400).json({ 
        success: false, 
        message: "❌ 이미 해당 날짜에 동일한 이름의 교육이 등록되어 있습니다." 
      });
    }

    const insertSql = `
      INSERT INTO educations (edu_date, title, location, start_time, end_time, stat_base_type, stat_range_min, total_people)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertSql, [
      edu_date,
      title,
      location, 
      start_time, 
      end_time, 
      stat_base_type, 
      parseInt(stat_range_min, 10), // 숫자로 안전하게 형변환
      parseInt(total_people, 10), // 숫자로 안전하게 형변환
    ]);

    const newIdx = result.insertId;

    console.log(`✨ 새 교육 등록 성공! [IDX: ${newIdx}]`);

    return res.json({
        success: true,
        message: "교육이 성공적으로 등록되었습니다."
      });
    
  } catch (error) {
    // 예기치 못한 DB 트래블 발생 시 catch 블록에서 에러 안전 제어
    console.error('🚨 DB 인서트 에러 발생:', error);
    return res.status(500).json({ 
      success: false, 
      message: "서버 내부 데이터베이스 오류가 발생했습니다." 
    });
  }

  // 프론트엔드로 응답 반환
  res.json({ success: true, message: "텍스트 데이터 확인 완료!" });
});


app.get('/api/user-profile', async (req, res) => {
  const token = req.session.accessToken; 

  if (!token) {
    return res.status(401).json({ error: "인증 토큰이 없습니다. 로그인이 필요합니다." });
  }
  try {
    // 🔥 원래 프론트에서 하려던 fetch 요청을 백엔드(Node.js)에서 대신 수행합니다.
    const response = await axios.get('https://api.ziongroup.net/api/auth/v3_0/me?properties=NAME,NEW_NO,ORGANIZATION,ORGANIZATION_PATH,ORGANIZATION_WITH_DUTY ', {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${ token }`
      }
    });

    // 외부 API 서버에서 받아온 유저 데이터를 그대로 내 프론트엔드로 전달합니다.
    res.json(response.data);

  } catch (err) {
    console.error("Zion API 호출 중 에러 발생:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: "유저 정보를 가져오는 데 실패했습니다." });
  }
});



app.listen(PORT, () => {
    console.log("\n==================================================");
    console.log(`🚀 [클라이언트] 사용자 페이지 구동 완료!`);
    console.log(`🔗 접속 주소: http://localhost:${PORT}`);
    console.log("==================================================\n");
});