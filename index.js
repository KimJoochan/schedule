const express = require('express');
const axios = require('axios');
const session = require('express-session');

const app = express();
const PORT = 3000;

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

app.get('/my_status', (req, res) => {
  // 서버에서 템플릿으로 보낼 데이터 객체
  if (!req.session.accessToken) {
    return res.redirect('/login'); 
  }
  const data = {
    title: "Docker & Node.js 서버",
    message: "Docker로 실행된 Node.js 서버입니다!"
  };
  
  // views/index.ejs 파일을 렌더링하며 data를 넘겨줍니다. (.ejs 확장자는 생략 가능)
  res.render('my_status', data);
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
  console.log(`🚀 서버가 포트 ${PORT}에서 정상 작동 중입니다.`);
});