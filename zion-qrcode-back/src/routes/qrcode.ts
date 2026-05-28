import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';

const router = Router();
// 💡 1. 발급된 Nonce를 임시 저장할 메모리 저장소
// Map 구조를 사용하여 <nonce, 만료시간(timestamp)> 형태로 저장합니다.
// (실제 운영 환경에서는 서버가 재시작되어도 유지되도록 Redis 사용을 권장합니다.)
const activeNonces = new Map<string, number>();
// 관리자 권한 검증 미들웨어
const verifyAdmin = (req: Request, res: Response, next: Function) => {
    // 실제 환경에서는 헤더의 JWT나 세션을 통해 관리자 여부를 검증합니다.
    const isAdmin = true; 
    if (!isAdmin) {
        return res.status(403).json({ message: "관리자 권한이 없습니다." });
    }
    next();
};

// GET /api/admin/qr 에 해당하는 엔드포인트
router.get('/qrcode', async (req: Request, res: Response) => {
    try {
        const { theme_id } = req.query;

        if (!theme_id || typeof theme_id !== 'string') {
            return res.status(400).json({ message: "유효한 theme_id가 필요합니다." });
        }

        const nonce = crypto.randomBytes(16).toString('hex');
        const ttlSeconds = 180; // 3분

        // 💡 2. 발급된 nonce와 만료 시간을 서버 저장소에 기록
        const expireTime = Date.now() + (ttlSeconds * 1000);
        activeNonces.set(nonce, expireTime);

        const qrPayload = new URLSearchParams({
            theme_id: theme_id,
            nonce: nonce
        }).toString(); 

        const qrCodeImage = await QRCode.toDataURL(qrPayload, {
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
// 💡 3. QR 코드를 스캔한 후 호출하는 검증 엔드포인트
router.post('/verify', async (req: Request, res: Response) => {
    try {
        // 스캐너(앱 등)에서 읽은 데이터를 body로 보낸다고 가정
        const { theme_id, nonce } = req.body; 

        if (!theme_id || !nonce) {
            return res.status(400).json({ message: "잘못된 QR 데이터입니다." });
        }

        // 저장소에 해당 nonce가 존재하는지 1차 확인
        if (!activeNonces.has(nonce)) {
            return res.status(400).json({ message: "만료되었거나 유효하지 않은 QR 코드입니다." });
        }

        // 2차 만료 시간 체크
        const expireTime = activeNonces.get(nonce)!;
        const currentTime = Date.now();

        if (currentTime > expireTime) {
            activeNonces.delete(nonce); // 만료되었으니 저장소에서 찌꺼기 삭제
            return res.status(400).json({ message: "만료된 QR 코드입니다. 화면을 갱신해 다시 스캔해주세요." });
        }

        // 💡 검증 성공! 
        // 화면 캡처 악용 방지를 위해 한 번 사용된 nonce는 즉시 폐기(1회용)
        activeNonces.delete(nonce);

        // 이곳에 이후 필요한 비즈니스 로직(예: 출근 처리, 작업 완료 처리 등)을 추가합니다.
        
        res.status(200).json({ 
            success: true, 
            message: "정상적으로 인증되었습니다.",
            theme_id: theme_id
        });

    } catch (error) {
        console.error("QR 검증 오류:", error);
        res.status(500).json({ message: "검증 중 오류가 발생했습니다." });
    }
});

// 💡 (옵션) 주기적으로 메모리 누수를 막기 위해 만료된 nonce 청소 (1분마다 실행)
setInterval(() => {
    const now = Date.now();
    for (const [nonce, expireTime] of activeNonces.entries()) {
        if (now > expireTime) {
            activeNonces.delete(nonce);
        }
    }
}, 60 * 1000);
export default router;