FROM node:current-alpine

ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /ncnc-scripts

COPY . .

RUN yarn
RUN yarn build

ENTRYPOINT [ "yarn", "program" ]