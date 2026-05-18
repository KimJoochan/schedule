# 1. 경량화된 Node.js 18 리눅스 이미지를 기반으로 시작
FROM node:18-alpine

# 2. 컨테이너 내부의 작업 디렉토리 설정
WORKDIR /usr/src/app

# 3. 의존성 파일들을 먼저 복사하고 패키지 설치 (캐싱 효율화)
COPY package*.json ./
RUN npm install

# 4. 나머지 프로젝트 소스코드를 전부 컨테이너 내부로 복사
COPY . .

# 5. 외부로 노출할 포트 지정
EXPOSE 3000

# 6. 컨테이너가 켜질 때 실행할 명령어 (package.json의 scripts 기준)
CMD ["npm", "run", "dev"]