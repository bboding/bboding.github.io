FROM node:12

ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /ncnc-ping

ENV API_URL=https://api2.ncnc.app

COPY . .

RUN npm install
RUN npm run build

ENTRYPOINT [ "npm", "run", "program" ]